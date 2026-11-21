/// <reference types="@cloudflare/workers-types" />

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import PostalMime from "postal-mime";
import * as schema from "../src/db/schema";

const RETENTION_MS = 10 * 24 * 60 * 60 * 1000;
const MAX_MESSAGE_BYTES = 25 * 1024 * 1024;
const PROVIDER_ID = "cloudflare-email-routing";

export interface Env {
  R2_BUCKET: R2Bucket;
  INBOUND_QUEUE: Queue;
  DATABASE_URL: string;
  PLATFORM_DOMAIN: string;
}

interface InboundJob {
  type: "inbound_email";
  eventId: string;
  recipient: string;
  storageKey: string;
  sizeBytes: number;
  receivedAt: string;
  expiresAt: string;
  fromAddress: string | null;
  fromName: string | null;
  subject: string | null;
  preview: string | null;
  hasAttachments: boolean;
}

function makeDb(env: Env) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_NOT_CONFIGURED");
  return drizzle(neon(env.DATABASE_URL), { schema });
}

function safeKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

function contentSize(content: unknown): number {
  if (content instanceof ArrayBuffer) return content.byteLength;
  if (ArrayBuffer.isView(content)) return content.byteLength;
  if (typeof content === "string") return content.length;
  return 0;
}

function parseAddress(parsed: Awaited<ReturnType<typeof PostalMime.parse>>["from"]) {
  if (!parsed) return { address: null as string | null, name: null as string | null };
  const name = parsed.name || null;
  if ("address" in parsed && parsed.address) {
    return { address: parsed.address.toLowerCase().trim(), name };
  }
  return { address: null, name };
}

async function recordMinimalEvent(
  env: Env,
  eventId: string,
  recipient: string,
  state: string,
  errorCategory: string
) {
  try {
    await makeDb(env).execute(sql`
      INSERT INTO inbound_events
        (provider_id, event_id, alias_address, processing_state, error_category, first_seen_at)
      VALUES (${PROVIDER_ID}, ${eventId}, ${recipient}, ${state}, ${errorCategory}, NOW())
      ON CONFLICT (provider_id, event_id) DO NOTHING
    `);
  } catch (err) {
    console.error("[email] failed to record minimal event", err);
  }
}

const worker = {
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    const recipient = (message.to || "").toLowerCase().trim();
    const domain = (env.PLATFORM_DOMAIN || "nexora.mail").toLowerCase().trim();

    if (message.rawSize > MAX_MESSAGE_BYTES) {
      await recordMinimalEvent(env, crypto.randomUUID(), recipient, "rejected", "oversize");
      message.setReject("Message exceeds the maximum supported size");
      return;
    }
    if (!recipient.endsWith("@" + domain)) {
      await recordMinimalEvent(env, crypto.randomUUID(), recipient, "rejected", "unknown_domain");
      message.setReject("Unknown recipient domain");
      return;
    }

    const raw = await new Response(message.raw).arrayBuffer();

    let parsed;
    try {
      parsed = await PostalMime.parse(raw);
    } catch (err) {
      console.error("[email] MIME parse failure", err);
      await recordMinimalEvent(env, crypto.randomUUID(), recipient, "rejected", "malformed");
      message.setReject("Message could not be parsed");
      return;
    }

    const from = parseAddress(parsed.from);
    const subject = parsed.subject || message.headers.get("Subject") || null;
    const text = parsed.text || null;
    const html = parsed.html || null;
    const preview = (text || "").replace(/\s+/g, " ").trim().slice(0, 300) || subject;

    const eventId = safeKey(parsed.messageId || message.headers.get("Message-ID") || crypto.randomUUID());
    const receivedAt = new Date();
    const expiresAt = new Date(receivedAt.getTime() + RETENTION_MS);
    const storageKey = `messages/${receivedAt.toISOString().slice(0, 10)}/${eventId}`;

    const attachments = (parsed.attachments || []).map((attachment) => ({
      filename: attachment.filename || null,
      mimeType: attachment.mimeType,
      size: contentSize(attachment.content),
    }));

    const payload = {
      providerMessageId: eventId,
      recipient,
      fromAddress: from.address,
      fromName: from.name,
      subject,
      text,
      html,
      preview,
      receivedAt: receivedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      sizeBytes: message.rawSize,
      hasAttachments: attachments.length > 0,
      attachments,
    };

    await env.R2_BUCKET.put(storageKey, JSON.stringify(payload), {
      httpMetadata: { contentType: "application/json" },
      customMetadata: { recipient, eventId },
    });

    const job: InboundJob = {
      type: "inbound_email",
      eventId,
      recipient,
      storageKey,
      sizeBytes: message.rawSize,
      receivedAt: receivedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      fromAddress: from.address,
      fromName: from.name,
      subject,
      preview,
      hasAttachments: attachments.length > 0,
    };

    await env.INBOUND_QUEUE.send(job);
  },

  async queue(batch: MessageBatch<InboundJob>, env: Env): Promise<void> {
    for (const item of batch.messages) {
      const job = item.body;
      try {
        if (!job || job.type !== "inbound_email" || !job.recipient || !job.eventId) {
          item.ack();
          continue;
        }

        const db = makeDb(env);

        const existing = await db.execute(sql`
          SELECT processing_state FROM inbound_events
          WHERE provider_id = ${PROVIDER_ID} AND event_id = ${job.eventId}
          LIMIT 1
        `);
        const existingRows = (
          existing as unknown as { rows: Array<{ processing_state: string }> }
        ).rows;
        if (
          existingRows[0]?.processing_state === "processed" ||
          existingRows[0]?.processing_state === "rejected"
        ) {
          item.ack();
          continue;
        }

        await db.execute(sql`
          INSERT INTO inbound_events
            (provider_id, event_id, alias_address, processing_state, first_seen_at)
          VALUES (${PROVIDER_ID}, ${job.eventId}, ${job.recipient}, 'processing', NOW())
          ON CONFLICT (provider_id, event_id) DO UPDATE SET
            processing_state = 'processing',
            last_attempt_at = NOW(),
            retry_count = inbound_events.retry_count + 1
        `);

        const resolved = await db.execute(sql`
          SELECT a.id AS alias_id, a.mailbox_id, a.user_id, a.full_address,
                 u.status AS user_status, m.status AS mailbox_status
          FROM aliases a
          JOIN users u ON u.id = a.user_id
          JOIN mailboxes m ON m.id = a.mailbox_id
          WHERE lower(a.full_address) = lower(${job.recipient})
          LIMIT 1
        `);
        const resolvedRows = (
          resolved as unknown as {
            rows: Array<{
              alias_id: string;
              mailbox_id: string;
              user_id: string;
              full_address: string;
              user_status: string;
              mailbox_status: string;
            }>;
          }
        ).rows;
        const target = resolvedRows[0];

        if (!target || target.user_status !== "active" || target.mailbox_status !== "active") {
          try {
            await env.R2_BUCKET.delete(job.storageKey);
          } catch (cleanupError) {
            console.error("[queue] rejected-message cleanup failed", cleanupError);
          }
          await db.execute(sql`
            UPDATE inbound_events
            SET processing_state = 'rejected', error_category = 'unknown_or_inactive_recipient',
                last_attempt_at = NOW()
            WHERE provider_id = ${PROVIDER_ID} AND event_id = ${job.eventId}
          `);
          item.ack();
          continue;
        }

        const inserted = await db.execute(sql`
          INSERT INTO messages
            (mailbox_id, alias_id, provider_message_id, from_address, from_name, subject,
             received_at, expires_at, preview, storage_key, size_bytes, has_attachments,
             processing_state, created_at)
          VALUES
            (${target.mailbox_id}, ${target.alias_id}, ${job.eventId}, ${job.fromAddress},
             ${job.fromName}, ${job.subject}, ${job.receivedAt}, ${job.expiresAt},
             ${job.preview}, ${job.storageKey}, ${job.sizeBytes}, ${job.hasAttachments},
             'stored', NOW())
          ON CONFLICT (provider_message_id) DO NOTHING
          RETURNING id
        `);
        const insertedRows = (inserted as unknown as { rows: Array<{ id: string }> }).rows;
        const createdNew = insertedRows.length > 0;

        let messageId = insertedRows[0]?.id;
        if (!messageId) {
          const found = await db.execute(sql`
            SELECT id FROM messages WHERE provider_message_id = ${job.eventId} LIMIT 1
          `);
          messageId = (
            found as unknown as { rows: Array<{ id: string }> }
          ).rows[0]?.id;
          if (!messageId) {
            item.ack();
            continue;
          }
        }

        await db.execute(sql`
          UPDATE inbound_events
          SET processing_state = 'processed', message_id = ${messageId},
              last_attempt_at = NOW(), error_category = NULL
          WHERE provider_id = ${PROVIDER_ID} AND event_id = ${job.eventId}
        `);

        if (createdNew) {
          const period = job.receivedAt.slice(0, 7);
          await db.execute(sql`
            UPDATE aliases
            SET last_received_at = ${job.receivedAt}, message_count = message_count + 1
            WHERE id = ${target.alias_id}
          `);
          await db.execute(sql`
            INSERT INTO usage_counters
              (user_id, period, messages_received, bytes_received, updated_at)
            VALUES (${target.user_id}, ${period}, 1, ${job.sizeBytes}, NOW())
            ON CONFLICT (user_id, period) DO UPDATE SET
              messages_received = usage_counters.messages_received + 1,
              bytes_received = usage_counters.bytes_received + ${job.sizeBytes},
              updated_at = NOW()
          `);
          await db.execute(sql`
            INSERT INTO audit_events (action, user_id, resource_type, resource_id, created_at)
            VALUES ('message.received', ${target.user_id}, 'message', ${messageId}, NOW())
          `);
        }

        item.ack();
      } catch (err) {
        console.error("[queue] processing failed", err);
        try {
          await makeDb(env).execute(sql`
            UPDATE inbound_events
            SET processing_state = 'failed', error_category = 'processing_error',
                last_attempt_at = NOW(), retry_count = retry_count + 1
            WHERE provider_id = ${PROVIDER_ID} AND event_id = ${job?.eventId ?? ""}
          `);
        } catch (inner) {
          console.error("[queue] failed to record error", inner);
        }
        item.retry();
      }
    }
  },

  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    const db = makeDb(env);

    const due = await db.execute(sql`
      SELECT id, storage_key, processing_state
      FROM messages
      WHERE (processing_state = 'stored' AND expires_at <= NOW())
         OR (processing_state = 'deleted' AND storage_key IS NOT NULL)
      ORDER BY expires_at ASC
      LIMIT 100
    `);
    const rows = (
      due as unknown as {
        rows: Array<{ id: string; storage_key: string | null; processing_state: string }>;
      }
    ).rows;

    for (const row of rows) {
      if (row.storage_key) {
        try {
          await env.R2_BUCKET.delete(row.storage_key);
        } catch (err) {
          console.error("[scheduled] object deletion failed", row.id, err);
          continue;
        }
      }

      await db.execute(sql`
        UPDATE messages
        SET processing_state = CASE WHEN processing_state = 'stored' THEN 'expired' ELSE 'deleted' END,
            storage_key = NULL, preview = NULL, subject = NULL, content_type = NULL
        WHERE id = ${row.id}
      `);
    }

    if (rows.length > 0) {
      try {
        await db.execute(sql`
          INSERT INTO audit_events (action, resource_type, metadata, created_at)
          VALUES ('message.expiry_sweep', 'message',
                  ${JSON.stringify({ processed: rows.length })}::jsonb, NOW())
        `);
      } catch (err) {
        console.error("[scheduled] audit write failed", err);
      }
    }
  },
};

export default worker;

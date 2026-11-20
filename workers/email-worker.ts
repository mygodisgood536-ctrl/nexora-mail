/**
 * Cloudflare Email Worker — Nexora Mail Inbound Handler
 * See README for setup. Placeholders for R2, Queue, and domain.
 */

export interface Env {
  R2_BUCKET: R2Bucket;
  INBOUND_QUEUE: Queue;
  PLATFORM_DOMAIN: string;
}

export default {
  async email(message: any, env: Env, ctx: ExecutionContext) {
    const recipient = (message.to || "").toLowerCase().trim();
    const domain = env.PLATFORM_DOMAIN || "nexora.mail";
    const MAX_SIZE = 25 * 1024 * 1024;

    if (message.rawSize > MAX_SIZE) {
      message.setReject("Message too large");
      return;
    }
    if (!recipient.endsWith("@" + domain)) {
      message.setReject("Unknown domain");
      return;
    }

    const eventId = message.headers.get("Message-ID") || crypto.randomUUID();
    const rawBuffer = await new Response(message.raw).arrayBuffer();
    const storageKey = "messages/" + new Date().toISOString().slice(0, 10) + "/" + crypto.randomUUID();

    await env.R2_BUCKET.put(storageKey, rawBuffer, {
      httpMetadata: { contentType: "message/rfc822" },
      customMetadata: { recipient, from: message.from, eventId },
    });

    await env.INBOUND_QUEUE.send({
      type: "inbound_email",
      eventId,
      recipient,
      from: message.from,
      storageKey,
      sizeBytes: message.rawSize,
      receivedAt: new Date().toISOString(),
      subject: message.headers.get("Subject") || null,
    });
  },

  async queue(batch: MessageBatch<any>, env: Env) {
    for (const msg of batch.messages) {
      try {
        console.log("[queue] process", msg.body?.eventId, msg.body?.recipient);
        // TODO: resolve alias, write to Neon, set expires_at = +10 days
        msg.ack();
      } catch (e) {
        console.error(e);
        msg.retry();
      }
    }
  },
};

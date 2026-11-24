import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  bigint,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    username: text("username"),
    fullName: text("full_name"),
    email: text("email").unique(),
    passwordHash: text("password_hash"),
    name: text("name"),
    status: text("status").notNull().default("active"), // active | suspended | deleted
    role: text("role").notNull().default("user"), // user | admin
    registrationStatus: text("registration_status").notNull().default("pending"), // pending | active
    totpSecretEncrypted: text("totp_secret_encrypted"),
    totpVerifiedAt: timestamp("totp_verified_at", { withTimezone: true }),
    totpEnabled: boolean("totp_enabled").notNull().default(false),
    failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  },
  (table) => [uniqueIndex("users_username_unique").on(table.username)]
);

// Mailboxes - one per user
export const mailboxes = pgTable(
  "mailboxes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("mailboxes_user_id_unique").on(table.userId)]
);

// Permanent address registry - NEVER reuse
export const permanentAddressRegistry = pgTable(
  "permanent_address_registry",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fullAddress: text("full_address").notNull(),
    localPart: text("local_part").notNull(),
    domain: text("domain").notNull(),
    firstCommittedAt: timestamp("first_committed_at", { withTimezone: true }).notNull().defaultNow(),
    ownerUserId: uuid("owner_user_id"), // nullable after account deletion
    terminalState: text("terminal_state").notNull().default("reserved"), // reserved | active | retired
    everReserved: boolean("ever_reserved").notNull().default(true),
  },
  (table) => [
    uniqueIndex("permanent_address_unique").on(table.fullAddress),
    index("permanent_address_local_domain_idx").on(table.localPart, table.domain),
  ]
);

// Aliases
export const aliases = pgTable(
  "aliases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mailboxId: uuid("mailbox_id")
      .notNull()
      .references(() => mailboxes.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    localPart: text("local_part").notNull(),
    domain: text("domain").notNull(),
    fullAddress: text("full_address").notNull(),
    status: text("status").notNull().default("active"), // active | paused | deleted
    permanent: boolean("permanent").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    lastReceivedAt: timestamp("last_received_at", { withTimezone: true }),
    messageCount: integer("message_count").notNull().default(0),
  },
  (table) => [
    uniqueIndex("aliases_full_address_unique").on(table.fullAddress),
    index("aliases_user_id_idx").on(table.userId),
    index("aliases_mailbox_id_idx").on(table.mailboxId),
    index("aliases_status_idx").on(table.status),
  ]
);

// Messages metadata (content in R2)
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mailboxId: uuid("mailbox_id")
      .notNull()
      .references(() => mailboxes.id, { onDelete: "cascade" }),
    aliasId: uuid("alias_id")
      .notNull()
      .references(() => aliases.id, { onDelete: "restrict" }),
    providerMessageId: text("provider_message_id"),
    fromAddress: text("from_address"),
    fromName: text("from_name"),
    subject: text("subject"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    isRead: boolean("is_read").notNull().default(false),
    preview: text("preview"), // safe text preview
    storageKey: text("storage_key"), // R2 object key
    sizeBytes: bigint("size_bytes", { mode: "number" }).default(0),
    contentType: text("content_type"),
    hasAttachments: boolean("has_attachments").notNull().default(false),
    processingState: text("processing_state").notNull().default("stored"), // stored | expired | deleted | failed
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("messages_mailbox_received_idx").on(table.mailboxId, table.receivedAt),
    index("messages_expires_at_idx").on(table.expiresAt),
    index("messages_state_expiry_idx").on(table.processingState, table.expiresAt),
    index("messages_alias_id_idx").on(table.aliasId),
    index("messages_is_read_idx").on(table.mailboxId, table.isRead),
    uniqueIndex("messages_provider_message_unique").on(table.providerMessageId),
  ]
);

// Idempotency for inbound events
export const inboundEvents = pgTable(
  "inbound_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: text("provider_id").notNull(),
    eventId: text("event_id").notNull(),
    aliasAddress: text("alias_address"),
    processingState: text("processing_state").notNull().default("pending"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    retryCount: integer("retry_count").notNull().default(0),
    errorCategory: text("error_category"),
    messageId: uuid("message_id").references(() => messages.id),
  },
  (table) => [
    uniqueIndex("inbound_events_provider_event_unique").on(table.providerId, table.eventId),
  ]
);

// Usage counters
export const usageCounters = pgTable(
  "usage_counters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    period: text("period").notNull(), // YYYY-MM
    aliasesCreated: integer("aliases_created").notNull().default(0),
    aliasesActive: integer("aliases_active").notNull().default(0),
    messagesReceived: integer("messages_received").notNull().default(0),
    bytesReceived: bigint("bytes_received", { mode: "number" }).notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("usage_user_period_unique").on(table.userId, table.period)]
);

// Audit events
export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id"),
    actorId: uuid("actor_id"),
    action: text("action").notNull(),
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_user_id_idx").on(table.userId),
    index("audit_created_at_idx").on(table.createdAt),
  ]
);

// Single-use, expiring account verification tokens
export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("email_verification_user_idx").on(table.userId)]
);

// Durable, database-backed rate limiting for serverless environments
export const rateLimits = pgTable(
  "rate_limits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull().unique(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
    count: integer("count").notNull().default(0),
  },
  (table) => [index("rate_limits_window_idx").on(table.windowStart)]
);

// Short-lived, single-use challenges for 2FA, recovery and enrollment
export const authChallenges = pgTable(
  "auth_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: text("purpose").notNull(), // enroll | login | reset | change_password | recovery
    tokenHash: text("token_hash").notNull().unique(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("auth_challenges_user_idx").on(table.userId)]
);

// Single-use recovery codes for loss of authenticator device
export const recoveryCodes = pgTable(
  "recovery_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull().unique(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("recovery_codes_user_idx").on(table.userId)]
);

// Sessions (JWT identity + stored record for revocation)
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_token_hash_idx").on(table.tokenHash),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ]
);

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  mailbox: one(mailboxes, { fields: [users.id], references: [mailboxes.userId] }),
  aliases: many(aliases),
  sessions: many(sessions),
}));

export const mailboxesRelations = relations(mailboxes, ({ one, many }) => ({
  user: one(users, { fields: [mailboxes.userId], references: [users.id] }),
  aliases: many(aliases),
  messages: many(messages),
}));

export const aliasesRelations = relations(aliases, ({ one, many }) => ({
  mailbox: one(mailboxes, { fields: [aliases.mailboxId], references: [mailboxes.id] }),
  user: one(users, { fields: [aliases.userId], references: [users.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  mailbox: one(mailboxes, { fields: [messages.mailboxId], references: [mailboxes.id] }),
  alias: one(aliases, { fields: [messages.aliasId], references: [aliases.id] }),
}));

export type User = typeof users.$inferSelect;
export type Mailbox = typeof mailboxes.$inferSelect;
export type Alias = typeof aliases.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type PermanentAddress = typeof permanentAddressRegistry.$inferSelect;

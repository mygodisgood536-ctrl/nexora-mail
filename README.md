# Nexora Mail — Permanent Email Alias Platform

**Version 2.0 — Internal Mailbox Architecture**

Create permanent email aliases on platform-owned domains. Every user gets **one private internal mailbox**. All active aliases deliver into that single mailbox. No external forwarding. Messages auto-delete after **10 days**. Alias identities are **never recycled**.

## Binding product rules

- One internal mailbox per user
- Multiple permanent aliases per user → same mailbox
- No forwarding to Gmail / Outlook / Yahoo
- 10-day message retention (content deleted, alias preserved)
- Permanent address registry (never reuse, even after account deletion)
- Inbound-only (OTP, verification, alerts, notifications)
- Target max inbound message size: 25 MiB (must be validated with real traffic)

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router) + Tailwind 4 + Framer Motion |
| Database | Neon PostgreSQL + Drizzle ORM |
| Inbound email | Cloudflare Email Routing → Email Worker → Queues |
| Object storage | Cloudflare R2 (private) |
| Auth | Password-only: bcrypt hash + JWT with revocable DB sessions, httpOnly cookie. No email or phone OTP. |
| Notifications | Optional (Resend) — no verification code is required to use the product |

## What is implemented

**App / API (deployed on Vercel)**
- Registration, login, logout with bcrypt password hashing, real session revocation, and DB-backed rate limits
- Password visibility toggle on both auth forms; no email or phone verification is required
- `/api/auth/me` account + usage summary
- One mailbox per user, created idempotently at signup
- Custom and random alias creation with debounced availability checks and suggestions
- Atomic alias + permanent-registry commit (single SQL statement), permanent non-reuse enforced by unique constraint
- Alias pause / reactivate / permanent retire with a strict state machine (retired is terminal)
- Mailbox list with search/filter, unread state, manual delete
- Message detail API: private R2 read, safe HTML sanitization, sandboxed rendering, remote images blocked
- Immediate physical deletion on manual delete, with retry via the Worker cleanup sweep
- Admin overview API (`/api/admin/overview`, requires `role = admin`)
- Audit events, usage counters, and inbound idempotency records

**Cloudflare Worker (`workers/email-worker.ts`)**
- Real inbound email handler: size/domain checks, MIME parsing, private R2 storage
- Small queue references (never a 25 MiB payload in the queue)
- Queue consumer: alias/mailbox/account resolution, duplicate-event suppression, mailbox message creation, counter updates, unknown/inactive-recipient handling
- Scheduled handler (every minute): hard-deletes expired and soft-deleted content from R2 and marks DB state
- Provider-specific code isolated behind the Worker boundary

## Local development

```bash
npm install
cp .env.example .env.local   # fill in values
npm run db:generate          # only when schema changes
npm run db:migrate           # apply migrations to Neon
npm run dev
```

Checks: `npm run lint`, `npm run typecheck`, `npm run worker:typecheck`, `npm run build`.

## Deployment

### 1. Neon (database)
1. Create a Neon project and database.
2. Copy the **pooled** connection string into `DATABASE_URL` in Vercel and in your local `.env.local`.
3. Run `npm run db:migrate` once (locally or from a machine with `DATABASE_URL` set).

### 2. Required environment variables
- `DATABASE_URL` — Neon pooled connection string (required)
- `JWT_SECRET` — any strong random string, ideally 32+ characters (required)
- `PLATFORM_DOMAIN` / `NEXT_PUBLIC_PLATFORM_DOMAIN` — your email domain (required)
- `NEXT_PUBLIC_APP_URL` — your deployed URL (required for optional links)
- `RESEND_API_KEY` / `NOTIFICATION_FROM_EMAIL` — **optional**, only for security notices

> Sign-up, sign-in and mailbox use require **no** email or phone verification code.

### 3. Cloudflare R2 (private message content)
```bash
npx wrangler r2 bucket create nexora-messages
```
Create an R2 **S3 API token** with Object Read & Write on that bucket and set in Vercel:
`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`.

### 4. Cloudflare Queues + Worker
```bash
npx wrangler queues create nexora-inbound
npx wrangler queues create nexora-inbound-dlq
npx wrangler secret put DATABASE_URL     # same Neon connection string
npx wrangler deploy
```
Set `PLATFORM_DOMAIN` in `wrangler.toml` to your real domain.

### 5. Domain + Email Routing
1. Add your domain to Cloudflare, configure MX records for Email Routing.
2. Create a **catch-all** routing rule → the deployed Worker (no per-alias rules).
3. Set `PLATFORM_DOMAIN` and `NEXT_PUBLIC_PLATFORM_DOMAIN` in Vercel to the same domain.
4. Send a real test email to an alias and confirm it appears in the mailbox.

### 6. Vercel
Import the repo, add all environment variables from `.env.example`, deploy. Set an admin by updating one user's `role` to `admin` in Neon.

## Implementation status

- [x] Database schema, migrations, permanent registry, idempotency, audit, rate limits
- [x] Password-only auth, revocable sessions, tenant isolation in every query
- [x] Alias creation/availability/generation/pause/reactivate/retire
- [x] Mailbox list, detail, safe HTML rendering, manual delete
- [x] Worker: real email receive, MIME parse, R2 store, queue processing, expiry sweep
- [x] Lint, typecheck, worker typecheck, production build pass
- [ ] **Your setup required:** Neon (DATABASE_URL + migrations), JWT_SECRET, R2 API token, Cloudflare queues/worker, domain + Email Routing
- [ ] **Verify with real traffic:** 25 MiB end-to-end, provider limits, cost, queue backlog/outage drill
- [ ] Admin UI (API exists; UI intentionally not added to avoid changing the finished design)
- [ ] Final legal review of Terms / Privacy / Acceptable Use

## Security notes

- Tenant ownership is enforced in backend queries on every operation
- HTML email is sanitized and rendered in a sandbox with remote images blocked
- Message bodies are never logged; audit events contain metadata only
- Secrets are read from environment / Worker secrets only
- R2 objects are private; bucket URLs are never exposed

# Nexora Mail — Permanent Email Alias Platform

**Version 2.0 — Internal Mailbox Architecture**

Create permanent email aliases on platform-owned domains. Every user gets **one private internal mailbox**. All active aliases deliver into that single mailbox. No external forwarding. Messages auto-delete after **10 days**. Alias identities are **never recycled**.

## Core Product Rules (binding)

- One internal mailbox per user
- Multiple permanent aliases per user → same mailbox
- No forwarding to Gmail / Outlook / Yahoo
- 10-day message retention (content deleted)
- Permanent address registry (never reuse)
- Inbound-focused (OTP, verification, alerts)
- Target max message size: 25 MiB

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router) + Tailwind 4 + Framer Motion |
| Database | Neon PostgreSQL + Drizzle ORM |
| Inbound email | Cloudflare Email Routing → Worker |
| Object storage | Cloudflare R2 |
| Queues | Cloudflare Queues |
| Auth | JWT sessions (jose + bcrypt) |

## Quick start

```bash
# 1. Install
npm install

# 2. Copy env and fill values
cp .env.example .env.local

# 3. Push schema to Neon
npm run db:push

# 4. Run app
npm run dev
```

Open http://localhost:3000

## Cloudflare setup (another developer)

1. Add domain to Cloudflare, create Email Routing catch-all → Worker.
2. Create R2 bucket (private), Queue, bind them in `wrangler.toml`.
3. Deploy worker: `npx wrangler deploy`
4. Set `PLATFORM_DOMAIN` to match.

See `workers/email-worker.ts` for the inbound flow.

## Project structure

```
src/
  app/                  # Next.js App Router pages
    (auth)/login, register
    (dashboard)/mailbox, aliases, settings
    api/auth, aliases, messages
  components/
  db/schema.ts          # Full data model (users, mailboxes, aliases, permanent registry, messages…)
  lib/auth.ts, utils.ts
workers/email-worker.ts # Cloudflare Email + Queue consumer
```

## Implementation status

- [x] Product vision alignment (one mailbox, permanent aliases, 10-day expiry, no forwarding)
- [x] Database schema (Drizzle) with permanent address registry
- [x] Auth (register / login / session)
- [x] Alias create / pause / reactivate / delete (permanent)
- [x] Mailbox UI (list, read, delete)
- [x] Cinematic dark UI with Framer Motion
- [x] Cloudflare Email Worker skeleton
- [ ] Connect Neon + run migrations (needs DATABASE_URL)
- [ ] Wire R2 + full MIME parse + HTML sanitization
- [ ] Expiry cron / queue worker that hard-deletes after 10 days
- [ ] Abuse rate limits + admin dashboard
- [ ] Production domain + Email Routing live test

## Security notes

- Tenant isolation enforced in every API query
- Permanent registry survives account deletion
- HTML email must be sandboxed (iframe + CSP) before production
- Never log message bodies
- Secrets only in env / Cloudflare secrets

## License

Proprietary — all rights reserved.

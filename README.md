# Nexora Mail — Permanent Email Alias Platform

**Version 2.0 — Internal Mailbox Architecture**

Permanent email aliases on platform-owned domains. One private internal mailbox per user. No external forwarding. Messages auto-delete after 10 days. Alias identities are never recycled.

## Authentication

Password-only plus mandatory TOTP authenticator (no email or phone OTP):

1. **Register** — Full Name, Username, Password (only three fields).
2. **Authenticator setup** — QR code + manual key, then a 6-digit code confirms enrollment.
3. **Login page** — account is not signed in during registration.
4. **Sign in** — Username + Password, then a 6-digit authenticator code.

Password recovery and password changes also require the authenticator. Ten single-use recovery codes are issued at enrollment for loss of device. Usernames are unique, passwords are bcrypt-hashed, and TOTP secrets are AES-256-GCM encrypted at rest.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), Tailwind 4, Framer Motion |
| Database | Neon PostgreSQL + Drizzle ORM |
| Auth | bcrypt + jose JWT + revocable DB sessions + otpauth TOTP |
| Inbound email | Cloudflare Email Routing → Worker → Queues |
| Storage | Cloudflare R2 (private) |

## Local development

```bash
npm install
cp .env.example .env.local
# set DATABASE_URL (Neon pooled) and JWT_SECRET
npm run db:migrate
npm run dev
```

Checks: `npm run lint`, `npm run typecheck`, `npm run worker:typecheck`, `npm run build`.

## Deployment

- Add `DATABASE_URL` and `JWT_SECRET` to the Vercel project (all environments).
- Run `npm run db:migrate` once against the same Neon database.
- For email receipt: create R2 bucket/queues, set `wrangler.toml` values, `npx wrangler secret put DATABASE_URL`, `npx wrangler deploy`, then point Cloudflare Email Routing catch-all at the Worker.

## Status

- [x] Investigated signup failure: missing migrations + missing Vercel env vars; fixed and verified live
- [x] Username-only registration, TOTP enrollment, login 2FA, recovery, password change/reset
- [x] Bright premium UI with responsive auth flow and step transitions
- [x] 30/30 end-to-end checks passed locally against Neon
- [ ] Real-device QR scan and Vercel deployment verification (final round)

# Spark

Smartphone-first matching app built with Next.js App Router, Hono, Better Auth, Drizzle, PostgreSQL, and R2.

## What It Does

- Email/password signup and login.
- Smartphone-native matching UI with Tinder-like swipe gestures, match state, and chat.
- Infinite Tokuzou generation from gender-specific image pools managed in the admin upload page.
- Dedicated admin upload page protected by `ADMIN_PASS`.
- Tokuzou image uploads stored in R2 and tracked in PostgreSQL.
- User profiles keep a generated placeholder image instead of end-user uploads.

## Main API Routes

- `GET /api/profiles/me`
- `PUT /api/profiles/me`
- `GET /api/matching/discovery`
- `POST /api/matching/actions`
- `GET /api/matching/matches`
- `POST /api/matching/reset`
- `GET /api/chats/:matchId/messages`
- `POST /api/chats/:matchId/messages`
- `GET /api/admin/session`
- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/assets`
- `POST /api/admin/assets`
- `DELETE /api/admin/assets/:assetId`

## Setup

```bash
cp .env.example .env
pnpm i
pnpm db:up
pnpm db:migrate
pnpm dev
```

## Commands

```bash
pnpm dev
pnpm build
pnpm test
pnpm lint
pnpm db:generate
pnpm db:migrate
```

## Required Environment Variables

- `BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`
- `DATABASE_URL`
- `R2_S3_URL`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_PUBLIC_URL`
- `ADMIN_PASS`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

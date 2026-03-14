# Next Tokuzou Kit

Secure API playground built with Next.js App Router, Hono, Better Auth, Drizzle, PostgreSQL, and R2.

## Features

- Email/password signup and login with Better Auth.
- Protected API endpoints (`/api/auth/me`, `/api/auth/secure-message`).
- Secure message workflow that stores text files in R2 and metadata in PostgreSQL.
- Web Push subscription management and test delivery (`/api/notifications/*`).

## Tech Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS v4
- API: Hono
- Auth: Better Auth
- Database: Drizzle ORM + PostgreSQL
- Storage and Push: Cloudflare R2 (aws4fetch), web-push
- Tooling: pnpm, Vitest, Biome, ESLint, Prettier, Lefthook

## Requirements

- Node.js `22.14.0` (see `.node-version`)
- pnpm `10.x`
- Docker (for local PostgreSQL)

## Setup

```bash
cp .env.example .env
pnpm i
pnpm dev
```

`pnpm dev` starts the database, runs Drizzle generate/migrate, and launches Next.js.

## Common Commands

```bash
pnpm dev
pnpm db:down
pnpm build
pnpm start
pnpm test
pnpm lint
pnpm fmt
```

## Required Environment Variables

- `BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`
- `DATABASE_URL`
- `R2_S3_URL`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_PUBLIC_URL`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

See `.env.example` for local defaults.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (generates Swagger docs first)
npm run build     # Production build (generates Swagger + Prisma client)
npm run lint      # Run ESLint
npm run swagger   # Regenerate Swagger docs from JSDoc comments
npx prisma studio # Browse database visually
npx prisma migrate dev --name <name>  # Create and apply a migration
npx prisma generate  # Regenerate Prisma client after schema changes
```

## Architecture Overview

**Lomix** is a live streaming / social media platform (think Twitch + TikTok). It has two main surfaces:

1. **Admin dashboard** — web UI at `/dashboard/*`, protected by JWT + admin role check
2. **Mobile API** — REST endpoints at `/api/mobile/*`, consumed by the mobile app

### Directory Layout

- `src/app/api/mobile/` — Mobile API routes (auth, rooms, stories, leaderboard, agency, etc.)
- `src/app/api/` — Admin/internal API routes (users, groups, logs, auth, ban checks)
- `src/app/dashboard/` — Admin panel pages (users, groups, roles, logs, settings)
- `src/components/` — Shared React components + shadcn/ui wrappers
- `src/lib/` — Utilities: Prisma client (`prisma.ts`), response helper (`api-response.ts`), logging, email, ban check
- `prisma/` — Schema and migrations

### Authentication

JWT-based. Tokens are signed with `JWT_SECRET`.

- **Middleware** (`src/middleware.ts`) validates `Authorization: Bearer <token>` on protected routes, checks ban status via `/api/auth/check-ban`, and injects CORS headers globally.
- **Public routes:** `/api/mobile/auth/*` (login, register, verify, social auth, password reset)
- **Dashboard auth:** Client-side check in `src/app/dashboard/layout.tsx` reads `token`/`user` from `localStorage` and verifies admin role.
- Libraries: `jose` for Edge-compatible JWT verification, `jsonwebtoken` for signing, `bcrypt`/`bcryptjs` for passwords.

### Database

PostgreSQL via **Prisma** (v5). Connection via `DATABASE_URL` env var (Neon cloud in production).

Key models: `User`, `Room`, `Story`, `Agency`/`AgencyMember`, `UserFollow`, `UserFriend`, `Wallet`, `UserBan`, `FamilyMessage`, `Role`, `Group`, `Log`, `UserLog`.

> `src/models/` contains legacy Sequelize models — do not use them for new code; use Prisma.

### API Response Format

All API routes must use `ApiResponseHelper` from `src/lib/api-response.ts`:

```ts
return ApiResponseHelper.success(data, "Mesaj");   // { success: true, message, data }
return ApiResponseHelper.error("Hata mesajı", 400); // { success: false, message }
```

API messages are written in **Turkish**.

### Swagger / API Docs

Swagger is auto-generated from JSDoc comments in `src/app/api/mobile/**/*.ts`. After adding or changing mobile API routes, run `npm run swagger` to update `public/swagger.json`. The UI is served at `/api/docs`.

### Logging

Winston-based logging with three transports configurable via `LOG_CHANNELS=console,file,database`. The `database` transport writes to the `Log` Prisma model. On Vercel/serverless, file logs go to `/tmp`.

## Environment Variables

```
DATABASE_URL=           # PostgreSQL connection string
JWT_SECRET=             # JWT signing secret
GOOGLE_CLIENT_ID=       # Google OAuth

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

LOG_CHANNELS=console,file,database
```

## Key Conventions

- **App Router only** — all routes use Next.js 13+ file-based routing under `src/app/`
- **Tailwind CSS v4** + **shadcn/ui** for all UI work
- Ban enforcement tracks IP, user-agent, and device model — `UserBan` model stores device IDs
- CORS is open (all origins) — set in middleware

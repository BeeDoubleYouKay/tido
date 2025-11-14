# ToTracker Turborepo

A serverless-first agile planning application built with a Next.js frontend, Prisma ORM, and PostgreSQL. The workspace uses a Turborepo monorepo layout with shared UI components and Prisma tooling packages. Core features include backlog management, parent/child story hierarchies, and a drag-and-drop calendar to plan delivery timelines.

## Project Structure

- `apps/web` – Next.js 14 application with App Router, NextAuth authentication, React Query data layer, and calendar UX.
- `packages/ui` – Shared UI primitives (buttons, cards) compiled with `tsup`.
- `packages/prisma` – Prisma client tooling, migrations, and seed helpers.
- `prisma/` – Central Prisma schema and seed script shared by all workspaces.

## Prerequisites

- Node.js 20+
- pnpm 8+
- PostgreSQL database (local or hosted)
- OpenSSL (for generating `NEXTAUTH_SECRET`)

## Environment Variables

Copy `.env.example` to `.env` in the repository root and adjust as needed.

```bash
cp .env.example .env
```

Key variables:

- `DATABASE_URL` – PostgreSQL connection string (default provided matches the requested local instance).
- `NEXTAUTH_SECRET` – Generate via `openssl rand -hex 32`.
- `AUTH_PROVIDER` – Set to `local` (default) or `neon` to enable Neon Auth SSO flow.
- `NEON_AUTH_*` – Required when `AUTH_PROVIDER=neon`. Provide issuer, client, and audience per Neon docs.

## Installation

Install dependencies across the workspace:

```bash
pnpm install
```

Generate the Prisma client and push the schema:

```bash
pnpm db:push
```

Seed demo data (optional):

```bash
pnpm --filter @totracker/prisma seed
```

## Development

Run all apps in parallel:

```bash
pnpm dev
```

This starts the Next.js dev server on `http://localhost:3000` with hot module reloading and React Query dev tooling.

### Available Scripts

- `pnpm dev` – Run all `dev` tasks through Turborepo.
- `pnpm build` – Build all applications and packages.
- `pnpm lint` – Run ESLint across the repo.
- `pnpm test` – Placeholder for future tests.
- `pnpm db:push` / `pnpm db:migrate` / `pnpm db:studio` – Prisma workflows.

## Authentication Options

### Local Credentials (Default)

- Users register via the `/register` page.
- Passwords are hashed with `bcryptjs` and stored in PostgreSQL.
- NextAuth uses Prisma Adapter with JWT sessions.

### Neon Auth (Optional)

- Set `AUTH_PROVIDER=neon` and configure the `NEON_AUTH_*` variables.
- Login page switches to the Neon OAuth/OIDC flow for SSO.
- Registration is expected to happen via Neon; `/register` redirects back to login in this mode.

## Data Model Highlights

- `Story` records support parent/child relationships, backlog ordering, and due dates.
- `CalendarPreference` captures per-user settings (extensible in future iterations).
- Dragging a story from the backlog onto the calendar assigns a due date; dropping back to the backlog clears it.
- REST endpoints under `/api/stories` expose CRUD operations for stories and support optimistic UI updates.

## Deployment Notes

- The web app targets serverless runtimes (e.g., Vercel Edge / Serverless). Prisma is configured for PostgreSQL-compatible serverless providers.
- Use connection pooling (e.g., Neon) in production for efficient serverless database access.
- Ensure environment variables are set in your deployment platform.

## Next Steps

- Implement status swimlanes and sprint reporting.
- Add automated tests (`vitest`/`playwright`).
- Expand Neon Auth integration with role provisioning.

# Uptime Monitor

A self-hostable uptime monitor. Register a URL, choose how often it should be
checked, and get told when it goes down and when it comes back. The dashboard
shows current status, 90 days of uptime history and response times.

Work in progress.

## Stack

- **api** and **worker**: NestJS, PostgreSQL via Prisma, BullMQ over Redis
- **web**: Vite, React, MUI, Recharts
- **shared**: request and response types used by both sides

One npm workspaces monorepo:

```
apps/api        REST api, auth, scheduling
apps/worker     runs the checks and sends alerts
apps/web        dashboard
packages/shared types and constants shared across apps
docs/           requirements, design and technical spec
```

## Running locally

Requires Node 24 and Docker.

```sh
cp .env.example .env
docker compose up -d
npm install
npm run dev
```

- api: http://localhost:3000/health
- worker: http://localhost:3001/health
- web: http://localhost:5173

## Scripts

| Command             | What it does                 |
| ------------------- | ---------------------------- |
| `npm run dev`       | Runs every app in watch mode |
| `npm run build`     | Builds every workspace       |
| `npm run typecheck` | Typechecks every workspace   |
| `npm run lint`      | ESLint across the repo       |
| `npm run format`    | Prettier across the repo     |

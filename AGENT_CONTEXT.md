# RiceTrace — Agent Context File

## Monorepo Structure
apps/web/     → Next.js 14 App Router (port 3000)
apps/api/     → Express.js TypeScript API (port 4000)
packages/db/  → Prisma schema + client (@ricetrace/db)
packages/types/ → Shared types (@ricetrace/types)
packages/validators/ → Zod schemas (@ricetrace/validators)
packages/pdf-templates/ → Certificate templates (@ricetrace/pdf-templates)

## Non-Negotiable Rules
- Never change import paths or package names
- Never install packages without being asked
- Never refactor working code while adding a feature
- Always return complete files, not diffs or snippets
- TypeScript strict mode is ON — no `any` types
- API response shape is always: { success: boolean, data: any, meta?: { page, limit, total } }

## Current Status
Controllers exist but return mock data. 
Need: real Prisma queries, compliance engine, file uploads, PDF generation, PWA offline.
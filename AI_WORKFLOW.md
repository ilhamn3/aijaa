# AI Workflow Log & Human-in-the-Loop Collaboration — Ajaia

This document details the AI tools utilized, development acceleration areas, user corrections and rejected proposals, and the verification methods applied during the development of Ajaia.

---

## 1. Tools & Environment Used

- **AI Coding Assistant:** Google Antigravity (powered by Google DeepMind's Advanced Agentic Coding system).
- **Execution Environment:** Windows sandboxed environment with direct tool execution:
  - `run_command`: Running terminal commands (PowerShell, npm, npx, Prisma CLI, Vitest, Git).
  - `read_file`, `write_file`, `edit_file`: Atomic code reading and targeted file manipulation.
- **Core Runtime & Frameworks:**
  - Next.js 16.4.6 (App Router) + React 19.3.0.
  - TypeScript 5 (Strict Mode).
  - Tailwind CSS v4.
  - TipTap Editor (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-underline`, `@tiptap/html`).
  - Prisma v6 (`^6.19.3`) with PostgreSQL on Neon (Serverless).
  - Vitest 5.1.0 (Testing runner).
  - ESLint 9 (Next.js core web vitals configuration).
  - Node.js runtime for route handlers (`export const runtime = "nodejs"`).

---

## 2. Where AI Sped Things Up

1. **Boilerplate Scaffolding & Next.js 16 Setup:**
   - Instantly scaffolded the Next.js App Router structure, including API route handlers handling asynchronous Next.js 16 `params` (`const { id } = await params`).
   - Configured custom signed JWT session cookies (`jose`) with `httpOnly`, `sameSite: "lax"`, and server-side verification (`getCurrentUser()`), avoiding heavy NextAuth boilerplate.
2. **Pure Unit Test Generation:**
   - Rapidly authored 41 comprehensive unit tests covering permission matrices, owner-only deletion, share revocation, file converters, AST sanitization, and Markdown export.
3. **TipTap Editor & AST Conversion Pipeline:**
   - Implemented TipTap with SSR hydration safety (`immediatelyRender: false`), custom toolbar active states, and ProseMirror AST sanitization.
   - Built multi-format file conversion (`mammoth` for `.docx`, `marked` for `.md`, paragraph wrapping for `.txt`) server-side into valid TipTap JSON.
4. **Environment Troubleshooting:**
   - Diagnosed Windows NTFS junction point failures during Turbopack builds linking `.next/node_modules/@prisma/client` and configured `next build --webpack` for reliable multi-platform builds.
   - Resolved peer dependency conflicts between `@types/node` and Vitest 5 by upgrading to `@types/node@^22.20.5`.

---

## 3. What the User Changed or Rejected (Human-in-the-Loop Interventions)

Throughout the development process, the human reviewer provided critical course corrections, rejected initial architectural proposals, and enforced strict design constraints:

1. **Prisma Enum Instead of Raw String:**
   - *Initial AI Plan:* Use a loose `String` field for share permissions (`"view" | "edit"`).
   - *User Correction:* Rejected strings in favor of a native Prisma enum `Permission { VIEW, EDIT }` to enforce database-level integrity and eliminate invalid runtime values.
2. **Dual Neon Connection Strings (`DATABASE_URL` and `DIRECT_URL`):**
   - *Initial AI Plan:* Single database URL.
   - *User Correction:* Mandated adding `directUrl = env("DIRECT_URL")` in `prisma/schema.prisma` for Neon schema migrations while using pooled `DATABASE_URL` for serverless runtime queries. Both were documented in `.env.example`.
3. **Database Provider Choice (Neon vs. Supabase / SQLite):**
   - *User Decision:* Explicitly selected Neon PostgreSQL (free tier) over Supabase or SQLite to guarantee true cloud persistence compatible with Vercel deployment.
4. **Prisma Version Pinning (v6 vs. v7/v8-rc):**
   - *User Directive:* Explicitly commanded checking the installed Prisma version and pinning stable Prisma v6 (`^6.19.3`) instead of bleeding-edge v7 or v8-rc.
   - *Rationale:* In Prisma 6, the standard query engine connects directly to PostgreSQL without requiring extra driver adapter packages (`@prisma/adapter-pg` or `@prisma/adapter-neon`). Prisma 7 introduces major configuration shifts (deprecating `package.json#prisma` in favor of `prisma.config.ts` and revising driver adapters for serverless environments). Sticking with v6 ensured stability and avoided adapter breaking changes.
5. **Server-Side Session Verification:**
   - *User Correction:* Required verifying that the session user still exists in the database on every protected request. Selected the server-side `getCurrentUser()` helper over Edge Middleware to avoid Edge Runtime Prisma engine limitations.
6. **Generic Login Errors:**
   - *User Correction:* Enforced returning a generic `"Invalid credentials"` error for both missing users and invalid passwords, preventing user enumeration.
7. **Project Branding:**
   - *User Correction:* Corrected project name to **"Ajaia"** (from "aijaa").
8. **Phase Checkpoint Discipline (Agent Running Ahead):**
   - *User Correction:* The human noted that the agent ran ahead past designated phase checkpoints (implementing Phase 4 and Phase 5 consecutively without pausing for intermediate user sign-offs). The workflow was brought back under strict verification review.

---

## 4. How Correctness Was Verified

To ensure facts-only verification, every layer of the system was tested and validated directly:

1. **Automated Unit Test Suite (`npm test`):**
   - **41 tests passing across 4 test suites in Vitest** (test duration ~2.8s):
     - `src/lib/access.test.ts` (15 tests): Verified pure authorization functions (`getDocumentRole`, `canEditDocument`, `canDeleteDocument`).
     - `src/lib/sharing.test.ts` (9 tests): Verified `canManageShares`, permission transitions (`VIEW` ↔ `EDIT`), immediate access loss on revocation, and self-sharing prohibition.
     - `src/lib/convertFile.test.ts` (13 tests): Verified text paragraphing, markdown parsing, docx conversion, status code validation (400, 413, 415), and AST schema sanitization.
     - `src/lib/exportMarkdown.test.ts` (4 tests): Verified AST-to-Markdown conversion for headings, lists, inline marks, and empty documents.
   - *Accurate Scope Note:* These tests are unit tests testing pure authorization logic and conversion pipelines directly [VERIFY: no mock-server HTTP route tests were used].
2. **Static Type Safety (`npx tsc --noEmit`):**
   - Executed clean with **0 type errors**.
3. **Linting & Code Standards (`npm run lint`):**
   - ESLint completed with **0 errors and 0 warnings**.
4. **Production Build (`npm run build`):**
   - `next build --webpack` successfully compiled all 13 application routes:
     - Static (`○`): `/_not-found`, `/login`.
     - Dynamic (`ƒ`): `/`, `/dashboard`, `/documents/[id]`, and all 7 `/api/` endpoints.
5. **Database Migration & Seeding:**
   - Ran `prisma migrate dev --name init` against Neon PostgreSQL, creating migration `20261110043602_init`.
   - Verified idempotent seeding with `npm run seed`, creating Alice (Owner), Bob (Editor), and Carol (Viewer).


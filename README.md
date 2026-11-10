# Ajaia — Collaborative Document Editor

A lightweight, Google Docs-inspired collaborative document editor built with Next.js (App Router), TypeScript, TipTap, Prisma, and PostgreSQL on Neon.

Designed and built for a full-stack take-home evaluation with a hard timebox (4–6 hours). Prioritizes a production-grade, deployed, and strictly scoped slice with rich text editing, debounced autosave, granular sharing permissions, and multi-format file uploads (.txt, .md, .docx).

---

## Features

- **Rich Text Editing:** Built with TipTap (client component with SSR hydration safety):
  - Bold, Italic, Underline
  - Headings (H1, H2, H3) and Paragraph formatting
  - Bulleted and Numbered lists
  - Undo and Redo history
- **Document Management:**
  - Create, rename inline, manual save (`Ctrl+S` / `Cmd+S`), and delete (owner-only).
  - 1.5s debounced autosave with local comparison to eliminate redundant network writes.
  - Visible live status indicators (`Saved`, `Saving...`, `Unsaved changes`, `View only`, `Save failed` with inline retry).
- **Granular Sharing & Role Permissions:**
  - Owner can share documents with seeded users by email with `Can edit` (`EDIT`) or `View only` (`VIEW`) permissions.
  - Separate Dashboard views: **"My documents"** vs. **"Shared with me"** with owner names and permission badges.
  - Viewers receive a read-only editor canvas with toolbar suppressed and a top banner. Writes by viewers are rejected by the server with `403 Forbidden`.
  - Immediate revocation: revoking access deletes the share, causing subsequent requests to return `404 Not Found` (concealing document existence).
- **File Upload & Format Conversion:**
  - Accepts `.txt`, `.md`, and `.docx` files (strictly enforced **2MB** limit).
  - Server-side conversion using Node.js runtime (`mammoth` for Word documents, `marked` for Markdown, and paragraph-wrapping for plain text).
- **Custom Session Authentication:**
  - Zero NextAuth overhead: signed `httpOnly` JWT session cookies (`ajaia_session`) signed with `jose`.
  - Every protected route verifies user existence directly against Postgres via server-side `getCurrentUser()`.
  - One-click seeded user dropdown selector on `/login` for rapid role-switching.
- **Robust Quality & Performance:**
  - Input validation with `zod`.
  - Streaming loading skeletons (`loading.tsx`), custom 404 (`not-found.tsx`), and error boundaries (`error.tsx`).
  - 32 automated unit and integration tests passing in Vitest.

---

## Seeded Users & Reviewer Credentials

The database is pre-seeded with 3 demo accounts sharing the common password **`password123`**:

| Name | Email | Password | Pre-seeded Sample Doc Role |
| :--- | :--- | :--- | :--- |
| **Alice Walker** | `alice@example.com` | `password123` | **Owner** (Full edit & share control) |
| **Bob Smith** | `bob@example.com` | `password123` | **Editor** (`Can edit` permission) |
| **Carol Davis** | `carol@example.com` | `password123` | **Viewer** (`View only` permission) |

> **Tip for Reviewers:** The `/login` page includes a 1-click account selector dropdown that autofills credentials for Alice, Bob, and Carol to switch roles instantly.

---

## Environment Variables

Create a `.env` file in the project root (see `.env.example`):

```bash
# Neon PostgreSQL Pooled connection string (used at runtime)
DATABASE_URL="postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Neon PostgreSQL Direct connection string (used for migrations)
DIRECT_URL="postgresql://user:password@ep-sample.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Secret key for signing httpOnly session JWTs (minimum 32 characters)
SESSION_SECRET="your-super-secret-session-key-min-32-chars-long"
```

> **Security Note:** `.env` and all `.env*` files are strictly excluded in `.gitignore`. `!.env.example` is committed for reviewer guidance.

---

## Quick Start & Local Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Apply Migrations & Seed Database
```bash
# Apply migrations to your Postgres database
npx prisma migrate dev --name init

# Or deploy existing migrations
npx prisma migrate deploy

# Seed initial users (Alice, Bob, Carol) and sample shared document
npm run seed
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running Automated Tests

Ajaia includes 32 Vitest unit and integration tests covering pure access logic, role transitions, immediate revocations, self-sharing prevention, and multi-format file conversions:

```bash
# Run all tests once
npm test

# Run tests in watch mode
npx vitest
```

---

## Deployment to Vercel

1. **Push to GitHub / GitLab:**
   The repository is already configured with `"postinstall": "prisma generate"`.
2. **Import Project into Vercel:**
   Framework Preset: `Next.js`.
3. **Configure Environment Variables in Vercel:**
   - `DATABASE_URL`: Your pooled Neon Postgres connection string.
   - `DIRECT_URL`: Your direct/unpooled Neon Postgres connection string.
   - `SESSION_SECRET`: A secure random string (at least 32 characters).
4. **Build Command on Vercel:**
   ```bash
   prisma migrate deploy && next build --webpack
   ```
   *(Or keep standard `next build --webpack` with `prisma migrate deploy` run during initial database setup).*

---

## File Upload Specifications

- **Supported File Types:**
  - `.md` (Markdown) — converted via `marked` and parsed to TipTap JSON.
  - `.docx` (Microsoft Word) — converted via `mammoth` and parsed to TipTap JSON.
  - `.txt` (Plain text) — parsed into TipTap paragraph nodes.
- **Maximum File Size:** `2MB` (`2,097,152 bytes`).
- **Route Handler Runtime:** `export const runtime = "nodejs";` in `src/app/api/documents/upload/route.ts`.

---

## Tech Stack Summary

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS v4
- **Database:** PostgreSQL on Neon
- **ORM:** Prisma v6 (`^6.19.3`)
- **Rich Text Editor:** TipTap Editor (`@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-underline`, `@tiptap/html`)
- **Authentication:** Custom signed `httpOnly` JWT session cookies (`jose` + `bcryptjs`)
- **Validation:** Zod v4
- **File Parsing:** Mammoth (`.docx`) + Marked (`.md`)
- **Testing:** Vitest v5

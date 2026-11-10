# Architecture & Engineering Decisions — Ajaia

This document details the architectural principles, trade-offs, deliberate scope cuts, and system design choices implemented for Ajaia within the 4–6 hour timebox.

---

## 1. What Was Prioritized & Why

Given the hard 4–6 hour timebox, the goal was not to build a broad array of shallow features, but to build a **production-ready, robust, and deployable slice** of collaborative document editing.

1. **Centralized, Pure Authorization (`src/lib/access.ts`):**
   - *Why:* Security vulnerabilities in multi-tenant collaborative software typically occur when access checks are scattered, inconsistent, or trust client-side parameters. By funneling every API route, server component, and mutation through pure functions (`getDocumentRole`, `canEditDocument`, `canDeleteDocument`, `canManageShares`), authorization is deterministic, zero-dependency, and 100% testable in unit test suites without requiring database mocks.
2. **Reviewer Ergonomics (Instant Role-Switching):**
   - *Why:* Evaluating multi-user sharing usually requires reviewers to maintain multiple browser profiles or manually register multiple accounts. We seeded 3 distinct personas with a sample document already demonstrating all three permission levels (Alice as Owner, Bob as Editor, Carol as Viewer) and provided a 1-click dropdown on `/login` that populates credentials instantly.
3. **Optimized Persistence & Autosave UX:**
   - *Why:* Naive autosave implementations flood PostgreSQL on every keystroke, causing rate limiting and degraded server performance. We designed a debounced autosave (1.5s) combined with a local ref snapshot check (`lastSavedContentRef`). If the content did not mutate, no request is dispatched. If a save fails, an inline retry button allows re-attempting without losing unsaved changes.
4. **Vercel & Neon Production Readiness:**
   - *Why:* Many take-home projects rely on local SQLite files or in-memory persistence that break immediately when deployed serverlessly. Ajaia was built on Neon serverless PostgreSQL from the ground up, utilizing dual pooled (`DATABASE_URL`) and direct (`DIRECT_URL`) connection strings.

---

## 2. System Architecture & Data Model

### Data Model (`prisma/schema.prisma`)

```
   ┌────────────────┐                ┌────────────────────────┐
   │      User      │ 1            * │        Document        │
   │────────────────│────────────────│────────────────────────│
   │ id (cuid)      │ owns           │ id (cuid)              │
   │ email (unique) │                │ title                  │
   │ name           │                │ content (Json TipTap)  │
   │ passwordHash   │                │ ownerId (FK -> User)   │
   └───────┬────────┘                └───────────┬────────────┘
           │ 1                                   │ 1
           │                                     │
           │ has                                 │ has
           │                                     │
           │ *               *                   │ *
         ┌─────────────────────────────────────────┐
         │              DocumentShare              │
         │─────────────────────────────────────────│
         │ id (cuid)                               │
         │ documentId (FK -> Document)             │
         │ userId     (FK -> User)                 │
         │ permission (Enum: VIEW | EDIT)          │
         │ @@unique([documentId, userId])          │
         └─────────────────────────────────────────┘
```

- **Prisma Enum `Permission`:** Replaced raw strings with enum values (`VIEW`, `EDIT`), preventing invalid permissions at the database level.
- **TipTap Content as JSON:** Stored as structured TipTap JSON (`{"type":"doc","content":[...]}`). This preserves headings, bullet lists, ordered lists, and inline marks cleanly without HTML sanitization risks or markdown ambiguity.
- **Compound Unique Index:** `@@unique([documentId, userId])` guarantees idempotent sharing upserts and prevents duplicate share rows.

---

## 3. Pure Authorization Architecture

All access logic is isolated in `src/lib/access.ts`:

```typescript
export type DocumentRole = "owner" | "edit" | "view" | null;

export function getDocumentRole(userId, doc, shares): DocumentRole
export function canEditDocument(role): boolean       // true for "owner" | "edit"
export function canDeleteDocument(role): boolean     // true only for "owner"
export function canManageShares(role): boolean       // true only for "owner"
```

### Authorization Invariants
- **Never Trust Client-Sent IDs:** User identities are strictly derived on the server from the signed `httpOnly` session cookie (`getCurrentUser()`).
- **404 Concealment:** If a user requests a document for which `getDocumentRole()` returns `null`, the API and Server Component return `404 Not Found` (rather than 403), ensuring the existence of documents is never leaked to unauthorized users.
- **Server-Side Write Enforcement:** Even if a viewer bypasses the read-only client UI, `PATCH /api/documents/[id]` validates `role` and strictly rejects with `403 Forbidden`.

---

## 4. Key Trade-offs & Decisions

| Decision | Chosen Approach | Rejected Alternative | Trade-off / Rationale |
| :--- | :--- | :--- | :--- |
| **Authentication** | Custom signed `httpOnly` JWT session (`jose`) | NextAuth / Auth.js | NextAuth adds significant boilerplate, version fragmentation, and external database adapter weight. Custom signed JWT cookies are lightweight, zero-dependency, self-contained, and verify directly in server components and routes. |
| **Session Verification** | Server-side `getCurrentUser()` helper | Edge Middleware DB query | Next.js Edge Middleware runs in the Vercel Edge Runtime where native Prisma query engines cannot execute without proxy adapters. Placing the DB existence check in `getCurrentUser()` executes in standard Node.js serverless functions, preserving connection pools. |
| **Prisma Version** | Pinned Prisma v6 (`^6.19.3`) | Prisma v7 / v8-rc | Prisma v7 introduces breaking configuration changes (deprecating `package.json#prisma` and altering driver adapters), while v8 is in release candidate stage. Prisma v6 is battle-tested, stable, and reliably supports Neon's dual URL architecture. |
| **File Conversion** | Server-side `@tiptap/html` AST generation | Client-side DOM parsing | Client-side DOM parsing exposes client performance degradation and hydration divergences. Server-side processing inside a Node.js route handler (`export const runtime = "nodejs"`) ensures clean AST generation and safe binary buffer handling. |
| **Bundling** | `next build --webpack` | Turbopack | Next.js 16 Turbopack triggers Windows junction point permission errors when linking `.next/node_modules/@prisma/client`. Webpack compiles identically across Windows, Linux, and Vercel without OS-specific workarounds. |

---

## 5. Deliberate Scope Cuts (Explicit Non-Goals)

To respect the 4–6 hour timebox and deliver a working, high-quality, fully tested slice, the following features were deliberately excluded:

1. **Real-Time WebSocket Presence & Operational Transformation (OT/CRDT):**
   - *Why cut:* Implementing Y.js or PartyKit WebSockets with conflict resolution requires complex distributed state infrastructure that would exceed the timebox and introduce deployment fragility on Vercel serverless. Debounced autosave + manual save delivers reliable persistence and multi-user collaboration without operational overhead.
2. **Comments & Threaded Annotations:**
   - *Why cut:* Adding inline text range tracking and comment threads introduces significant schema and UI surface area secondary to the core document editing and permission workflow.
3. **Email Invites & SMTP Integration:**
   - *Why cut:* Third-party transactional email providers (Resend, SendGrid) require external API keys and domain verification for reviewers. Seeded accounts and instant in-app sharing provide a self-contained reviewer experience.
4. **Nested Folders & Hierarchies:**
   - *Why cut:* Flat document structures categorized by "My documents" and "Shared with me" fully fulfill the collaboration requirements with minimal UI friction.
5. **Offline Sync & Service Workers:**
   - *Why cut:* IndexedDB caching and offline reconciliation introduce client-server synchronization edge cases unnecessary for a cloud-hosted editor.

---

## 6. What I'd Build Next With 2–4 More Hours

*(Note: The optional stretch feature—Export to Markdown `.md`—was implemented during Phase 5 via `src/lib/exportMarkdown.ts`).*

1. **PDF & Clean HTML Export:**
   - Expand the export engine to generate paginated PDF and standalone styled HTML using headless Chromium or `@react-pdf/renderer`.
2. **Version History & Rollback:**
   - Add a `DocumentVersion` model recording periodic snapshot diffs with the ability for owners to preview and restore previous versions.
3. **Full-Text Document Search:**
   - Leverage PostgreSQL's native `tsvector` and GIN indexing to provide instant keyword search across document titles and contents in the dashboard.
4. **Live Collaborator Presence Indicators:**
   - Lightweight presence pings via Server-Sent Events (SSE) showing avatar badges of users currently viewing or editing the document.


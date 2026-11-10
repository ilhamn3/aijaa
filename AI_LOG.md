# AI Workflow Log & Architectural Decisions (Ajaia)

## Phase 1: Project Scaffold, Prisma Schema, Seed Script, Session Auth & Login

### 1. Prisma Version Decision
- **Version Chosen:** Prisma v6 (`^6.19.3`).
- **Why:** During dependency checks, npm indicated Prisma v8-rc is in release candidate stage and Prisma 7 introduces major breaking configuration shifts (deprecating `package.json#prisma` and altering driver adapters). Prisma v6 is mature, stable, and has reliable native support for Neon PostgreSQL with dual `DATABASE_URL` (pooled connection for serverless runtime) and `DIRECT_URL` (unpooled connection for migrations).
- **Alternatives Rejected:** Prisma v7/v8-rc were rejected to avoid bleeding-edge adapter instability on Vercel deployment.

### 2. Authentication & Session Strategy
- **Mechanism:** Signed `httpOnly` JWT session cookies (`ajaia_session`) using `jose` with `HS256`, `sameSite: "lax"`, and `secure` in production.
- **Why NO NextAuth:** Explicitly constrained by prompt. Custom signed cookies avoid heavy external libraries and external session database overhead, keeping the app lightweight and self-contained.
- **Server-Side User Verification Decision:**
  - **Chosen approach:** Server-side `getCurrentUser()` helper called on every protected route and server component.
  - **Why not Edge Middleware for DB verification:** Next.js Edge Middleware runs in the Vercel Edge Runtime where the native Prisma Node.js engine cannot run without edge driver/accelerate proxies. Placing the DB existence check inside `getCurrentUser()` ensures standard Node.js runtime execution, connection pool efficiency, and automatic cookie invalidation if the user is deleted or altered in the database.

### 3. Schema & Seed Design
- **Enums:** Created Prisma enum `Permission { VIEW, EDIT }` rather than open strings, guaranteeing type-safety and preventing invalid permission inputs at the database level.
- **Dual Connection Strings:** Added pooled `DATABASE_URL` for runtime queries and direct unpooled `DIRECT_URL` for migrations in schema and `.env.example`.
- **Document Default Content:** Document schema content field defaults to valid TipTap JSON `{"type":"doc","content":[]}`.
- **Postinstall Hook:** Configured `"postinstall": "prisma generate"` in `package.json`.
- **Seed Script (`prisma/seed.ts`):** Made 100% idempotent via `prisma.user.upsert`, `prisma.document.upsert`, and compound unique key `prisma.documentShare.upsert` (`documentId_userId`).
- **Sample Document Content:** Pre-populated with structured TipTap headings, paragraphs, and list items illustrating Alice (Owner), Bob (Editor), and Carol (Viewer).

### 4. Quality & Error Handling
- **Login Validation:** Input parsed with `zod` schema (`email().trim()`, `min(1)`).
- **Security:** Standard generic `"Invalid credentials"` error returned for any validation failure, user-not-found, or password mismatch, preventing user enumeration.
- **Reviewer UX:** Added quick seeded user dropdown selector on `/login` that autofills credentials for Alice, Bob, and Carol for rapid role-switching during evaluation.

### 5. Bugs Hit & Fixes Applied
1. **PowerShell `&&` syntax error:**
   - *Bug:* Chained `npm install ... && npm install -D ...` failed with PowerShell syntax error `The token '&&' is not a valid statement separator`.
   - *Fix:* Executed commands sequentially or separated by `;`.
2. **Vitest `@types/node` peer dependency conflict:**
   - *Bug:* Create-next-app generated `@types/node@^20`, but Vitest 5 requires `@types/node` matching Node 22/24.
   - *Fix:* Installed `@types/node@^22.20.5`, cleanly resolving the peer dependency conflict.
3. **Vitest CJS/ESM warning:**
   - *Bug:* Vite warned that `vitest.config.ts` used ESM in CommonJS mode.
   - *Fix:* Renamed configuration to `vitest.config.mts` and resolved alias path cleanly, achieving clean 7/7 passing unit test suite with 0 warnings.
4. **Turbopack Windows Junction Point & Google Fonts fetch error:**
   - *Bug:* `next build` failed under Turbopack due to Windows junction creation permissions on `.next/node_modules/@prisma/client` and network fetch of Google Fonts during build.
   - *Fix:* Replaced Google Fonts with a native, responsive system font stack and configured `"build": "next build --webpack"`, ensuring reliable compilation across Windows environments, Linux, and Vercel.

---

## Phase 2: Documents CRUD, TipTap Editor & Autosave

### 1. Document Architecture & CRUD
- **Endpoints Implemented:**
  - `GET /api/documents`: Returns owned documents and shared documents separated for dashboard consumption.
  - `POST /api/documents`: Creates new document with owner set to authenticated session user and default TipTap JSON `{"type":"doc","content":[]}`.
  - `GET /api/documents/[id]`: Derives user via `getCurrentUser()` and enforces access via pure function `getDocumentRole(userId, doc, shares)`.
  - `PATCH /api/documents/[id]`: Updates title or content. Validates input via Zod. Strictly rejects view-only users with 403 Forbidden (`{ error: "Forbidden: You have view-only permissions for this document" }`).
  - `DELETE /api/documents/[id]`: Strictly restricts deletion to document owner (`role === "owner"`). Shared editors and viewers receive 403.
- **Next.js 16 Async Route Params:** Addressed asynchronous `params` resolution in all dynamic handlers (`const { id } = await params`).

### 2. TipTap Editor Integration
- **SSR Hydration Defense:** Initialized TipTap with `immediatelyRender: false` in `src/components/editor/TipTapEditor.tsx`, eliminating Next.js SSR hydration mismatches.
- **Rich Text Extensions:** Installed and configured `@tiptap/starter-kit` (configured with H1, H2, H3 headings, bullet list, ordered list, undo/redo) and `@tiptap/extension-underline`.
- **Toolbar Design:** Custom Google Docs-style toolbar with active-state indicators and keyboard accessibility.
- **Read-Only Mode:** When `role === "view"`, `editable: false` is passed to the editor, disabling keystroke modifications and suppressing the editing toolbar.

### 3. Autosave & Save Status UX
- **Debounced Autosave:** Keystrokes trigger a 1.5-second (1500ms) debounced autosave.
- **Redundant Network Call Prevention:** Changes are compared against `lastSavedContentRef` and `lastSavedTitleRef`. If no actual mutation occurred, no network request is fired.
- **Save Failure Resilience:** Added immediate "Retry" button on save failure banners, preserving unsaved local editor content so user work is never lost.
- **Manual Save:** Added manual "Save" button and keyboard shortcut (`Cmd+S` / `Ctrl+S`).
- **Live Status Indicator:** Visible header indicator reflecting `"Saving..."` (spinner), `"Saved"` (emerald checkmark), `"Unsaved changes"` (amber indicator), and `"View only"` for read-only access.
- **Inline Title Renaming:** Title is an editable input that automatically commits on blur or Enter key.

---

## Phase 3: Sharing, Permissions & Access Control

### 1. Sharing API Endpoints
- **`GET /api/documents/[id]/shares`:** Owner only. Returns list of collaborators with their assigned permissions and owner details. Non-owners receive **403 Forbidden**.
- **`POST /api/documents/[id]/shares`:** Owner only.
  - Validates email and permission (`VIEW` | `EDIT`) with Zod.
  - Checks if user exists in the database; returns a clear 404 message (`No user with that email found`) if not found.
  - Prevents owners from sharing with themselves (`400 Bad Request`).
  - Upserts share on `documentId_userId` compound unique key, seamlessly updating permission if the user is already invited.
- **`PATCH /api/documents/[id]/shares/[shareId]` & `/shares`:** Owner only. Allows changing permissions between `VIEW` and `EDIT`.
- **`DELETE /api/documents/[id]/shares/[shareId]` & `/shares`:** Owner only. Revokes access by deleting the `DocumentShare` record.

### 2. Immediate Revocation & Read-Only Enforcement
- **Immediate Revocation:** Once an owner revokes a user's share, the subsequent request from that user drops to `role === null`, returning **404** (concealing document existence) or **403**.
- **View-Only Enforcement:**
  - **Server-Side:** `PATCH /api/documents/[id]` verifies `role === "view"` and rejects with **403 Forbidden**.
  - **Client-Side:** Viewers see a prominent amber "View only" banner at the top of the canvas, toolbar is suppressed, and `editable: false` is enforced on TipTap.

### 3. Share Dialog Modal (`src/components/sharing/ShareDialog.tsx`)
- Displayed exclusively for document owners.
- Features quick-selector pills for seeded users (Alice, Bob, Carol) excluding the document owner.
- Displays full list of collaborators with an inline permission dropdown selector and a revoke button.
- Handles success notifications, error alerts, and loading spinners.

### 4. Tests
- Extended test suite to 24 tests in `src/lib/access.test.ts` and `src/lib/sharing.test.ts`:
  - `canManageShares`: Confirms only owners can manage shares, while editors, viewers, and strangers get 403/false.
  - Permission transitions: Verifies immediate role transitions when changing `VIEW` to `EDIT` and vice versa.
  - Immediate revocation: Verifies that deleting a share immediately removes all edit and read access on subsequent queries.
  - Self-sharing prevention rule validation.

---

## Phase 4: File Upload & Format Conversion

### 1. File Upload Requirements & Route Configuration
- **Node.js Runtime Requirement:** Explicitly set `export const runtime = "nodejs";` in `src/app/api/documents/upload/route.ts` as required by the architecture specification for binary buffer processing.
- **Strict Validation Rules:**
  - Supported extensions: `.txt`, `.md`, `.docx` only. All other file formats receive **400 Bad Request** with clear instructions.
  - Maximum file size: **2MB** (`MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024`). Files exceeding 2MB receive **400 Bad Request**.

### 2. Document Conversion Pipeline (`src/lib/convertFile.ts`)
- **Word Documents (`.docx`):** Converted using `mammoth.convertToHtml({ buffer })` and parsed into TipTap JSON using `@tiptap/html`'s `generateJSON(html, extensions)`.
- **Markdown (`.md`):** Converted via `marked.parse(markdown)` into HTML and generated into TipTap JSON via `generateJSON`.
- **Plain Text (`.txt`):** Split by newlines and mapped directly into TipTap `{ type: "paragraph", content: [{ type: "text", text: line }] }` nodes.
- **Title Extraction:** Automatically sanitizes the original file name as the document title.

### 3. UI Component (`UploadDocumentModal.tsx`)
- Placed on the dashboard actions bar alongside "New document".
- Features a dropzone supporting drag-and-drop and file browsing.
- Clear visual cues highlighting supported formats (`.md`, `.docx`, `.txt`) and the `2MB` ceiling.
- Client-side pre-validation prevents uploading oversized or invalid files.
- Redirects immediately to the new document editor upon successful upload and conversion.

### 4. Unit & Integration Tests (`src/lib/convertFile.test.ts`)
- 8 tests covering plain text conversion, markdown parsing (headings, bold, lists), file extension extraction, title derivation, and rejection of invalid file types (`.zip`, `.png`).
- Total test suite expanded to **32/32 passing tests**.

---

## Phase 5: Quality Pass, Robustness, Status Codes & Optional Stretch

### 1. Status Code Rigor & RFC Compliance
- **413 Payload Too Large:** `/api/documents/upload` enforces strict 2MB ceiling and returns HTTP 413 if the payload exceeds limit.
- **415 Unsupported Media Type:** Returned if uploaded file has an unsupported extension or MIME type (only `.txt`, `.md`, `.docx` allowed).
- **400 Bad Request:** Returned for empty files, zero-byte uploads, malformed JSON, or self-sharing attempts.
- **401 Unauthorized:** Missing or invalid session cookie; unauthenticated users redirected to `/login`.
- **403 Forbidden:** View-only user attempting write, non-owner attempting delete or managing shares.
- **404 Not Found:** Conceals unauthorized document access (never leaks document existence to unshared users) or unknown user email during share invitation.
- **500 Internal Server Error:** Generic safe messages logged securely to server console without leaking database credentials or stack traces.

### 2. Title Constraints & Edge Cases
- **120-Character Limit:** Title input capped at 120 characters across client input (`maxLength={120}`) and server Zod schemas (`max(120)`).
- **Fallback to "Untitled":** If a user clears the title input and blurs or presses Enter, it gracefully falls back to `"Untitled"`.
- **Offline / Network Save Failure Handling:** Local edits are preserved in state when network fails; a persistent amber banner alerts the user with an instant "Retry" button.

### 3. TipTap AST Sanitization
- Sanitizes parsed HTML and markdown AST nodes to guarantee only editor-supported nodes (paragraphs, headings clamped to levels 1–3, bullet lists, ordered lists) and marks (bold, italic, underline) enter document content. Any extraneous tags (tables, iframes, script) are safely stripped or normalized.

### 4. Accessibility & UI Polish
- Toolbar buttons equipped with visible focus rings, `role="toolbar"`, and descriptive `aria-label` tags (`"Bold (Ctrl+B)"`, `"Underline (Ctrl+U)"`, etc.).
- Keyboard shortcuts (`Ctrl/Cmd+B`, `Ctrl/Cmd+I`, `Ctrl/Cmd+U`, `Ctrl/Cmd+S`) functional and accessible.
- Responsive design adapting gracefully from desktop down to tablet viewports.
- Next.js Streaming Loading Skeletons (`loading.tsx` for dashboard and editor) eliminating layout shift.
- Custom `not-found.tsx` and `error.tsx` error boundaries.

### 5. Optional Stretch: Export as Markdown
- Implemented `src/lib/exportMarkdown.ts` and integrated a one-click "Export .md" button in `DocumentEditorShell.tsx`.
- Client-side download triggers an immediate `.md` file download named after the document title.
- Unit tests (`src/lib/exportMarkdown.test.ts`) verify headers, lists, bold/italic, and edge cases.

### 6. Verification Results
- **ESLint:** 0 errors, 0 warnings (`npm run lint`).
- **TypeScript:** 0 type errors (`npx tsc --noEmit`).
- **Vitest Suite:** 41/41 tests passing across 4 test suites (`npm test`).
- **Production Build:** `next build --webpack` compiles all static and dynamic routes cleanly.

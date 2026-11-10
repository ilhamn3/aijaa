# Take-Home Assignment Submission — Ajaia

**Candidate Role:** Full Stack Developer  
**Project:** Ajaia — Lightweight Collaborative Document Editor  
**Timebox:** Completed within 4–6 hours  

---

## 1. Project Summary

Ajaia is a lightweight, Google Docs-inspired collaborative document editor built to demonstrate full-stack engineering proficiency across the Next.js App Router, TypeScript, TipTap rich text, Prisma ORM, and Neon PostgreSQL.

All core requirements have been implemented, verified, and backed by 41 automated unit tests:
- **Rich Text & Autosave:** TipTap editor with hydration safety (`immediatelyRender: false`), headings (H1–H3), lists, inline marks, 1.5s debounced autosave, manual save, offline error recovery with retry, and inline title renaming (120 chars max).
- **File Upload:** Uploads and converts `.txt`, `.md`, and `.docx` files (up to 2MB) into editable TipTap documents using Node.js runtime (`mammoth` + `marked`) with strict RFC-compliant status codes (413 Payload Too Large, 415 Unsupported Media Type, 400 Bad Request) and AST schema sanitization.
- **Granular Sharing:** Centralized pure access logic (`getDocumentRole`), owner share controls, immediate revocation, view-only enforcement (both UI and server 403), and separated Dashboard sections ("My documents" vs "Shared with me").
- **Optional Stretch Feature:** One-click "Export .md" button in the editor converting TipTap AST directly into clean Markdown for immediate browser download.
- **Persistence & Custom Auth:** Neon PostgreSQL with Prisma migrations, signed `httpOnly` session cookies (no NextAuth), and 3 seeded users.

---

## 2. Reviewer Walkthrough (Step-by-Step)

The database includes a pre-seeded sample document titled **"Welcome to Ajaia"** configured with realistic permissions.

### Seeded Credentials:
| Persona | Email | Password | Pre-seeded Sample Doc Role |
| :--- | :--- | :--- | :--- |
| **Alice Walker** | `alice@example.com` | `password123` | **Owner** (Full edit & share control) |
| **Bob Smith** | `bob@example.com` | `password123` | **Editor** (`Can edit` permission) |
| **Carol Davis** | `carol@example.com` | `password123` | **Viewer** (`View only` permission) |

*(The `/login` dropdown lets reviewers switch accounts instantly).*

### Step 1: Sign in as Alice (Owner)
1. Navigate to `/login`.
2. Select **"Alice Walker (alice@example.com)"** from the quick-select dropdown (or type credentials) and click **Sign in**.
3. You will land on the Dashboard. Under **"My documents"**, notice the document **"Welcome to Ajaia"** marked with a blue **`Owner`** badge.
4. Click to open the document:
   - Notice the editable title and full formatting toolbar (Bold, Italic, Underline, H1–H3, Lists).
   - Type some new text into the editor. Notice the live status transition: `"Unsaved changes"` -> `"Saving..."` -> `"Saved"` (checkmark).
   - Press `Ctrl+S` or click **Save** to trigger a manual save.
5. Click the **"Share"** button in the header:
   - Observe that Alice is listed as Owner.
   - Bob is listed with **`Can edit`** and Carol with **`View only`**.
   - Use the dropdown to change Carol to **`Can edit`** (or use the form to add a new user).

### Step 2: Sign in as Bob (Editor)
1. Sign out (via header sign-out button).
2. On `/login`, select **"Bob Smith (bob@example.com)"**.
3. On Bob's Dashboard, notice:
   - **"My documents"** is empty (or contains documents Bob created).
   - **"Shared with me"** displays **"Welcome to Ajaia"** with an emerald **`Can edit`** badge and notes `Owner: Alice Walker`.
4. Open the document:
   - Notice Bob has full access to edit and autosave content.
   - Notice the **"Share"** button is not visible for Bob (only the document owner can manage shares).

### Step 3: Sign in as Carol (Viewer)
1. Sign out and sign in as **"Carol Davis (carol@example.com)"**.
2. On Carol's Dashboard, notice **"Welcome to Ajaia"** is in **"Shared with me"** with a slate **`View only`** badge.
3. Open the document:
   - Observe the prominent top banner: *"View-only mode: You do not have permission to edit this document."*
   - Notice the editing toolbar is suppressed and the canvas is completely read-only (`editable: false`).
   - Any manual HTTP `PATCH` attempts to modify content are rejected by the server with `403 Forbidden`.

### Step 4: Test File Upload (.txt, .md, .docx)
1. Sign in as any user (e.g. Alice).
2. On the Dashboard, click **"Upload file"**.
3. Drag and drop or browse for a `.md`, `.txt`, or `.docx` file (under 2MB).
4. Click **"Import document"**:
   - The file is converted server-side into structured TipTap AST.
   - You will be automatically redirected to the newly created editable document with the file's name as the title.

### Step 5: Test Revocation
1. Sign in as Alice.
2. Open **"Welcome to Ajaia"**, open the **"Share"** modal, and click the trash icon next to Bob to revoke his access.
3. Sign out and sign back in as Bob.
4. Bob's Dashboard now shows 0 shared documents. Attempting to visit `/documents/doc_sample_welcome` directly returns **404 Not Found** (concealing document existence).

---

## 3. Test Suite Verification

Ajaia includes 41 automated unit tests passing in Vitest across 4 test files (testing pure access logic, sharing rules, multi-format file converters, and markdown export directly; no HTTP route-level mock-server integration tests):

```bash
npm test
```

### Coverage Overview:
- **`src/lib/access.test.ts` (15 tests):**
  - Owner resolution, redundant share handling, edit share resolution, view share resolution.
  - Access drops to `null` immediately upon share revocation.
  - Null/undefined input resilience.
  - Pure authorization helpers: `canEditDocument` (owner/edit = true, view/null = false) and `canDeleteDocument` (owner = true, edit/view/null = false).
- **`src/lib/sharing.test.ts` (9 tests):**
  - Owner-only share management rule (`canManageShares`).
  - Share permission transitions (`VIEW` -> `EDIT` and `EDIT` -> `VIEW`).
  - Immediate revocation effects on subsequent role evaluations.
  - Self-sharing prevention rule.
- **`src/lib/convertFile.test.ts` (13 tests):**
  - Plain text paragraph wrapping.
  - Markdown headings, formatting, and lists conversion to TipTap JSON.
  - `.docx` buffer pipeline integration.
  - Clean title derivation and extension extraction.
  - Unsupported extension rejection (`.zip`, `.png`).
  - AST schema sanitization (restricting heading levels to 1–3 and filtering out unsupported marks).
- **`src/lib/exportMarkdown.test.ts` (4 tests):**
  - Markdown export stretch: headings, paragraphs, bold, italic, underline, lists, and empty doc resilience.

---

## 4. Documentation Index

- **`README.md`:** Comprehensive setup, environment variables, seeding, local running, testing, file upload specs, and Vercel deployment guide.
- **`ARCHITECTURE.md`:** Deep-dive into technical trade-offs, pure authorization design, deliberate scope cuts, and future 2–4 hour roadmap.
- **`AI_WORKFLOW.md`:** Full documentation of AI tools used, human-in-the-loop corrections and rejected proposals, correctness verification, and workflow analysis.
- **`AI_LOG.md`:** Chronological record of all architectural decisions, alternatives evaluated, and bugs resolved throughout each phase.
- **`video-link.txt`:** Walkthrough recording link placeholder.


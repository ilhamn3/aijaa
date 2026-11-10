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
   - *Fix:* Replaced Google Fonts with a native, responsive system font stack and configured `"build": "next build --webpack"`, ensuring reliable compilation across Windows environments and Vercel.

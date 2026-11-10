import { PrismaClient, Permission } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const SEEDED_PASSWORD = "password123";

export const SEEDED_USERS = [
  {
    id: "usr_alice",
    email: "alice@example.com",
    name: "Alice Walker",
  },
  {
    id: "usr_bob",
    email: "bob@example.com",
    name: "Bob Smith",
  },
  {
    id: "usr_carol",
    email: "carol@example.com",
    name: "Carol Davis",
  },
];

const SAMPLE_DOCUMENT_ID = "doc_sample_welcome";

const SAMPLE_TIPTAP_CONTENT = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Welcome to Ajaia" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Ajaia is a lightweight collaborative document editor inspired by Google Docs. Test rich text formatting, autosave, file uploads, and granular sharing permissions.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Role & Permission Model" }],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Alice (Owner): " },
                { type: "text", marks: [{ type: "italic" }], text: "Full edit and sharing control." },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Bob (Editor): " },
                { type: "text", marks: [{ type: "italic" }], text: "Can edit document content and autosave." },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Carol (Viewer): " },
                { type: "text", marks: [{ type: "italic" }], text: "Read-only view without edit toolbar." },
              ],
            },
          ],
        },
      ],
    },
  ],
};

async function main() {
  console.log("Seeding database...");
  const passwordHash = await bcrypt.hash(SEEDED_PASSWORD, 10);

  // 1. Upsert Seeded Users
  const users = await Promise.all(
    SEEDED_USERS.map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name,
          passwordHash,
        },
        create: {
          id: user.id,
          email: user.email,
          name: user.name,
          passwordHash,
        },
      })
    )
  );
  console.log(`✓ Seeded ${users.length} users (Alice, Bob, Carol)`);

  const alice = users.find((u) => u.email === "alice@example.com")!;
  const bob = users.find((u) => u.email === "bob@example.com")!;
  const carol = users.find((u) => u.email === "carol@example.com")!;

  // 2. Upsert Sample Document owned by Alice
  const document = await prisma.document.upsert({
    where: { id: SAMPLE_DOCUMENT_ID },
    update: {
      title: "Welcome to Ajaia",
      content: SAMPLE_TIPTAP_CONTENT,
      ownerId: alice.id,
    },
    create: {
      id: SAMPLE_DOCUMENT_ID,
      title: "Welcome to Ajaia",
      content: SAMPLE_TIPTAP_CONTENT,
      ownerId: alice.id,
    },
  });
  console.log(`✓ Seeded sample document: "${document.title}"`);

  // 3. Upsert Shares: Bob (EDIT), Carol (VIEW)
  await prisma.documentShare.upsert({
    where: {
      documentId_userId: {
        documentId: document.id,
        userId: bob.id,
      },
    },
    update: {
      permission: Permission.EDIT,
    },
    create: {
      documentId: document.id,
      userId: bob.id,
      permission: Permission.EDIT,
    },
  });

  await prisma.documentShare.upsert({
    where: {
      documentId_userId: {
        documentId: document.id,
        userId: carol.id,
      },
    },
    update: {
      permission: Permission.VIEW,
    },
    create: {
      documentId: document.id,
      userId: carol.id,
      permission: Permission.VIEW,
    },
  });
  console.log("✓ Seeded document shares: Bob (EDIT), Carol (VIEW)");
  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


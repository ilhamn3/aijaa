import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDocumentRole } from "@/lib/access";
import DocumentEditorShell from "./DocumentEditorShell";

interface DocumentPageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      shares: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!doc) {
    notFound();
  }

  const role = getDocumentRole(user.id, doc, doc.shares);

  if (!role) {
    // User does not have access to this document -> 404 (do not reveal document exists)
    notFound();
  }

  return (
    <DocumentEditorShell
      initialDocument={doc}
      role={role}
      currentUser={user}
    />
  );
}


import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDocumentRole } from "@/lib/access";
import { FileText, Users, FolderOpen } from "lucide-react";
import LogoutButton from "./LogoutButton";
import NewDocumentButton from "./NewDocumentButton";
import UploadDocumentModal from "./UploadDocumentModal";
import DocumentItem from "./DocumentItem";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch owned documents
  const ownedDocs = await prisma.document.findMany({
    where: { ownerId: user.id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      shares: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  // Fetch shared documents
  const sharedShares = await prisma.documentShare.findMany({
    where: { userId: user.id },
    include: {
      document: {
        include: {
          owner: { select: { id: true, name: true, email: true } },
          shares: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const myDocuments = ownedDocs.map((doc) => ({
    ...doc,
    role: "owner" as const,
  }));

  const sharedWithMe = sharedShares.map((s) => ({
    ...s.document,
    role: (getDocumentRole(user.id, s.document, s.document.shares) || "view") as
      | "edit"
      | "view",
  }));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-xs sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 tracking-tight leading-tight">
              Ajaia
            </h1>
            <p className="text-xs text-slate-500">Google Docs-inspired editor</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200/60">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="text-xs">
              <span className="font-medium text-slate-800">{user.name}</span>
              <span className="text-slate-500 ml-1.5 hidden sm:inline">
                ({user.email})
              </span>
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-8">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-200/80">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Documents
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Create, edit, and share documents.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <UploadDocumentModal />
            <NewDocumentButton />
          </div>
        </div>

        {/* Section 1: My Documents */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <span>My documents</span>
              <span className="text-xs font-normal text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-full">
                {myDocuments.length}
              </span>
            </h3>
          </div>

          {myDocuments.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-3">
                <FolderOpen className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-slate-800 text-sm">
                No documents yet
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mb-4">
                You haven&apos;t created any documents. Click below to start your first document.
              </p>
              <NewDocumentButton />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {myDocuments.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  id={doc.id}
                  title={doc.title}
                  updatedAt={doc.updatedAt}
                  role="owner"
                  ownerName={doc.owner.name}
                  isOwner={true}
                />
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Shared With Me */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              <span>Shared with me</span>
              <span className="text-xs font-normal text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-full">
                {sharedWithMe.length}
              </span>
            </h3>
          </div>

          {sharedWithMe.length === 0 ? (
            <div className="bg-white/60 rounded-xl border border-slate-200/70 p-6 text-center text-xs text-slate-500">
              No documents shared with you yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {sharedWithMe.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  id={doc.id}
                  title={doc.title}
                  updatedAt={doc.updatedAt}
                  role={doc.role}
                  ownerName={doc.owner.name}
                  isOwner={false}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

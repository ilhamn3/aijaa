import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { FileText, LogOut, User, CheckCircle2 } from "lucide-react";
import LogoutButton from "./LogoutButton";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation Top Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 tracking-tight leading-tight">
              Ajaia
            </h1>
            <p className="text-xs text-slate-500">Document Editor</p>
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

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs mb-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Phase 1 Active: Authenticated as {user.name}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Custom signed httpOnly session cookie verified directly against Postgres.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  User ID: {user.id}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  Email: {user.email}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                  Session: Verified
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


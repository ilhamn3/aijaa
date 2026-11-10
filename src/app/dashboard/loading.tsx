import { FileText } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col animate-pulse">
      {/* Header Skeleton */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-200 rounded-lg" />
          <div className="space-y-1">
            <div className="w-16 h-4 bg-slate-200 rounded" />
            <div className="w-28 h-3 bg-slate-100 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-24 h-7 bg-slate-200 rounded-full" />
          <div className="w-20 h-7 bg-slate-200 rounded-lg" />
        </div>
      </header>

      {/* Main Skeleton */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-8">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200/80">
          <div className="space-y-2">
            <div className="w-32 h-6 bg-slate-200 rounded" />
            <div className="w-48 h-3 bg-slate-100 rounded" />
          </div>
          <div className="flex gap-2">
            <div className="w-28 h-9 bg-slate-200 rounded-xl" />
            <div className="w-32 h-9 bg-slate-200 rounded-xl" />
          </div>
        </div>

        {/* My Documents Grid Skeleton */}
        <div className="mb-10">
          <div className="w-32 h-4 bg-slate-200 rounded mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white border border-slate-200/80 rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg" />
                  <div className="space-y-1.5">
                    <div className="w-36 h-4 bg-slate-200 rounded" />
                    <div className="w-24 h-3 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="w-16 h-5 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}


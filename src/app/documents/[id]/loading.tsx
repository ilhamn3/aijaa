export default function DocumentLoading() {
  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden animate-pulse">
      {/* Editor Header Skeleton */}
      <header className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-200 rounded-lg" />
          <div className="w-8 h-8 bg-slate-200 rounded-lg" />
          <div className="space-y-1">
            <div className="w-48 h-5 bg-slate-200 rounded" />
            <div className="w-24 h-3 bg-slate-100 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-16 h-6 bg-slate-100 rounded-full" />
          <div className="w-16 h-7 bg-slate-200 rounded-lg" />
          <div className="w-8 h-8 bg-slate-200 rounded-full" />
        </div>
      </header>

      {/* Toolbar Skeleton */}
      <div className="h-10 bg-slate-100/90 border-b border-slate-200 px-3 py-1.5 flex items-center gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="w-6 h-6 bg-slate-200/80 rounded" />
        ))}
      </div>

      {/* Canvas Skeleton */}
      <div className="flex-1 py-8 px-4 sm:px-8 flex justify-center overflow-hidden">
        <div className="w-full max-w-4xl bg-white min-h-[850px] shadow-sm border border-slate-200/80 rounded-sm p-8 sm:p-14 space-y-4">
          <div className="w-2/3 h-8 bg-slate-200 rounded" />
          <div className="w-full h-4 bg-slate-100 rounded mt-6" />
          <div className="w-5/6 h-4 bg-slate-100 rounded" />
          <div className="w-4/5 h-4 bg-slate-100 rounded" />
          <div className="w-1/2 h-6 bg-slate-200 rounded mt-8" />
          <div className="w-full h-4 bg-slate-100 rounded" />
          <div className="w-3/4 h-4 bg-slate-100 rounded" />
        </div>
      </div>
    </div>
  );
}


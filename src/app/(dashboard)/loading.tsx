export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-24 bg-stone-200 rounded-full" />
        <div className="h-8 w-64 bg-stone-200 rounded-xl" />
        <div className="h-4 w-80 bg-stone-100 rounded-lg" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-6 bg-white rounded-2xl border border-stone-100">
            <div className="w-10 h-10 bg-stone-100 rounded-xl mb-3" />
            <div className="h-7 w-16 bg-stone-200 rounded-lg mb-2" />
            <div className="h-3 w-24 bg-stone-100 rounded-full" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6 space-y-4">
        <div className="h-5 w-40 bg-stone-200 rounded-lg" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3 border-b border-stone-50">
            <div className="w-10 h-10 bg-stone-100 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-48 bg-stone-200 rounded-full" />
              <div className="h-3 w-32 bg-stone-100 rounded-full" />
            </div>
            <div className="h-6 w-20 bg-stone-100 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

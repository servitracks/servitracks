export default function ServicesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="h-10 w-64 bg-neutral-100 rounded-lg" />
          <div className="h-4 w-48 bg-neutral-50 rounded" />
        </div>
        <div className="h-10 w-40 bg-neutral-100 rounded-lg" />
      </div>

      <div className="flex gap-3">
        <div className="h-10 flex-1 max-w-sm bg-neutral-100 rounded-full" />
        <div className="h-10 w-48 bg-neutral-100 rounded-full" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-32 rounded-xl border border-neutral-100 p-5 space-y-4">
            <div className="flex justify-between">
              <div className="space-y-2">
                <div className="h-4 w-20 bg-neutral-100 rounded" />
                <div className="h-5 w-40 bg-neutral-100 rounded" />
              </div>
              <div className="h-8 w-8 bg-neutral-100 rounded-full" />
            </div>
            <div className="flex justify-between items-end">
              <div className="h-4 w-24 bg-neutral-100 rounded" />
              <div className="h-8 w-20 bg-neutral-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

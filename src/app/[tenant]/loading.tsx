export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex items-end justify-between">
        <div>
          <div className="h-8 w-48 bg-neutral-100 rounded-lg" />
          <div className="h-4 w-72 bg-neutral-50 rounded mt-2" />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-32 bg-neutral-50 rounded-2xl border border-neutral-100" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-7">
        <div className="lg:col-span-4 h-[340px] bg-neutral-50 rounded-2xl border border-neutral-100" />
        <div className="lg:col-span-3 h-[340px] bg-neutral-50 rounded-2xl border border-neutral-100" />
      </div>
    </div>
  );
}

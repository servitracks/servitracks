export default function MaintenanceLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex justify-between">
        <div><div className="h-8 w-64 bg-neutral-100 rounded-lg" /><div className="h-4 w-80 bg-neutral-50 rounded mt-2" /></div>
      </div>
      <div className="flex gap-2">
        {[1,2,3,4].map(i => <div key={i} className="h-10 w-24 bg-neutral-50 rounded-full border border-neutral-100" />)}
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1,2,3].map(i => <div key={i} className="h-64 bg-neutral-50 rounded-2xl border border-neutral-100" />)}
      </div>
    </div>
  );
}

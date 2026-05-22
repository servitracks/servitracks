export default function ReportsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-neutral-100 rounded-lg" />
      <div className="grid gap-4 md:grid-cols-2">
        {[1,2,3,4].map(i => <div key={i} className="h-48 bg-neutral-50 rounded-2xl border border-neutral-100" />)}
      </div>
    </div>
  );
}

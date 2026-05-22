export default function RemindersLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-neutral-100 rounded-lg" />
      <div className="space-y-3">
        {[1,2,3,4].map(i => <div key={i} className="h-20 bg-neutral-50 rounded-2xl border border-neutral-100" />)}
      </div>
    </div>
  );
}

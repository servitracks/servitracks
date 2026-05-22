export default function InventoryLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between">
        <div><div className="h-8 w-40 bg-neutral-100 rounded-lg" /><div className="h-4 w-72 bg-neutral-50 rounded mt-2" /></div>
        <div className="h-10 w-40 bg-neutral-100 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[1,2].map(i => <div key={i} className="h-24 bg-neutral-50 rounded-2xl border border-neutral-100" />)}
      </div>
      <div className="space-y-3">
        {[1,2,3,4].map(i => <div key={i} className="h-16 bg-neutral-50 rounded-2xl border border-neutral-100" />)}
      </div>
    </div>
  );
}

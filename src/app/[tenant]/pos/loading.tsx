export default function PosLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-neutral-100 rounded-lg" />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 h-[400px] bg-neutral-50 rounded-2xl border border-neutral-100" />
        <div className="lg:col-span-4 h-[400px] bg-neutral-50 rounded-2xl border border-neutral-100" />
      </div>
    </div>
  );
}

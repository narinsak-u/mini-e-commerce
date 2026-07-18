export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="h-9 w-48 bg-muted rounded animate-pulse mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="rounded-xl border p-6 space-y-3">
            <div className="h-6 w-3/4 bg-muted rounded animate-pulse" />
            <div className="h-4 w-full bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="h-9 w-48 bg-muted rounded animate-pulse mb-6" />
      <div className="grid md:grid-cols-2 gap-12">
        <div className="aspect-square bg-muted rounded-lg animate-pulse" />
        <div className="space-y-4">
          <div className="h-9 w-3/4 bg-muted rounded animate-pulse" />
          <div className="h-5 w-24 bg-muted rounded animate-pulse" />
          <div className="h-8 w-32 bg-muted rounded animate-pulse mt-4" />
          <div className="h-20 w-full bg-muted rounded animate-pulse mt-4" />
          <div className="h-10 w-full bg-muted rounded animate-pulse mt-6" />
        </div>
      </div>
    </div>
  );
}

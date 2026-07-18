import { ProductGridSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="h-9 w-48 bg-muted rounded animate-pulse mb-6" />
      <div className="flex gap-4 mb-8">
        <div className="h-10 w-80 bg-muted rounded animate-pulse" />
        <div className="h-10 w-48 bg-muted rounded animate-pulse" />
        <div className="h-10 w-24 bg-muted rounded animate-pulse" />
      </div>
      <ProductGridSkeleton count={8} />
    </div>
  );
}

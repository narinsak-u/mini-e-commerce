import { ProductCard } from "./product-card";

interface Product {
  id: string; name: string; price: number; imageUrl: string | null; category?: { name: string };
}

export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) return <p className="text-muted-foreground py-8 text-center">No products found.</p>;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((p) => <ProductCard key={p.id} {...p} />)}
    </div>
  );
}

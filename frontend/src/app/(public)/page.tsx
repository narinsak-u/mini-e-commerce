import Link from "next/link";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { ProductGrid } from "@/components/product-grid";

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  category?: { name: string; slug: string };
}

async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const res = await api<{ data: Product[] }>("/products?limit=8&sortBy=createdAt&sortOrder=desc");
    return res.data;
  } catch { return []; }
}

export default async function HomePage() {
  const products = await getFeaturedProducts();

  return (
    <div>
      <section className="py-24 text-center bg-gradient-to-b from-stone-100 to-white">
        <h1 className="text-5xl font-bold mb-4">Welcome to ShopFlow</h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-lg mx-auto">Simple, clean e-commerce for modern shoppers.</p>
        <div className="flex gap-4 justify-center">
          <Link href="/products"><Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">Browse Products</Button></Link>
          <Link href="/categories"><Button variant="outline" size="lg" className="border-stone-300 text-stone-700 hover:bg-stone-100">Categories</Button></Link>
        </div>
      </section>
      {products.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-16">
          <h2 className="text-2xl font-semibold mb-6 text-stone-800">Latest Products</h2>
          <ProductGrid products={products} />
        </section>
      )}
    </div>
  );
}

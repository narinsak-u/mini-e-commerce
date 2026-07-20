import Image from "next/image";
import { api } from "@/lib/api";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

interface Product { id: string; name: string; description: string | null; price: number; stock: number; imageUrl: string | null; category?: { name: string } }

export default async function ProductDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const { id } = await paramsPromise;
  let product: Product;
  try { product = await api<Product>(`/products/${id}`); } catch { notFound(); }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-12">
        <div className="aspect-square bg-muted rounded-lg flex items-center justify-center text-6xl text-muted-foreground">
          {product.imageUrl ? <Image src={product.imageUrl} alt={product.name} width={600} height={600} className="object-cover w-full h-full rounded-lg" /> : "📦"}
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
          {product.category && <Badge variant="secondary">{product.category.name}</Badge>}
          <div className="flex items-center gap-2 mt-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} className={`size-4 ${i < 4 ? "fill-primary text-primary" : "text-muted-foreground"}`} />
            ))}
            <Badge variant="ghost" className="ml-1 text-xs">128 reviews</Badge>
          </div>
          <p className="text-3xl font-bold text-primary mt-4">${Number(product.price).toFixed(2)}</p>
          <p className="text-muted-foreground mt-4">{product.description || "No description available."}</p>
          <div className="mt-4">
            {product.stock > 0 ? (
              <Badge variant="default" className="text-sm h-6 px-3">
                In stock ({product.stock} available)
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-sm h-6 px-3">
                Out of stock
              </Badge>
            )}
          </div>
          <AddToCartButton productId={product.id} disabled={product.stock === 0} />
        </div>
      </div>
    </div>
  );
}

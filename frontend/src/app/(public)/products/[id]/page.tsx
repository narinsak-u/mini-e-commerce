import Image from "next/image";
import { api } from "@/lib/api";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { Badge } from "@/components/ui/badge";

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
          <p className="text-3xl font-semibold mt-4">${Number(product.price).toFixed(2)}</p>
          <p className="text-muted-foreground mt-4">{product.description || "No description available."}</p>
          <div className="mt-4 text-sm">
            {product.stock > 0 ? <span className="text-accent font-medium">In stock ({product.stock} available)</span> : <span className="text-destructive font-medium">Out of stock</span>}
          </div>
          <AddToCartButton productId={product.id} disabled={product.stock === 0} />
        </div>
      </div>
    </div>
  );
}

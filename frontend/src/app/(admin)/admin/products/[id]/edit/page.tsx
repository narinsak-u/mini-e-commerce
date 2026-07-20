import { api } from "@/lib/api";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/product-form";

interface Category { id: string; name: string }
interface Product { id: string; name: string; price: number; description: string | null; stock: number; imageUrl: string | null; categoryId: string | null }

export default async function AdminEditProductPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const { id } = await paramsPromise;
  const [productResult, categoriesResult] = await Promise.all([
    api<Product>(`/products/${id}`).catch(() => null),
    api<{ data: Category[] }>("/categories").catch(() => ({ data: [] })),
  ]);
  if (!productResult) notFound();
  const product = productResult;
  const categories = categoriesResult.data;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Edit Product</h1>
      <ProductForm product={product} categories={categories} />
    </div>
  );
}

import { api } from "@/lib/api";
import { ProductGrid } from "@/components/product-grid";
import { ProductSearch } from "@/components/product-search";

interface PageProps { searchParams: Promise<{ q?: string; page?: string; categoryId?: string; sortBy?: string }> }

interface Product { id: string; name: string; price: number; imageUrl: string | null; category?: { name: string } }
interface Category { id: string; name: string }

export default async function ProductsPage({ searchParams: searchParamsPromise }: PageProps) {
  const searchParams = await searchParamsPromise;
  const params = new URLSearchParams();
  if (searchParams.q) params.set("search", searchParams.q);
  if (searchParams.page) params.set("page", searchParams.page);
  if (searchParams.categoryId) params.set("categoryId", searchParams.categoryId);
  if (searchParams.sortBy) params.set("sortBy", searchParams.sortBy);

  const [productsRes, categories] = await Promise.all([
    api<{ data: Product[]; total: number; page: number }>(`/products?${params}`),
    api<{ data: Category[] }>("/categories").catch(() => ({ data: [] })),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Products</h1>
      <ProductSearch categories={categories.data} />
      <ProductGrid products={productsRes.data} />
    </div>
  );
}

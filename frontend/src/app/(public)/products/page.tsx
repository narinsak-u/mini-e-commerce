import { Suspense } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/product-grid";
import { ProductSearch } from "@/components/product-search";
import { Pagination } from "@/components/ui/pagination";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    categoryId?: string;
    sortBy?: string;
  }>;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  imageUrl: string | null;
  category?: { name: string };
}
interface Category {
  id: string;
  name: string;
}

const PAGE_SIZE = 12;

export default async function ProductsPage({
  searchParams: searchParamsPromise,
}: PageProps) {
  const searchParams = await searchParamsPromise;
  const params = new URLSearchParams();
  if (searchParams.q) params.set("search", searchParams.q);
  if (searchParams.page) params.set("page", searchParams.page);
  if (searchParams.categoryId) params.set("categoryId", searchParams.categoryId);
  if (searchParams.sortBy) params.set("sortBy", searchParams.sortBy);
  params.set("limit", String(PAGE_SIZE));

  const [productsRes, categories] = await Promise.all([
    api<{
      data: Product[];
      total: number;
      page: number;
      limit: number;
    }>(`/products?${params}`),
    api<{ data: Category[] }>("/categories").catch(() => ({ data: [] })),
  ]);

  const currentPage = productsRes.page;
  const totalPages = Math.ceil(productsRes.total / productsRes.limit);

  return (
    <div>
      {/* Hero */}
      <section className="bg-muted py-16 text-center">
        <h1 className="text-4xl font-bold mb-4">Engineering Excellence</h1>
        <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
          Precision-crafted products built for reliability, performance, and
          longevity. Every item in our collection meets rigorous quality
          standards.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/products">
            <Button size="lg">Shop Now</Button>
          </Link>
          <Link href="/categories">
            <Button variant="outline" size="lg">
              Browse Categories
            </Button>
          </Link>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Suspense fallback={<div className="h-[40px]" />}>
          <ProductSearch categories={categories.data} />
        </Suspense>
        <ProductGrid products={productsRes.data} />
        <Pagination currentPage={currentPage} totalPages={totalPages} />
      </div>
    </div>
  );
}

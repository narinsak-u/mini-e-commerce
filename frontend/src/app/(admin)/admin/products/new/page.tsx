import { api } from "@/lib/api";
import { ProductForm } from "@/components/product-form";

interface Category { id: string; name: string }

export default async function AdminNewProductPage() {
  let categories: Category[] = [];
  try { const res = await api<{ data: Category[] }>("/categories"); categories = res.data; } catch {}

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">New Product</h1>
      <ProductForm categories={categories} />
    </div>
  );
}

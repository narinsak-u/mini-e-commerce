"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface ProductFormProps {
  product?: { id: string; name: string; price: number; description: string | null; stock: number; imageUrl: string | null; categoryId: string | null };
  categories: Array<{ id: string; name: string }>;
}

export function ProductForm({ product, categories }: ProductFormProps) {
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(String(product?.price ?? ""));
  const [description, setDescription] = useState(product?.description ?? "");
  const [stock, setStock] = useState(String(product?.stock ?? ""));
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { name, price: Number(price), description, stock: Number(stock), imageUrl, categoryId: categoryId || undefined };
      if (product) {
        await api(`/products/${product.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        toast.success("Product updated");
      } else {
        await api("/products", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Product created");
      }
      router.push("/admin/products");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save product");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-lg">
      <CardHeader><CardTitle>{product ? "Edit Product" : "New Product"}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input id="price" type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock">Stock</Label>
            <Input id="stock" type="number" value={stock} onChange={e => setStock(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="imageUrl">Image URL</Label>
            <Input id="imageUrl" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="categoryId">Category</Label>
            <select id="categoryId" value={categoryId} onChange={e => setCategoryId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">None</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : product ? "Update Product" : "Create Product"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

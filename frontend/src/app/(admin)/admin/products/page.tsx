import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Product { id: string; name: string; price: number; stock: number; isActive: boolean }

export default async function AdminProductsPage() {
  let products: Product[] = [];
  try { const res = await api<{ data: Product[] }>("/products"); products = res.data; } catch (e) { console.error("Failed to load products", e); }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Products</h1>
        <Link href="/admin/products/new"><Button>New Product</Button></Link>
      </div>
      <Card>
        <CardHeader><CardTitle>All Products</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="pb-3 font-medium">Name</th><th className="pb-3 font-medium">Price</th><th className="pb-3 font-medium">Stock</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium"></th></tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-3">{p.name}</td>
                  <td className="py-3">{"$" + Number(p.price).toFixed(2)}</td>
                  <td className="py-3">{p.stock}</td>
                  <td className="py-3">
                    <Badge variant={p.isActive ? "default" : "secondary"}>{p.isActive ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="py-3">
                    <Link href={`/admin/products/${p.id}/edit`} className="text-primary underline text-xs">Edit</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

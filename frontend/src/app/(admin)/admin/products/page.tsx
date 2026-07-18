import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Product { id: string; name: string; price: number; stock: number; isActive: boolean }

export default async function AdminProductsPage() {
  let products: Product[] = [];
  try { const res = await api<{ data: Product[] }>("/products"); products = res.data; } catch {}

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Products</h1>
      <Card>
        <CardHeader><CardTitle>All Products</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="pb-3 font-medium">Name</th><th className="pb-3 font-medium">Price</th><th className="pb-3 font-medium">Stock</th><th className="pb-3 font-medium">Status</th></tr></thead>
            <tbody>{products.map((p) => (<tr key={p.id} className="border-b"><td className="py-3">{p.name}</td><td className="py-3">${Number(p.price).toFixed(2)}</td><td className="py-3">{p.stock}</td><td className="py-3"><Badge variant={p.isActive ? "default" : "secondary"}>{p.isActive ? "Active" : "Inactive"}</Badge></td></tr>))}</tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

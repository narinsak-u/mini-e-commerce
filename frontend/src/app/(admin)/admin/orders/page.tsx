import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderStatusSelect } from "@/components/order-status-select";

interface Order { id: string; status: string; totalAmount: number; createdAt: string }

export default async function AdminOrdersPage() {
  let orders: Order[] = [];
  try { const res = await api<{ data: Order[] }>("/admin/orders"); orders = res.data; } catch { console.error("Failed to load orders"); }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Orders</h1>
      <Card>
        <CardHeader><CardTitle>All Orders</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-3 font-medium">ID</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Total</th>
                <th className="pb-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b">
                  <td className="py-3 font-mono">{o.id.slice(0, 8)}</td>
                  <td className="py-3"><OrderStatusSelect orderId={o.id} currentStatus={o.status} /></td>
                  <td className="py-3">{"$" + Number(o.totalAmount).toFixed(2)}</td>
                  <td className="py-3">{new Date(o.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

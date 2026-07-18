import { api } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CancelOrderButton } from "@/components/cancel-order-button";

interface OrderItem { productName: string; quantity: number; productPrice: number; subtotal: number }
interface Order { id: string; status: string; totalAmount: number; createdAt: string; items: OrderItem[] }

export default async function OrderDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const { id } = await paramsPromise;
  const [session, order] = await Promise.all([
    getSession(),
    api<Order>(`/orders/${id}`).catch(() => { notFound(); }),
  ]);
  if (!session) redirect("/auth/login");

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Order #{order.id.slice(0, 8)}</h1>
          <Badge className="mt-2">{order.status}</Badge>
        </div>
        {order.status === "pending" && <CancelOrderButton orderId={order.id} disabled={false} />}
      </div>
      <Card>
        <CardHeader><CardTitle>Items</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {order.items.map((item, i) => (
            <div key={`${item.productName}-${i}`}>
              <div className="flex justify-between"><span>{item.productName} × {item.quantity}</span><span>${Number(item.subtotal).toFixed(2)}</span></div>
              <Separator />
            </div>
          ))}
          <div className="flex justify-between font-bold"><span>Total</span><span>${Number(order.totalAmount).toFixed(2)}</span></div>
        </CardContent>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { api } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Order { id: string; status: string; totalAmount: number; createdAt: string }

export default async function OrdersPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  let orders: Order[] = [];
  try {
    const res = await api<{ data: Order[] }>("/orders");
    orders = res.data;
  } catch (e) { console.error("Failed to load orders", e); }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My Orders</h1>
      {orders.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No orders yet.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
                    <p className="font-medium">${Number(order.totalAmount).toFixed(2)}</p>
                  </div>
                  <Badge variant={order.status === "completed" || order.status === "paid" ? "default" : "secondary"}>{order.status}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { api } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
}

function statusBadgeVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "completed":
      return "default";
    case "cancelled":
      return "destructive";
    case "paid":
    case "packing":
    case "shipping":
      return "outline";
    default:
      return "secondary";
  }
}


export default async function OrdersPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  let orders: Order[] = [];
  try {
    const res = await api<{ data: Order[] }>("/orders");
    orders = res.data;
  } catch (e) {
    console.error("Failed to load orders", e);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">My Orders</h1>
        <span className="text-sm text-muted-foreground">
          {orders.length} {orders.length === 1 ? "order" : "orders"}
        </span>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <Package className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">No orders yet.</p>
            <Link
              href="/"
              className="text-sm text-primary hover:underline"
            >
              Start shopping
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <Card className="transition-all hover:shadow-md hover:ring-primary/20 cursor-pointer">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    {/* Status indicator dot */}
                    <span
                      className={cn(
                        "w-2.5 h-2.5 rounded-full shrink-0",
                        order.status === "completed" && "bg-accent",
                        order.status === "cancelled" && "bg-destructive",
                        (order.status === "paid" ||
                          order.status === "packing" ||
                          order.status === "shipping") &&
                          "bg-primary",
                        order.status === "pending" && "bg-muted-foreground"
                      )}
                    />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground/60 font-mono mt-0.5">
                        #{order.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <span className="font-semibold">
                      ${Number(order.totalAmount).toFixed(2)}
                    </span>
                    <Badge
                      variant={statusBadgeVariant(order.status)}
                      className={cn(
                        "capitalize text-xs px-3 py-1 h-auto",
                        order.status === "pending" &&
                          "bg-secondary/20 text-secondary border-secondary/20"
                      )}
                    >
                      {order.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

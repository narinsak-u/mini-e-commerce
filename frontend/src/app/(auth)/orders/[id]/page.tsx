import { api } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CancelOrderButton } from "@/components/cancel-order-button";
import {
  Clock,
  CreditCard,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderItem {
  productName: string;
  quantity: number;
  productPrice: number;
  subtotal: number;
}
interface Order {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
}

// ── Status step definitions matching Stitch flow ─────────────────
const STATUS_STEPS = [
  { key: "pending", label: "Pending", icon: Clock },
  { key: "paid", label: "Paid", icon: CreditCard },
  { key: "packing", label: "Packing", icon: Package },
  { key: "shipping", label: "Shipping", icon: Truck },
  { key: "completed", label: "Completed", icon: CheckCircle2 },
] as const;

function getStepIndex(status: string): number {
  return STATUS_STEPS.findIndex((s) => s.key === status);
}

function getEstimatedDelivery(createdAt: string): string {
  const date = new Date(createdAt);
  date.setDate(date.getDate() + 5);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// ── Event location mapping ───────────────────────────────────────
const EVENT_DETAILS: Record<
  string,
  { location: string; description: string }
> = {
  pending: {
    location: "Order Received",
    description: "Your order has been placed successfully",
  },
  paid: {
    location: "Payment Processed",
    description: "Payment has been confirmed",
  },
  packing: {
    location: "Fulfillment Center",
    description: "Items are being prepared for shipment",
  },
  shipping: {
    location: "In Transit",
    description: "Package is on its way",
  },
  completed: {
    location: "Delivered",
    description: "Package has been delivered",
  },
};

interface OrderEvent {
  event: string;
  location: string;
  description: string;
  timestamp: string;
  status: "Completed" | "In Progress" | "Pending" | "Cancelled";
}

function buildEvents(
  orderStatus: string,
  createdAt: string
): OrderEvent[] {
  const events: OrderEvent[] = [];
  const currentIdx = getStepIndex(orderStatus);

  if (orderStatus === "cancelled") {
    const pendingDetail = EVENT_DETAILS["pending"];
    events.push({
      event: "Pending",
      location: pendingDetail.location,
      description: pendingDetail.description,
      timestamp: new Date(createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      status: "Completed",
    });
    events.push({
      event: "Cancelled",
      location: "Order Cancelled",
      description: "This order has been cancelled",
      timestamp: "\u2014",
      status: "Cancelled",
    });
    return events;
  }

  for (let i = 0; i < STATUS_STEPS.length; i++) {
    const step = STATUS_STEPS[i];
    const detail = EVENT_DETAILS[step.key];
    const isCurrent = i === currentIdx;
    const isCompleted = i < currentIdx;

    events.push({
      event: step.label,
      location: detail?.location ?? "\u2014",
      description: detail?.description ?? "\u2014",
      timestamp:
        i === 0
          ? new Date(createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "\u2014",
      status: isCompleted
        ? "Completed"
        : isCurrent
          ? "In Progress"
          : "Pending",
    });
  }

  return events;
}

// ── Status badge variant helper ──────────────────────────────────
function statusBadgeVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" | "ghost" {
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


// ═════════════════════════════════════════════════════════════════
//  Page Component
// ═════════════════════════════════════════════════════════════════
export default async function OrderDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await paramsPromise;
  const session = await getSession();
  if (!session) redirect("/auth/login");
  const order = await api<Order>(`/orders/${id}`).catch(() => {
    notFound();
    return undefined as never;
  });

  const currentIdx = getStepIndex(order.status);
  const isCancelled = order.status === "cancelled";
  const events = buildEvents(order.status, order.createdAt);
  const showEstimated =
    !isCancelled && (order.status === "shipping" || order.status === "completed" || order.status === "packing");

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* ── Order Header ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Order #{order.id.slice(0, 8)}
          </h1>
          <p className="text-sm text-muted-foreground">
            Placed{" "}
            {new Date(order.createdAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <Link
            href={`/api/orders/${order.id}/invoice`}
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <Download className="w-4 h-4" />
            Download Invoice
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={statusBadgeVariant(order.status)} className="capitalize text-xs px-3 py-1 h-auto">
            {order.status}
          </Badge>
        {["pending", "paid"].includes(order.status) && (
            <CancelOrderButton orderId={order.id} disabled={false} />
          )}
        </div>
      </div>

      {/* ── Progress Stepper ─────────────────────────────── */}
      <Card>
        <CardContent className="pt-6 pb-5">
          {isCancelled ? (
            <div className="space-y-4">
              {/* Show partial progress up to pending, then cancelled state */}
              <div className="flex items-center gap-0">
                {STATUS_STEPS.map((step, i) => {
                  const Icon = step.icon;
                  const isPast = i <= 0;

                  return (
                    <div key={step.key} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center">
                        <div
                          className={cn(
                            "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                            isPast
                              ? "bg-accent border-accent text-white"
                              : "border-border text-muted-foreground"
                          )}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <span
                          className={cn(
                            "text-xs mt-1.5 font-medium",
                            isPast ? "text-accent" : "text-muted-foreground"
                          )}
                        >
                          {step.label}
                        </span>
                      </div>
                      {i < STATUS_STEPS.length - 1 && (
                        <div
                          className={cn(
                            "flex-1 h-0.5 mx-2 rounded-full",
                            i < 0 ? "bg-accent" : "bg-border"
                          )}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Cancelled indicator */}
              <div className="flex justify-center pt-1">
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="w-5 h-5" />
                  <span className="text-sm font-semibold">Order Cancelled</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-0">
                {STATUS_STEPS.map((step, i) => {
                  const Icon = step.icon;
                  const isCompleted = i < currentIdx;
                  const isCurrent = i === currentIdx;

                  return (
                    <div key={step.key} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center">
                        <div
                          className={cn(
                            "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                            isCompleted &&
                              "bg-primary border-primary text-primary-foreground",
                            isCurrent &&
                              "border-primary text-primary",
                            !isCompleted &&
                              !isCurrent &&
                              "border-border text-muted-foreground"
                          )}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <span
                          className={cn(
                            "text-xs mt-1.5 font-medium",
                            (isCompleted || isCurrent) && "text-primary",
                            isCurrent && "font-semibold",
                            !isCompleted && !isCurrent && "text-muted-foreground"
                          )}
                        >
                          {step.label}
                        </span>
                      </div>
                      {i < STATUS_STEPS.length - 1 && (
                        <div
                          className={cn(
                            "flex-1 h-0.5 mx-2 rounded-full",
                            i < currentIdx ? "bg-primary" : "bg-border"
                          )}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {showEstimated && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Estimated delivery:{" "}
                  <span className="font-medium text-foreground">
                    {getEstimatedDelivery(order.createdAt)}
                  </span>
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Events Table ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Order Timeline</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Event
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Location
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                    Description
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {events.map((evt) => (
                  <tr
                    key={evt.event}
                    className={cn(
                      "transition-colors",
                      evt.status === "In Progress" && "bg-primary/[0.03]"
                    )}
                  >
                    <td className="px-4 py-3 font-medium">{evt.event}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {evt.location}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {evt.description}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {evt.timestamp}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={cn(
                          "inline-flex items-center text-xs font-medium",
                          evt.status === "Completed" && "text-accent",
                          evt.status === "In Progress" && "text-primary",
                          evt.status === "Pending" && "text-muted-foreground",
                          evt.status === "Cancelled" && "text-destructive"
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block w-2 h-2 rounded-full mr-1.5",
                            evt.status === "Completed" && "bg-accent",
                            evt.status === "In Progress" && "bg-primary",
                            evt.status === "Pending" && "bg-muted-foreground",
                            evt.status === "Cancelled" && "bg-destructive"
                          )}
                        />
                        {evt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Items Card ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.items.map((item) => (
            <div key={item.productName}>
              <div className="flex justify-between text-sm">
                <span>
                  {item.productName}{" "}
                  <span className="text-muted-foreground">
                    &times; {item.quantity}
                  </span>
                </span>
                <span className="font-medium">
                  ${Number(item.subtotal).toFixed(2)}
                </span>
              </div>
              <Separator className="mt-3" />
            </div>
          ))}
          <div className="flex justify-between text-base font-bold pt-2">
            <span>Total</span>
            <span>${Number(order.totalAmount).toFixed(2)}</span>
          </div>
        </CardContent>
        {order.status === "pending" && (
          <div className="px-(--card-spacing) pb-(--card-spacing)">
            <Separator className="mb-4" />
            <CancelOrderButton orderId={order.id} disabled={false} />
          </div>
        )}
      </Card>
    </div>
  );
}

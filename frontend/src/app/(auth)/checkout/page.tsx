"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface CartItem { productId: string; quantity: number; name: string; price: number }
interface Cart { items: CartItem[]; total: number }
interface Order { id: string }

export default function CheckoutPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    api<Cart>("/cart").then(setCart).catch(() => setCart({ items: [], total: 0 }));
  }, []);

  async function handleCheckout() {
    setLoading(true);
    try {
      const order = await api<Order>("/checkout", { method: "POST" });
      toast.success("Order placed!");
      router.push(`/orders/${order.id}`);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  if (!cart) return <div className="max-w-2xl mx-auto px-4 py-8"><p>Loading...</p></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>
      <Card>
        <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {cart.items.map((item) => (
            <div key={item.productId}>
              <div className="flex justify-between"><span>{item.name} × {item.quantity}</span><span>${(item.price * item.quantity).toFixed(2)}</span></div>
              <Separator />
            </div>
          ))}
          <div className="flex justify-between text-lg font-bold"><span>Total</span><span>${Number(cart.total).toFixed(2)}</span></div>
          <Button onClick={handleCheckout} disabled={loading || cart.items.length === 0} className="w-full">
            {loading ? "Processing..." : "Place Order"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

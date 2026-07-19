"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useCart, useCheckout } from "@/lib/hooks/use-api";

export default function CheckoutPage() {
  const { data: cart, isLoading } = useCart();
  const checkout = useCheckout();
  const router = useRouter();

  async function handleCheckout() {
    try {
      const order = await checkout.mutateAsync();
      toast.success("Order placed!");
      router.push(`/orders/${order.id}`);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    }
  }

  if (isLoading || !cart) return <div className="max-w-2xl mx-auto px-4 py-8"><p>Loading...</p></div>;

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
          <Button onClick={handleCheckout} disabled={checkout.isPending || cart.items.length === 0} className="w-full">
            {checkout.isPending ? "Processing..." : "Place Order"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

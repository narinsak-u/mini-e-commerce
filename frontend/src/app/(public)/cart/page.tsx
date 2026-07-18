"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface CartItem { productId: string; quantity: number; name: string; price: number; imageUrl: string | null }
interface Cart { items: CartItem[]; total: number }

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Cart>("/cart").then(setCart).catch(() => setCart({ items: [], total: 0 })).finally(() => setLoading(false));
  }, []);

  async function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      try {
        const updated = await api<Cart>(`/cart/items/${productId}`, { method: "DELETE" });
        setCart(updated);
      } catch { toast.error("Failed to remove item"); }
      return;
    }
    try {
      const updated = await api<Cart>(`/cart/items/${productId}`, { method: "PATCH", body: JSON.stringify({ quantity }) });
      setCart(updated);
    } catch { toast.error("Failed to update quantity"); }
  }

  async function clearCart() {
    try { await api("/cart", { method: "DELETE" }); setCart({ items: [], total: 0 }); toast.success("Cart cleared"); }
    catch { toast.error("Failed to clear cart"); }
  }

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-8"><p>Loading...</p></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Cart</h1>
        {cart && cart.items.length > 0 && <Button variant="outline" onClick={clearCart}>Clear Cart</Button>}
      </div>
      {!cart || cart.items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Your cart is empty. <Link href="/products" className="text-primary underline">Browse products</Link></CardContent></Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>{cart.items.length} item{cart.items.length !== 1 ? "s" : ""}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {cart.items.map((item) => (
              <div key={item.productId}>
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">{item.name}</p><p className="text-sm text-muted-foreground">${Number(item.price).toFixed(2)} each</p></div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.productId, item.quantity - 1)}>−</Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.productId, item.quantity + 1)}>+</Button>
                    </div>
                    <p className="w-24 text-right font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => updateQuantity(item.productId, 0)}>✕</Button>
                  </div>
                </div>
                <Separator />
              </div>
            ))}
            <div className="flex items-center justify-between pt-4">
              <p className="text-lg font-bold">Total</p>
              <p className="text-lg font-bold">${Number(cart.total).toFixed(2)}</p>
            </div>
            <Link href="/checkout"><Button className="w-full mt-4">Proceed to Checkout</Button></Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

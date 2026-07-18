"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function AddToCartButton({ productId, disabled }: { productId: string; disabled: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleAdd() {
    setLoading(true);
    try {
      await api("/cart/items", { method: "POST", body: JSON.stringify({ productId, quantity: 1 }) });
      toast.success("Added to cart");
      router.refresh();
    } catch {
      toast.error("Failed to add to cart");
    } finally {
      setLoading(false);
    }
  }

  return <Button onClick={handleAdd} disabled={disabled || loading} className="mt-6 w-full">{loading ? "Adding..." : "Add to Cart"}</Button>;
}

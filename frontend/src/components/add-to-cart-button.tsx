"use client";

import { useAddToCart } from "@/lib/hooks/use-api";
import { Button } from "@/components/ui/button";

export function AddToCartButton({ productId, disabled }: { productId: string; disabled: boolean }) {
  const addToCart = useAddToCart();

  return (
    <Button onClick={() => addToCart.mutate(productId)} disabled={disabled || addToCart.isPending} className="mt-6 w-full">
      {addToCart.isPending ? "Adding..." : "Add to Cart"}
    </Button>
  );
}

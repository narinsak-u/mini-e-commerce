"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function CancelOrderButton({ orderId, disabled }: { orderId: string; disabled: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleCancel() {
    if (!confirm("Cancel this order?")) return;
    setLoading(true);
    try {
      await api(`/orders/${orderId}/cancel`, { method: "POST" });
      toast.success("Order cancelled");
      router.refresh();
    } catch {
      toast.error("Failed to cancel order");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="destructive" onClick={handleCancel} disabled={disabled || loading}>
      {loading ? "Cancelling..." : "Cancel Order"}
    </Button>
  );
}

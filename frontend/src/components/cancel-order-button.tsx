"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { queryKeys } from "@/lib/hooks/use-api";

export function CancelOrderButton({ orderId, disabled }: { orderId: string; disabled: boolean }) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const cancel = useMutation({
    mutationFn: () => api(`/orders/${orderId}/cancel`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Order cancelled");
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      router.refresh();
    },
    onError: () => toast.error("Failed to cancel order"),
  });

  async function handleCancel() {
    if (!confirm("Cancel this order?")) return;
    cancel.mutate();
  }

  return (
    <Button variant="destructive" onClick={handleCancel} disabled={disabled || cancel.isPending}>
      {cancel.isPending ? "Cancelling..." : "Cancel Order"}
    </Button>
  );
}

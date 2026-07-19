"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { queryKeys } from "@/lib/hooks/use-api";

const STATUSES = ["pending", "paid", "packing", "shipping", "completed", "cancelled"] as const;

export function OrderStatusSelect({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus);
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: (newStatus: string) =>
      api(`/orders/${orderId}`, { method: "PATCH", body: JSON.stringify({ status: newStatus }) }),
    onSuccess: (_data, newStatus) => {
      toast.success(`Order ${orderId.slice(0, 8)} → ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders });
    },
    onError: () => {
      setStatus(currentStatus);
      toast.error("Failed to update status");
    },
  });

  async function handleChange(newStatus: string) {
    setStatus(newStatus);
    updateStatus.mutate(newStatus);
  }

  return (
    <select
      value={status}
      onChange={e => handleChange(e.target.value)}
      disabled={updateStatus.isPending}
      aria-label="Order status"
      className="h-7 text-xs rounded border border-input bg-background px-2 cursor-pointer"
    >
      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

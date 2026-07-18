"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";

const STATUSES = ["pending", "paid", "packing", "shipping", "completed", "cancelled"] as const;

export function OrderStatusSelect({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleChange(newStatus: string) {
    setSaving(true);
    setStatus(newStatus);
    try {
      await api(`/orders/${orderId}`, { method: "PATCH", body: JSON.stringify({ status: newStatus }) });
      toast.success(`Order ${orderId.slice(0, 8)} → ${newStatus}`);
      router.refresh();
    } catch {
      setStatus(currentStatus);
      toast.error("Failed to update status");
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={status}
      onChange={e => handleChange(e.target.value)}
      disabled={saving}
      className="h-7 text-xs rounded border border-input bg-background px-2 cursor-pointer"
    >
      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

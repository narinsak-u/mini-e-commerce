"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface Category { id: string; name: string }

export function ProductSearch({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    const q = form.get("q") as string;
    const categoryId = form.get("categoryId") as string;
    if (q) params.set("q", q);
    if (categoryId && categoryId !== "all") params.set("categoryId", categoryId);
    router.push(`/products?${params}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-4 mb-8">
      <Input name="q" placeholder="Search products..." defaultValue={searchParams.get("q") || ""} className="max-w-sm" />
      <Select name="categoryId" defaultValue={searchParams.get("categoryId") || "all"}>
        <SelectTrigger className="w-48"><SelectValue placeholder="All categories" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button type="submit">Search</Button>
    </form>
  );
}

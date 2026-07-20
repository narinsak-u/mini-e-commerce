"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
}

export function Pagination({ currentPage, totalPages }: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function createPageURL(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }
    return `${pathname}?${params.toString()}`;
  }

  // Build visible page list with ellipsis
  const pages: (number | "ellipsis")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    if (start > 2) pages.push("ellipsis");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push("ellipsis");
    pages.push(totalPages);
  }

  return (
    <nav className="flex items-center justify-center gap-2 mt-8" aria-label="Pagination">
      {currentPage > 1 ? (
        <Link href={createPageURL(currentPage - 1)}>
          <Button variant="outline" size="sm">
            Previous
          </Button>
        </Link>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Previous
        </Button>
      )}

      {pages.map((page) =>
        page === "ellipsis" ? (
          <span key="ellipsis" className="px-1 text-muted-foreground select-none">
            ...
          </span>
        ) : (
          <Link key={page} href={createPageURL(page)}>
            <Button variant={page === currentPage ? "default" : "outline"} size="sm">
              {page}
            </Button>
          </Link>
        ),
      )}

      {currentPage < totalPages ? (
        <Link href={createPageURL(currentPage + 1)}>
          <Button variant="outline" size="sm">
            Next
          </Button>
        </Link>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Next
        </Button>
      )}
    </nav>
  );
}

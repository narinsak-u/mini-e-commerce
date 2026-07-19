"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Bell, User, LogOut, LayoutDashboard } from "lucide-react";
import { useAuthStore } from "@/lib/store";

export function NavBar() {
  const session = useAuthStore((s) => s.session);

  return (
    <nav className="border-b">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold">ShopFlow</Link>
        <div className="flex items-center gap-4">
          <Link href="/products"><Button variant="ghost">Products</Button></Link>
          <Link href="/categories"><Button variant="ghost">Categories</Button></Link>
          {session ? (
            <>
              <Link href="/cart"><Button variant="ghost" size="icon"><ShoppingCart className="h-5 w-5" /></Button></Link>
              <Link href="/notifications"><Button variant="ghost" size="icon"><Bell className="h-5 w-5" /></Button></Link>
              <Link href="/orders"><Button variant="ghost" size="icon"><User className="h-5 w-5" /></Button></Link>
              {session.role === "admin" && <Link href="/admin/dashboard"><Button variant="ghost" size="icon"><LayoutDashboard className="h-5 w-5" /></Button></Link>}
              <form action="/api/auth/logout" method="post"><Button variant="ghost" size="icon" type="submit"><LogOut className="h-5 w-5" /></Button></form>
            </>
          ) : (
            <>
              <Link href="/auth/login"><Button variant="ghost">Login</Button></Link>
              <Link href="/auth/register"><Button>Register</Button></Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

# Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js 16 frontend that integrates with the ShopFlow backend API for e-commerce (products, cart, checkout, orders, admin).

**Architecture:** Server-first — Server Components for public read pages, Client Components only where interactivity required (forms, cart mutations). httpOnly cookie for JWT auth. Thin `fetch` wrapper as API client. shadcn/ui for components, Tailwind CSS 4 for styling.

**Tech Stack:** Next.js 16, Tailwind CSS 4, shadcn/ui, React 19

---

### Task 1: Scaffold Next.js project and install dependencies

**Files:**
- Delete: `frontend/` (entire existing Vite project)
- Create: `frontend/` (new Next.js project)

- [ ] **Step 1: Remove existing Vite frontend**

```powershell
Remove-Item -Path "D:\Github\mini-e-commerce\frontend" -Recurse -Force
```

- [ ] **Step 2: Create Next.js 16 project**

Run: `cd D:\Github\mini-e-commerce && npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --no-import-alias --use-npm`

Expected: New `frontend/` directory with Next.js 16, Tailwind CSS 4, App Router.

- [ ] **Step 3: Install shadcn**

Run: `cd D:\Github\mini-e-commerce\frontend && npx shadcn@latest init -d --force`

Expected: shadcn initialized with default config, `components.json` created.

- [ ] **Step 4: Install shadcn components needed for the entire app**

Run:
```powershell
cd D:\Github\mini-e-commerce\frontend
$components = @("button","card","input","label","table","badge","dialog","sheet","dropdown-menu","select","pagination","sonner","skeleton","separator","avatar","form","toast")
foreach ($c in $components) { npx shadcn@latest add $c -y }
```

Expected: All components added under `src/components/ui/`.

- [ ] **Step 5: Set up Inter font**

The Next.js 16 scaffold should already include Inter (default). Verify `src/app/layout.tsx` imports Inter from `next/font/google`.

- [ ] **Step 6: Commit**

```bash
cd D:\Github\mini-e-commerce
git add frontend/
git commit -m "feat(frontend): scaffold Next.js 16 with shadcn and Tailwind CSS 4"
```

---

### Task 2: Create API client and auth utilities

**Files:**
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/auth.ts`

- [ ] **Step 1: Create api.ts**

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { code: "UNKNOWN", message: res.statusText } }));
    throw new ApiError(res.status, body.error?.code || "UNKNOWN", body.error?.message || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
```

- [ ] **Step 2: Create auth.ts**

```typescript
import { cookies } from "next/headers";

export interface Session {
  sub: string;
  role: string;
}

export function getSession(): Session | null {
  const token = cookies().get("token")?.value;
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    if (payload.exp * 1000 < Date.now()) return null;
    return { sub: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

export function isAdmin(): boolean {
  return getSession()?.role === "admin";
}
```

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add frontend/src/lib/
git commit -m "feat(frontend): add API client and auth utilities"
```

---

### Task 3: Create layouts

**Files:**
- Create: `frontend/src/app/(public)/layout.tsx`
- Create: `frontend/src/app/(public)/page.tsx`
- Create: `frontend/src/app/(auth)/layout.tsx`
- Create: `frontend/src/app/(admin)/layout.tsx`
- Create: `frontend/src/components/nav-bar.tsx`
- Create: `frontend/src/components/footer.tsx`
- Create: `frontend/src/components/admin-sidebar.tsx`
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Update root layout**

```typescript
// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ShopFlow",
  description: "Mini e-commerce store",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Create nav-bar.tsx**

```typescript
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Bell, User, LogOut, LayoutDashboard } from "lucide-react";
import { api } from "@/lib/api";

export function NavBar({ session }: { session: { sub: string; role: string } | null }) {
  return (
    <nav className="border-b">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold">ShopFlow</Link>
        <div className="flex items-center gap-4">
          <Link href="/products"><Button variant="ghost">Products</Button></Link>
          {session ? (
            <>
              <Link href="/cart"><Button variant="ghost" size="icon"><ShoppingCart className="h-5 w-5" /></Button></Link>
              <Link href="/notifications"><Button variant="ghost" size="icon"><Bell className="h-5 w-5" /></Button></Link>
              <Link href="/orders"><Button variant="ghost" size="icon"><User className="h-5 w-5" /></Button></Link>
              {session.role === "admin" && <Link href="/admin/dashboard"><Button variant="ghost" size="icon"><LayoutDashboard className="h-5 w-5" /></Button></Link>}
              <form action="/auth/logout" method="post"><Button variant="ghost" size="icon" type="submit"><LogOut className="h-5 w-5" /></Button></form>
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
```

- [ ] **Step 3: Create public layout**

```typescript
// src/app/(public)/layout.tsx
import { NavBar } from "@/components/nav-bar";
import { Footer } from "@/components/footer";
import { getSession } from "@/lib/auth";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = getSession();
  return (
    <div className="min-h-screen flex flex-col">
      <NavBar session={session} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 4: Create footer.tsx**

```typescript
export function Footer() {
  return (
    <footer className="border-t py-8 mt-16">
      <div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} ShopFlow. All rights reserved.
      </div>
    </footer>
  );
}
```

- [ ] **Step 5: Create auth layout (simple centered layout for login/register)**

```typescript
// src/app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center">{children}</div>;
}
```

- [ ] **Step 6: Create admin-sidebar.tsx**

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Package, ShoppingCart, Users } from "lucide-react";

const links = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/users", label: "Users", icon: Users },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 border-r min-h-screen p-4">
      <Link href="/" className="text-xl font-semibold block mb-8">ShopFlow Admin</Link>
      <nav className="space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href} className={cn("flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", pathname === link.href ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 7: Create admin layout**

```typescript
// src/app/(admin)/layout.tsx
import { AdminSidebar } from "@/components/admin-sidebar";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isAdmin()) redirect("/auth/login");
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
cd D:\Github\mini-e-commerce
git add frontend/src/app/ frontend/src/components/ frontend/src/lib/
git commit -m "feat(frontend): add layouts, navigation, and auth guards"
```

---

### Task 4: Auth pages (Login + Register)

**Files:**
- Create: `frontend/src/app/(public)/auth/login/page.tsx`
- Create: `frontend/src/app/(public)/auth/register/page.tsx`
- Create: `frontend/src/components/login-form.tsx`
- Create: `frontend/src/components/register-form.tsx`

- [ ] **Step 1: Create login-form.tsx**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api<{ accessToken: string }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      await fetch("/api/auth/set-cookie", { method: "POST", body: JSON.stringify({ token: res.accessToken }) });
      toast.success("Logged in successfully");
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-96">
      <CardHeader><CardTitle>Login</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Logging in..." : "Login"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create login page**

```typescript
// src/app/(public)/auth/login/page.tsx
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return <LoginForm />;
}
```

- [ ] **Step 3: Create register-form.tsx**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api<{ accessToken: string }>("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) });
      await fetch("/api/auth/set-cookie", { method: "POST", body: JSON.stringify({ token: res.accessToken }) });
      toast.success("Registered successfully");
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registration failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-96">
      <CardHeader><CardTitle>Register</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Registering..." : "Register"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Create register page**

```typescript
// src/app/(public)/auth/register/page.tsx
import { RegisterForm } from "@/components/register-form";

export default function RegisterPage() {
  return <RegisterForm />;
}
```

- [ ] **Step 5: Create the cookie setter API route**

Create `frontend/src/app/api/auth/set-cookie/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  const res = NextResponse.json({ ok: true });
  res.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
```

Create `frontend/src/app/api/auth/logout/route.ts`:
```typescript
import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("token", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
```

- [ ] **Step 6: Commit**

```bash
cd D:\Github\mini-e-commerce
git add frontend/src/app/(public)/auth/ frontend/src/app/api/ frontend/src/components/login-form.tsx frontend/src/components/register-form.tsx
git commit -m "feat(frontend): add auth pages (login, register) with cookie handling"
```

---

### Task 5: Landing page

**Files:**
- Create: `frontend/src/app/(public)/page.tsx`
- Create: `frontend/src/components/product-card.tsx`
- Create: `frontend/src/components/product-grid.tsx`

- [ ] **Step 1: Create landing page**

```typescript
// src/app/(public)/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { ProductGrid } from "@/components/product-grid";

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  category?: { name: string; slug: string };
}

async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const res = await api<{ data: Product[] }>("/products?limit=8&sortBy=createdAt&sortOrder=desc");
    return res.data;
  } catch { return []; }
}

export default async function HomePage() {
  const products = await getFeaturedProducts();

  return (
    <div>
      <section className="py-24 text-center">
        <h1 className="text-5xl font-bold mb-4">Welcome to ShopFlow</h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-lg mx-auto">Simple, clean e-commerce for modern shoppers.</p>
        <div className="flex gap-4 justify-center">
          <Link href="/products"><Button size="lg">Browse Products</Button></Link>
          <Link href="/categories"><Button variant="outline" size="lg">Categories</Button></Link>
        </div>
      </section>
      {products.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-16">
          <h2 className="text-2xl font-semibold mb-6">Latest Products</h2>
          <ProductGrid products={products} />
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create product-card.tsx**

```typescript
import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  category?: { name: string };
}

export function ProductCard({ id, name, price, imageUrl, category }: ProductCardProps) {
  return (
    <Link href={`/products/${id}`}>
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <div className="aspect-square bg-muted flex items-center justify-center text-muted-foreground">
          {imageUrl ? <img src={imageUrl} alt={name} className="object-cover w-full h-full" /> : <span className="text-4xl">📦</span>}
        </div>
        <CardContent className="p-4">
          <h3 className="font-medium truncate">{name}</h3>
          {category && <Badge variant="secondary" className="mt-1">{category.name}</Badge>}
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <p className="text-lg font-semibold">${Number(price).toFixed(2)}</p>
        </CardFooter>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 3: Create product-grid.tsx**

```typescript
import { ProductCard } from "./product-card";

interface Product {
  id: string; name: string; price: number; imageUrl: string | null; category?: { name: string };
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((p) => <ProductCard key={p.id} {...p} />)}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd D:\Github\mini-e-commerce
git add frontend/src/app/(public)/page.tsx frontend/src/components/product-card.tsx frontend/src/components/product-grid.tsx
git commit -m "feat(frontend): add landing page and product cards"
```

---

### Task 6: Products listing and detail pages

**Files:**
- Create: `frontend/src/app/(public)/products/page.tsx`
- Create: `frontend/src/app/(public)/products/[id]/page.tsx`
- Create: `frontend/src/components/product-search.tsx`

- [ ] **Step 1: Create product listing page**

```typescript
// src/app/(public)/products/page.tsx
import { api } from "@/lib/api";
import { ProductGrid } from "@/components/product-grid";
import { ProductSearch } from "@/components/product-search";
import { Pagination } from "@/components/ui/pagination";

interface PageProps { searchParams: Promise<{ q?: string; page?: string; categoryId?: string; sortBy?: string }> }

interface Product { id: string; name: string; price: number; imageUrl: string | null; category?: { name: string } }
interface Category { id: string; name: string }

export default async function ProductsPage({ searchParams: searchParamsPromise }: PageProps) {
  const searchParams = await searchParamsPromise;
  const params = new URLSearchParams();
  if (searchParams.q) params.set("search", searchParams.q);
  if (searchParams.page) params.set("page", searchParams.page);
  if (searchParams.categoryId) params.set("categoryId", searchParams.categoryId);
  if (searchParams.sortBy) params.set("sortBy", searchParams.sortBy);

  const [productsRes, categories] = await Promise.all([
    api<{ data: Product[]; total: number; page: number }>(`/products?${params}`),
    api<{ data: Category[] }>("/categories").catch(() => ({ data: [] })),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Products</h1>
      <ProductSearch categories={categories.data} />
      <ProductGrid products={productsRes.data} />
      {productsRes.total > 20 && (
        <div className="mt-8 flex justify-center">
          <Pagination>
            <span className="text-sm text-muted-foreground">Page {productsRes.page} of {Math.ceil(productsRes.total / 20)}</span>
          </Pagination>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create product-search.tsx**

```typescript
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
    if (categoryId) params.set("categoryId", categoryId);
    router.push(`/products?${params}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-4 mb-8">
      <Input name="q" placeholder="Search products..." defaultValue={searchParams.get("q") || ""} className="max-w-sm" />
      <Select name="categoryId" defaultValue={searchParams.get("categoryId") || ""}>
        <SelectTrigger className="w-48"><SelectValue placeholder="All categories" /></SelectTrigger>
        <SelectContent>
          <SelectItem value=" ">All categories</SelectItem>
          {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button type="submit">Search</Button>
    </form>
  );
}
```

- [ ] **Step 3: Create product detail page**

```typescript
// src/app/(public)/products/[id]/page.tsx
import { api } from "@/lib/api";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface Product { id: string; name: string; description: string | null; price: number; stock: number; imageUrl: string | null; category?: { name: string } }

export default async function ProductDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const { id } = await paramsPromise;
  let product: Product;
  try { product = await api<Product>(`/products/${id}`); } catch { notFound(); }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-12">
        <div className="aspect-square bg-muted rounded-lg flex items-center justify-center text-6xl text-muted-foreground">
          {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="object-cover w-full h-full rounded-lg" /> : "📦"}
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
          {product.category && <Badge variant="secondary">{product.category.name}</Badge>}
          <p className="text-3xl font-semibold mt-4">${Number(product.price).toFixed(2)}</p>
          <p className="text-muted-foreground mt-4">{product.description || "No description available."}</p>
          <div className="mt-4 text-sm">
            {product.stock > 0 ? <span className="text-green-600">In stock ({product.stock} available)</span> : <span className="text-red-600">Out of stock</span>}
          </div>
          <AddToCartButton productId={product.id} disabled={product.stock === 0} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create add-to-cart-button.tsx**

```typescript
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
```

- [ ] **Step 5: Commit**

```bash
cd D:\Github\mini-e-commerce
git add frontend/src/app/(public)/products/ frontend/src/components/product-search.tsx frontend/src/components/add-to-cart-button.tsx
git commit -m "feat(frontend): add product listing, search, and detail pages"
```

---

### Task 7: Cart page

**Files:**
- Create: `frontend/src/app/(public)/cart/page.tsx`
- Create: `frontend/src/components/cart-item-row.tsx`

- [ ] **Step 1: Create cart page**

```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  useEffect(() => {
    api<Cart>("/cart").then(setCart).catch(() => setCart({ items: [], total: 0 })).finally(() => setLoading(false));
  }, []);

  async function updateQuantity(productId: string, quantity: number) {
    try {
      const updated = await api<Cart>(`/cart/items/${productId}`, { method: "PATCH", body: JSON.stringify({ quantity }) });
      setCart(updated);
    } catch { toast.error("Failed to update quantity"); }
  }

  async function removeItem(productId: string) {
    try {
      const updated = await api<Cart>(`/cart/items/${productId}`, { method: "DELETE" });
      setCart(updated);
      toast.success("Item removed");
    } catch { toast.error("Failed to remove item"); }
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
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.productId, Math.max(0, item.quantity - 1))}>−</Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.productId, item.quantity + 1)}>+</Button>
                    </div>
                    <p className="w-24 text-right font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => removeItem(item.productId)}>✕</Button>
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
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add frontend/src/app/(public)/cart/ frontend/src/components/cart-item-row.tsx
git commit -m "feat(frontend): add shopping cart page"
```

---

### Task 8: Checkout page

**Files:**
- Create: `frontend/src/app/(auth)/checkout/page.tsx`

- [ ] **Step 1: Create checkout page**

```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface Cart { items: { productId: string; quantity: number; name: string; price: number }[]; total: number }

export default function CheckoutPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    api<Cart>("/cart").then(setCart).catch(() => router.push("/cart"));
  }, [router]);

  async function handleCheckout() {
    setLoading(true);
    try {
      const order = await api("/checkout", { method: "POST" });
      toast.success("Order placed!");
      router.push(`/orders/${(order as { id: string }).id}`);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  if (!cart) return <div className="max-w-2xl mx-auto px-4 py-8"><p>Loading...</p></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>
      <Card>
        <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {cart.items.map((item) => (
            <div key={item.productId}>
              <div className="flex justify-between"><span>{item.name} × {item.quantity}</span><span>${(item.price * item.quantity).toFixed(2)}</span></div>
              <Separator />
            </div>
          ))}
          <div className="flex justify-between text-lg font-bold"><span>Total</span><span>${Number(cart.total).toFixed(2)}</span></div>
          <Button onClick={handleCheckout} disabled={loading || cart.items.length === 0} className="w-full">
            {loading ? "Processing..." : "Place Order"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add frontend/src/app/(auth)/checkout/
git commit -m "feat(frontend): add checkout page"
```

---

### Task 9: Orders pages

**Files:**
- Create: `frontend/src/app/(auth)/orders/page.tsx`
- Create: `frontend/src/app/(auth)/orders/[id]/page.tsx`

- [ ] **Step 1: Create orders list page**

```typescript
// src/app/(auth)/orders/page.tsx
import { api } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Order { id: string; status: string; totalAmount: number; createdAt: string }

export default async function OrdersPage() {
  const session = getSession();
  if (!session) redirect("/auth/login");

  let orders: Order[] = [];
  try {
    const res = await api<{ data: Order[] }>("/orders");
    orders = res.data;
  } catch {}

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My Orders</h1>
      {orders.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No orders yet.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <a key={order.id} href={`/orders/${order.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
                    <p className="font-medium">${Number(order.totalAmount).toFixed(2)}</p>
                  </div>
                  <Badge variant={order.status === "completed" ? "default" : "secondary"}>{order.status}</Badge>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create order detail page**

```typescript
// src/app/(auth)/orders/[id]/page.tsx
import { api } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface OrderItem { productName: string; quantity: number; productPrice: number; subtotal: number }
interface Order { id: string; status: string; totalAmount: number; createdAt: string; items: OrderItem[] }

export default async function OrderDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const { id } = await paramsPromise;
  const session = getSession();
  if (!session) redirect("/auth/login");
  let order: Order;
  try { order = await api<Order>(`/orders/${id}`); } catch { notFound(); }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Order #{order.id.slice(0, 8)}</h1>
      <Badge className="mb-6">{order.status}</Badge>
      <Card>
        <CardHeader><CardTitle>Items</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {order.items.map((item, i) => (
            <div key={i}>
              <div className="flex justify-between"><span>{item.productName} × {item.quantity}</span><span>${Number(item.subtotal).toFixed(2)}</span></div>
              <Separator />
            </div>
          ))}
          <div className="flex justify-between font-bold"><span>Total</span><span>${Number(order.totalAmount).toFixed(2)}</span></div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add frontend/src/app/(auth)/orders/
git commit -m "feat(frontend): add order list and detail pages"
```

---

### Task 10: Notifications page

**Files:**
- Create: `frontend/src/app/(auth)/notifications/page.tsx`

- [ ] **Step 1: Create notifications page**

```typescript
// src/app/(auth)/notifications/page.tsx
import { api } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Notification { id: string; title: string; body: string | null; type: string; read: boolean; createdAt: string }

export default async function NotificationsPage() {
  const session = getSession();
  if (!session) redirect("/auth/login");
  let notifications: Notification[] = [];
  try { const res = await api<{ data: Notification[] }>("/notifications"); notifications = res.data; } catch {}

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Notifications</h1>
      {notifications.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No notifications.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card key={n.id} className={n.read ? "opacity-60" : ""}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{n.title}</p>
                  {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                </div>
                {!n.read && <Badge>New</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add frontend/src/app/(auth)/notifications/
git commit -m "feat(frontend): add notifications page"
```

---

### Task 11: Admin pages

**Files:**
- Create: `frontend/src/app/(admin)/dashboard/page.tsx`
- Create: `frontend/src/app/(admin)/products/page.tsx`
- Create: `frontend/src/app/(admin)/orders/page.tsx`
- Create: `frontend/src/app/(admin)/users/page.tsx`

- [ ] **Step 1: Create admin dashboard page**

```typescript
// src/app/(admin)/dashboard/page.tsx
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Dashboard { revenue: number; totalOrders: number; dailyRevenue: number; bestSellers: { productId: string; score: number }[] }

export default async function AdminDashboardPage() {
  let dashboard: Dashboard = { revenue: 0, totalOrders: 0, dailyRevenue: 0, bestSellers: [] };
  try { dashboard = await api<Dashboard>("/admin/analytics"); } catch {}

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Total Revenue</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">${dashboard.revenue.toFixed(2)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Total Orders</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{dashboard.totalOrders}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Today&#39;s Revenue</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">${dashboard.dailyRevenue.toFixed(2)}</p></CardContent></Card>
      </div>
      {dashboard.bestSellers.length > 0 && (
        <Card className="mt-8">
          <CardHeader><CardTitle>Best Sellers</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {dashboard.bestSellers.map((item) => <li key={item.productId} className="flex justify-between"><span>{item.productId.slice(0, 8)}</span><span>{item.score} sold</span></li>)}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create admin products page**

```typescript
// src/app/(admin)/products/page.tsx
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Product { id: string; name: string; price: number; stock: number; isActive: boolean }

export default async function AdminProductsPage() {
  let products: Product[] = [];
  try { const res = await api<{ data: Product[] }>("/products"); products = res.data; } catch {}

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Products</h1>
      <Card>
        <CardHeader><CardTitle>All Products</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="pb-3 font-medium">Name</th><th className="pb-3 font-medium">Price</th><th className="pb-3 font-medium">Stock</th><th className="pb-3 font-medium">Status</th></tr></thead>
            <tbody>{products.map((p) => (<tr key={p.id} className="border-b"><td className="py-3">{p.name}</td><td className="py-3">${Number(p.price).toFixed(2)}</td><td className="py-3">{p.stock}</td><td className="py-3"><Badge variant={p.isActive ? "default" : "secondary"}>{p.isActive ? "Active" : "Inactive"}</Badge></td></tr>))}</tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Create admin orders page**

```typescript
// src/app/(admin)/orders/page.tsx
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Order { id: string; status: string; totalAmount: number; createdAt: string }

export default async function AdminOrdersPage() {
  let orders: Order[] = [];
  try { const res = await api<{ data: Order[] }>("/admin/orders"); orders = res.data; } catch {}

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Orders</h1>
      <Card>
        <CardHeader><CardTitle>All Orders</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="pb-3 font-medium">ID</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Total</th><th className="pb-3 font-medium">Date</th></tr></thead>
            <tbody>{orders.map((o) => (<tr key={o.id} className="border-b"><td className="py-3 font-mono">{o.id.slice(0, 8)}</td><td className="py-3"><Badge>{o.status}</Badge></td><td className="py-3">${Number(o.totalAmount).toFixed(2)}</td><td className="py-3">{new Date(o.createdAt).toLocaleDateString()}</td></tr>))}</tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Create admin users page**

```typescript
// src/app/(admin)/users/page.tsx
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface User { id: string; name: string; email: string; role: string }

export default async function AdminUsersPage() {
  let users: User[] = [];
  try { const res = await api<{ data: User[] }>("/admin/users"); users = res.data; } catch {}

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Users</h1>
      <Card>
        <CardHeader><CardTitle>All Users</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="pb-3 font-medium">Name</th><th className="pb-3 font-medium">Email</th><th className="pb-3 font-medium">Role</th></tr></thead>
            <tbody>{users.map((u) => (<tr key={u.id} className="border-b"><td className="py-3">{u.name}</td><td className="py-3">{u.email}</td><td className="py-3"><Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge></td></tr>))}</tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
cd D:\Github\mini-e-commerce
git add frontend/src/app/(admin)/
git commit -m "feat(frontend): add admin dashboard, products, orders, users pages"
```

---

### Task 12: Update backend CORS for Next.js

**Files:**
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Update CORS origin to allow Next.js dev server**

```typescript
// backend/src/index.ts — change cors origin
app.use(cors({ origin: ["http://localhost:5173", "http://localhost:3000"], credentials: true }));
```

The Next.js dev server runs on port 3000 by default, which conflicts with the backend. Either:
- Run backend on a different port (env variable `PORT=4000`)
- Or run Next.js on a different port (`next dev -p 5173`)

Since the Vite frontend was on port 5173, let's keep Next.js on 3000 and move backend to 4000:

Update `backend/.env`:
```
PORT=4000
```

Update `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Update CORS in backend:
```typescript
app.use(cors({ origin: ["http://localhost:3000"], credentials: true }));
```

- [ ] **Step 2: Start both servers and verify end-to-end**

Open two terminals:
1. `cd D:\Github\mini-e-commerce\backend && npm run dev` (runs on port 4000)
2. `cd D:\Github\mini-e-commerce\frontend && npm run dev` (runs on port 3000)

Visit `http://localhost:3000` — should see the landing page, products load from API.

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/index.ts frontend/.env.local
git commit -m "fix: update CORS and ports for Next.js frontend"
```

---

## Acceptance Criteria

- [ ] `npm run dev` from `frontend/` starts Next.js on port 3000
- [ ] Landing page shows featured products from API
- [ ] Product listing supports search, category filter, pagination
- [ ] Product detail shows info and "Add to Cart" button
- [ ] Register creates account and redirects to landing
- [ ] Login sets httpOnly cookie and redirects
- [ ] Cart page shows items, supports quantity +/- and remove
- [ ] Checkout creates order and redirects to order detail
- [ ] Orders list shows all user orders
- [ ] Order detail shows items and status
- [ ] Notifications page shows user notifications
- [ ] Admin dashboard shows revenue, orders, best sellers
- [ ] Admin products/orders/users tables render data
- [ ] Non-admin users get 403 on admin pages

## Test Plan

- Manual smoke test each page
- Backend tests remain at 29 passing (no backend changes affected)

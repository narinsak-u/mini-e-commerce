# Frontend Design — ShopFlow Mini E-Commerce

## Overview

Next.js 16 frontend that replaces the existing Vite+React template in `frontend/`. Server-first architecture: Server Components for public pages, minimal Client Components where interactivity is required. Tailwind CSS 4 with shadcn/ui components. Minimal, clean visual style.

## Tech Stack

| Category | Choice |
|----------|--------|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS 4 |
| Components | shadcn/ui |
| State | Server Components (default), local state for forms |
| Auth | httpOnly cookie (JWT), server-side session helper |
| Data Fetching | Native `fetch` in Server Components |
| API Client | Thin `fetch` wrapper in `lib/api.ts` |

## Architecture

### Approach: Server-First (A)

- **Server Components** for all read/public pages (products, categories, landing)
- **Client Components** only where interactivity is required (cart add/remove, checkout form, auth forms, admin actions)
- No global state manager. Ponytail: `fetch` is enough for MVP. Add Zustand when cart state needs cross-page persistence without refetch.
- httpOnly cookie for JWT — set by server on login, sent automatically on requests

### Pages & Routes

```
/                              → Landing page (hero, featured, categories)
/products                      → Product listing (search, filter, sort, paginate)
/products/[id]                 → Product detail
/cart                          → Shopping cart (client component)
/checkout                      → Checkout (client component)
/orders                        → User order history
/orders/[id]                   → Order detail
/notifications                 → User notifications
/auth/login                    → Login form (client component)
/auth/register                 → Register form (client component)
/admin/dashboard               → Revenue, orders, best sellers
/admin/products                → Product management
/admin/orders                  → Order management
/admin/users                   → User role management
```

Route groups:
- `(public)/` — public pages with shared header/footer layout
- `(auth)/` — authenticated pages with user nav
- `(admin)/` — admin pages with sidebar layout

### Component Tree

```
app/
├── layout.tsx                 # Root layout (html, body, inter font)
├── (public)/
│   ├── layout.tsx             # Public header + footer
│   ├── page.tsx               # Landing / homepage
│   ├── products/
│   │   ├── page.tsx           # Product list (Server Component)
│   │   └── [id]/page.tsx      # Product detail (Server Component)
│   ├── cart/page.tsx          # Cart (Client Component)
│   └── auth/
│       ├── login/page.tsx     # Login form (Client Component)
│       └── register/page.tsx  # Register form (Client Component)
├── (auth)/
│   ├── layout.tsx             # Auth layout with nav
│   ├── checkout/page.tsx      # Checkout (Client Component)
│   ├── orders/
│   │   ├── page.tsx           # Order history
│   │   └── [id]/page.tsx      # Order detail
│   └── notifications/page.tsx # Notifications
├── (admin)/
│   ├── layout.tsx             # Admin sidebar layout
│   ├── dashboard/page.tsx     # Dashboard
│   ├── products/page.tsx      # Product admin
│   ├── orders/page.tsx        # Order admin
│   └── users/page.tsx         # User admin
├── components/
│   ├── ui/                    # shadcn components
│   ├── nav-bar.tsx            # Public navigation
│   ├── admin-sidebar.tsx      # Admin navigation
│   ├── product-card.tsx       # Product card for grids
│   ├── product-grid.tsx       # Product grid layout
│   ├── cart-item.tsx          # Cart item row
│   ├── order-card.tsx         # Order summary card
│   └── auth-guard.tsx         # Client auth redirect wrapper
└── lib/
    ├── api.ts                 # fetch wrapper with cookie handling
    └── auth.ts                # Server-side auth helpers
```

### Data Fetching

Server Components fetch directly from the Express backend at `http://localhost:3000`:

```typescript
// app/(public)/products/page.tsx (Server Component)
async function ProductsPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const res = await fetch(`http://localhost:3000/products?${new URLSearchParams(searchParams)}`, { cache: "no-store" });
  const products = await res.json();
  // render...
}
```

Client Components use the `api.ts` wrapper which includes credentials (cookies) and Content-Type:

```typescript
// lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export async function api(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include", ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  if (!res.ok) throw new ApiError(res.status, (await res.json()).error);
  return res.json();
}
```

### Auth Flow

1. User logs in → POST `/auth/login` → backend returns JWT in response body
2. Client stores JWT as httpOnly cookie via a server action/route handler
3. Subsequent requests include cookie automatically
4. Server Component `lib/auth.ts` reads cookie, verifies JWT, returns user session
5. `auth-guard.tsx` Client Component checks session, redirects to `/auth/login`

Ponytail: No refresh token rotation on the frontend for MVP. If token expires, user re-logs in. Add silent refresh when it becomes a pain point.

### shadcn Components

- `button` — all action buttons
- `card` — product cards, order cards, dashboard cards
- `input`, `label` — form fields
- `table` — admin data tables
- `badge` — order status, product badges
- `dialog` — delete/confirm modals
- `sheet` — mobile nav, cart sidebar
- `dropdown-menu` — user dropdown, product actions
- `select` — filters, sort
- `pagination` — product/order listing
- `toast` — success/error notifications
- `skeleton` — loading states
- `separator`, `avatar` — polish

### Visual Style

- Minimal, clean, neutral palette (whites, grays)
- Accent color for actions (buttons, links)
- No dark mode for MVP
- Inter font via next/font
- Product images: placeholder/solid color until real images are added
- Responsive: mobile-first, single column → grid on larger screens

### Design Decisions

- **Why no Zustand/TanStack Query?** Server Components handle data fetching. Client-side state is minimal (form inputs, cart mutations). Adding state libraries before there's a concrete need violates YAGNI.
- **Why httpOnly cookie?** Simpler than localStorage + manual header injection. Works with Server Components natively. Backend already supports it via CORS with credentials.
- **Why route groups?** Clean separation of layouts. Public pages get a marketing-style header. Auth pages get a simple nav. Admin gets a sidebar.
- **Why no dark mode?** Doubles CSS surface area and testing for MVP. Easy to add later via Tailwind's `dark:` class.

## Constraints

- All backend calls go to `http://localhost:3000` (configurable via `NEXT_PUBLIC_API_URL`)
- CORS: backend allows `http://localhost:5173` (needs update for Next.js port)
- JWT stored in httpOnly cookie — no localStorage
- Page components are Server Components by default; add `"use client"` only when interactivity requires it
- shadcn components initialized via `npx shadcn@latest init`

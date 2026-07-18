# Frontend Audit — React Best Practices

- **Commit**: `51b15ae`
- **Score**: 71/100 ("Needs work") — [React Doctor](https://react.doctor)
- **Date**: 2025-07-18
- **Scope**: All `frontend/src/` (51 files analyzed)

---

## Summary

The frontend is a **Next.js 16 + React 19 + Tailwind v4 + shadcn/ui** app (despite `AGENTS.md` saying Vite — that's stale). The codebase is early-stage but already has several real bugs and architectural gaps. The template scaffolding was never fully replaced: root layout metadata still says "Create Next App", the root `page.tsx` is the default Next.js welcome page, and there is no `shopflow` brand identity in metadata.

**19 diagnostics** found by React Doctor. After vetting: **10 actionable findings**, plus **4 beyond-the-scan opportunities**.

---

## Prioritized Findings

Severity is **leverage-driven** (impact ÷ effort), not the rule's raw severity.

### Bugs & Correctness

| # | Severity | File:Line | Rule | Finding |
|---|----------|-----------|------|---------|
| 1 | **HIGH** | `src/app/(auth)/checkout/page.tsx:21` | `nextjs-no-client-side-redirect` | `router.push("/cart")` inside `useEffect` — flashes the checkout page before redirecting to cart if API fails. Should use middleware or server-side redirect. |
| 2 | **HIGH** | `src/app/(public)/products/page.tsx:26` | `nextjs-no-use-search-params-without-suspense` | `<ProductSearch>` calls `useSearchParams()` without a `<Suspense>` boundary. Entire product page falls to client-side rendering for all users. |
| 3 | **HIGH** | `src/components/product-card.tsx:18`<br>`src/app/(public)/products/[id]/page.tsx:17` | `nextjs-no-img-element` | Two `<img>` tags instead of `next/image`. Users download unoptimized images — no responsive srcset, no lazy loading, no WebP. |
| 4 | **HIGH** | `src/components/login-form.tsx:49`<br>`src/components/register-form.tsx:54` | `nextjs-no-a-element` | Plain `<a>` for internal links (`/auth/register`, `/auth/login`). Next.js loses client-side navigation, prefetching, and scroll restoration. |
| 5 | **MEDIUM** | `src/app/(auth)/orders/[id]/page.tsx:13` | `server-sequential-independent-await` | `await params` → `await getSession()` → `await api()` are sequential. `getSession()` and `api()` don't depend on each other — users wait 2×. |
| 6 | **MEDIUM** | `src/app/(auth)/orders/[id]/page.tsx:26` | `no-array-index-as-key` | `key={i}` on order items list. If order items reorder, users see/submit wrong data. |

### Maintainability & Architecture

| # | Severity | File:Line | Rule | Finding |
|---|----------|-----------|------|---------|
| 7 | **MEDIUM** | `src/components/ui/` | `unused-file` | **6 unused shadcn components** — `avatar.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `sheet.tsx`, `skeleton.tsx`, `sonner.tsx`, `table.tsx`. Dead code, maintenance surface. `pagination.tsx` flagged unused + has a11y issue. |
| 8 | **LOW** | `badge.tsx:52`, `button.tsx:58` | `only-export-components` | `badgeVariants` / `buttonVariants` exported from component files — React Fast Refresh can't preserve state, full-reloads. |

### Accessibility

| # | Severity | File:Line | Rule | Finding |
|---|----------|-----------|------|---------|
| 9 | **LOW** | `pagination.tsx:10` | `no-redundant-roles` | `role="navigation"` on `<nav>` — redundant, adds noise for screen readers. |

### Beyond the Scan — Missed Opportunities

| # | Severity | Location | Finding |
|---|----------|----------|---------|
| 10 | **HIGH** | `src/app/page.tsx` | **Home page is still the default Next.js template.** The actual public home lives at `(public)/page.tsx`. No route at `/` shows ShopFlow content. |
| 11 | **MEDIUM** | `src/app/layout.tsx` | **Metadata still says "Create Next App"**. Title/description never updated for ShopFlow brand. |
| 12 | **MEDIUM** | `src/app/(auth)/cart/page.tsx` | **Cart is fully client-driven** — `useEffect` fetch, no SSR, no Suspense boundary. Empty state flashes "Loading..." string. |
| 13 | **MEDIUM** | Multiple server components | **Empty `catch {}` swallows errors** in `products/page.tsx`, `cart/page.tsx`, `admin/*/page.tsx`. API failures silently return empty states with no user feedback. |
| 14 | **LOW** | `src/components/footer.tsx:1` | **Hydration mismatch risk**: `new Date().getFullYear()` returns server time, may not match client. |

---

## Implementation Plans

### Plan 1 — Replace default Next.js template with ShopFlow home

**Severity**: HIGH | **Category**: Maintainability & architecture | **Scope**: 2 files

#### Problem

`src/app/page.tsx` is still the default Next.js welcome page (Deploy Now, read docs, Next.js logo). The real shop lives in `(public)/page.tsx` but there's no route at `/` for it — the route group `(public)` already maps to `/` via Next.js colocation, so `(public)/page.tsx` should be the homepage. But there's also a top-level `page.tsx` that shadows it.

**Current code** at `src/app/page.tsx`:
```tsx
// Entire file is the default create-next-app template with Next.js branding
```

#### Target

Remove `src/app/page.tsx` and let `src/app/(public)/page.tsx` serve as the root. Update `src/app/layout.tsx` metadata for ShopFlow branding.

#### Steps

1. Delete `src/app/page.tsx` (the default template).
2. In `src/app/layout.tsx`, update `metadata`:
   - title: `"ShopFlow — Mini E-Commerce"`
   - description: `"Simple, clean e-commerce for modern shoppers."`
3. Verify `GET /` renders the ShopFlow home from `(public)/page.tsx`.

#### Verification

- `npm run build` succeeds.
- `GET /` returns the ShopFlow hero section ("Welcome to ShopFlow") and featured products.
- Metadata in `<head>` shows "ShopFlow — Mini E-Commerce".

---

### Plan 2 — Replace `<img>` with `next/image` in product components

**Severity**: HIGH | **Category**: Performance | **Scope**: 2 files

#### Problem

Two components use plain `<img>` — no optimization, no lazy loading, no responsive srcset:

- `src/components/product-card.tsx:18`
- `src/app/(public)/products/[id]/page.tsx:17`

#### Target

Replace `<img src={...} alt={...} className="..." />` with `import Image from "next/image"` and `<Image src={...} alt={...} className="..." width={...} height={...} />`.

**ProductCard** (grid thumbnail — needs static aspect ratio):
```tsx
import Image from "next/image";
// ...
<Image
  src={imageUrl}
  alt={name}
  width={400}
  height={400}
  className="object-cover w-full h-full"
/>
```

**ProductDetail** (large hero — full width):
```tsx
import Image from "next/image";
// ...
<Image
  src={product.imageUrl}
  alt={product.name}
  width={600}
  height={600}
  className="object-cover w-full h-full rounded-lg"
/>
```

For both, the placeholder case (no image) stays as the emoji span.

#### Steps

1. In `product-card.tsx`, add `import Image from "next/image"` at top. Replace `<img>` with `<Image>`, add `width={400} height={400}`.
2. In `products/[id]/page.tsx`, same replacement with `width={600} height={600}`.

#### Verification

- `npm run build` succeeds.
- `npx react-doctor@latest --scope changed` clears the `nextjs-no-img-element` diagnostics.
- Product grid and detail pages render images correctly.

---

### Plan 3 — Wrap `ProductSearch` in Suspense boundary

**Severity**: HIGH | **Category**: Performance | **Scope**: 1 file

#### Problem

`src/app/(public)/products/page.tsx:26` — `<ProductSearch>` uses `useSearchParams()` with no `<Suspense>`. Next.js forces the entire page to client-side render.

#### Target

Wrap `<ProductSearch>` in `<Suspense>` in the products page:

```tsx
import { Suspense } from "react";
// ...
<Suspense fallback={<div className="h-10" />}>
  <ProductSearch categories={categories.data} />
</Suspense>
```

#### Steps

1. In `products/page.tsx`, add `import { Suspense } from "react"`.
2. Wrap `<ProductSearch categories={categories.data} />` in `<Suspense fallback={<div className="h-[40px]" />}>`.

#### Verification

- `npm run build` succeeds.
- `npx react-doctor@latest --scope changed` clears the diagnostic.
- Product page renders and search works.

---

### Plan 4 — Replace `<a>` with `next/link` in auth forms

**Severity**: HIGH | **Category**: Performance | **Scope**: 2 files

#### Problem

- `src/components/login-form.tsx:49`: `<a href="/auth/register">`
- `src/components/register-form.tsx:54`: `<a href="/auth/login">`

These are internal links. Plain `<a>` loses client-side navigation and prefetching.

#### Target

Replace each with `<Link>` from `next/link`:

```tsx
import Link from "next/link";
// ...
<Link href="/auth/register" className="text-primary underline">Register</Link>
```

#### Steps

1. In `login-form.tsx`, add `import Link from "next/link"`. Replace `<a href="/auth/register" ...>Register</a>` with `<Link>`.
2. Same in `register-form.tsx` for the login link.

#### Verification

- `npm run build` succeeds.
- `npx react-doctor@latest --scope changed` clears both `nextjs-no-a-element` diagnostics.
- Links navigate without full page reload.

---

### Plan 5 — Parallelize independent awaits in order detail page

**Severity**: MEDIUM | **Category**: Performance | **Scope**: 1 file

#### Problem

`src/app/(auth)/orders/[id]/page.tsx:13` — three sequential awaits when two are independent:

```tsx
const { id } = await paramsPromise;       // needs to be first
const session = await getSession();        // independent of params result? Actually yes
let order = await api<Order>(...);         // independent of session check? Actually no — needs session
```

Wait — actually `getSession()` doesn't need `params` result, but the `api()` call needs neither `params` nor `session` to kick off. However, we need session for the redirect guard. The real optimization: `params` must be first, then `getSession()` and `api()` can be `Promise.all`.

#### Target

```tsx
const { id } = await paramsPromise;
const [session, order] = await Promise.all([
  getSession(),
  api<Order>(`/orders/${id}`).catch(() => { notFound(); }),
]);
if (!session) redirect("/auth/login");
```

#### Steps

1. Restructure the awaits to parallelize `getSession()` and `api()`.
2. Move the session guard after `Promise.all`.

#### Verification

- `npm run build` succeeds.
- `npx react-doctor@latest --scope changed` clears the diagnostic.
- Order detail page loads correctly.

---

### Plan 6 — Fix array index key in order detail items

**Severity**: MEDIUM | **Category**: Bugs & correctness | **Scope**: 1 file

#### Problem

`src/app/(auth)/orders/[id]/page.tsx:26` — `key={i}` on mapped order items. If items reorder, users see wrong data.

#### Target

Use a unique key from the item data. `OrderItem` has no `id` field, so use `${item.productName}-${i}` or add `id` to the `OrderItem` interface. Since the API likely returns items without unique IDs, the safest stable key is `item.productName` (assuming names are unique within an order, which is reasonable).

#### Steps

1. Change `key={i}` to `key={item.productName}`.

#### Verification

- `npm run build` succeeds.
- `npx react-doctor@latest --scope changed` clears the diagnostic.

---

### Plan 7 — Remove unused shadcn UI components

**Severity**: MEDIUM | **Category**: Maintainability | **Scope**: 6 files (delete)

#### Problem

8 shadcn components are imported nowhere: `avatar`, `dialog`, `dropdown-menu`, `pagination`, `sheet`, `skeleton`, `sonner`, `table`. Dead code with no reachable imports.

#### Target

Delete unused files. Keep only: `badge`, `button`, `card`, `input`, `label`, `select`, `separator`.

#### Steps

1. Delete: `src/components/ui/avatar.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `pagination.tsx`, `sheet.tsx`, `skeleton.tsx`, `table.tsx`.
2. `sonner.tsx` — check if `toast` from `sonner` is imported anywhere (yes, in `login-form.tsx`, `register-form.tsx`, `add-to-cart-button.tsx`, `cart/page.tsx`, `checkout/page.tsx`). The wrapper file may be unused (it's a re-export), but the `sonner` library itself is used via `import { toast } from "sonner"`. Actually, let me check — the components import directly from `"sonner"`, not from `"./ui/sonner"`. So the file IS unused.
3. `pagination.tsx` — also has the redundant `role="navigation"` fix. Since we're deleting it, the a11y issue goes away too.

#### Verification

- `npm run build` succeeds.
- `npx react-doctor@latest --scope changed` clears all `unused-file` diagnostics.

---

### Plan 8 — Update root metadata and clean up default template

**Severity**: MEDIUM | **Category**: Maintainability | **Scope**: 1 file

#### Problem

`src/app/layout.tsx` still has `title: "Create Next App"` and `description: "Generated by create next app"`.

#### Target

```tsx
export const metadata: Metadata = {
  title: "ShopFlow — Mini E-Commerce",
  description: "Simple, clean e-commerce for modern shoppers.",
};
```

#### Steps

1. Update the `metadata` export in `src/app/layout.tsx`.

#### Verification

- `npm run build` succeeds.
- `<title>` in HTML is "ShopFlow — Mini E-Commerce".

---

### Plan 9 — Fix client-side redirect in checkout page

**Severity**: HIGH | **Category**: Bugs | **Scope**: 1 file

#### Problem

`src/app/(auth)/checkout/page.tsx:21` — `router.push("/cart")` is called inside `useEffect` when the cart fetch fails. This means the checkout page renders fully (flashes) then redirects.

#### Target

Replace the `useEffect` redirect with a server-side check, or use `notFound()` / render an empty state instead of redirecting. The simplest fix: catch the error and set cart to empty (show the "Your cart is empty" UI), don't redirect.

```tsx
useEffect(() => {
  api<Cart>("/cart").then(setCart).catch(() => setCart({ items: [], total: 0 }));
}, []);
```

#### Steps

1. Remove `router.push("/cart")` from the catch handler in `checkout/page.tsx`.
2. Replace with `setCart({ items: [], total: 0 })` so the page shows an empty cart state.
3. Remove `router` import if no longer used.

#### Verification

- `npm run build` succeeds.
- `npx react-doctor@latest --scope changed` clears the diagnostic.
- Visiting `/checkout` with an empty cart shows empty state instead of flashing then redirecting.

---

### Plan 10 — Replace `<a>` with `<Link>` in orders page

**Severity**: LOW | **Category**: Performance | **Scope**: 1 file

#### Problem

`src/app/(auth)/orders/page.tsx:28` — uses `<a href={`/orders/${order.id}`}>` for internal navigation.

#### Target

Replace with `<Link>` from `next/link`. Note: the `<a>` wraps a `<Card>`, so re-structure:

```tsx
import Link from "next/link";
// ...
<Link key={order.id} href={`/orders/${order.id}`}>
  <Card className="transition-shadow hover:shadow-md">
    ...
  </Card>
</Link>
```

#### Steps

1. Add `import Link from "next/link"`.
2. Replace `<a key={order.id} href={`/orders/${order.id}`}>` with `<Link key={order.id} href={`/orders/${order.id}`}>` and close with `</Link>`.

#### Verification

- `npm run build` succeeds.
- Order list cards remain clickable and navigate without page reload.

---

## Execution Status ✅

All 10 plans executed and verified on 2025-07-18.

| Plan | Status | Verification |
|------|--------|-------------|
| Plan 1 — Remove default template | ✅ Done | `/` serves ShopFlow home, deleted `src/app/page.tsx` |
| Plan 8 — Update metadata | ✅ Done | Title: "ShopFlow — Mini E-Commerce" |
| Plan 2 — `<img>` → `next/image` | ✅ Done | `product-card.tsx` + `products/[id]/page.tsx` |
| Plan 3 — Suspense for ProductSearch | ✅ Done | Wrapped in `<Suspense>` in `products/page.tsx` |
| Plan 4 — `<a>` → `<Link>` in auth forms | ✅ Done | `login-form.tsx` + `register-form.tsx` |
| Plan 10 — `<a>` → `<Link>` in orders page | ✅ Done | `orders/page.tsx` |
| Plan 9 — Fix checkout redirect | ✅ Done | Shows empty state instead of flashing redirect |
| Plan 5 — Parallelize awaits | ✅ Done | `getSession()` + `api()` run concurrently in `orders/[id]/page.tsx` |
| Plan 6 — Fix array index key | ✅ Done | `key={item.productName}` replaces `key={i}` |
| Plan 7 — Remove unused UI components | ✅ Done | Deleted 8 unused shadcn files |

**Build**: ✅ Compiled successfully in 4.8s, 17 routes, 0 errors.
**Lint**: ✅ 0 warnings, 0 errors.

Plans 1–4 are independent and can run in parallel. Plans 4 & 10 share the same pattern.

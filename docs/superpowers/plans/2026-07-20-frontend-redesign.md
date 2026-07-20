# Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply Warm Earth visual theme across the entire ShopFlow frontend via CSS variable changes and component class-level polish. No structural or logic changes.

**Architecture:** Single CSS token swap in globals.css cascades to all shadcn components. Individual component files get class additions for shadows, hover effects, and warm tones. Each file change is self-contained.

**Tech Stack:** Tailwind CSS 4, shadcn/ui, Next.js 16

---

### Task 1: Apply Warm Earth color tokens in globals.css

**Files:**
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Replace the `:root` color variables**

Replace the entire content between `:root {` and `}` (lines 51-84) with:

```css
:root {
  --background: oklch(0.985 0.004 80);
  --foreground: oklch(0.27 0.013 65);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.27 0.013 65);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.27 0.013 65);
  --primary: oklch(0.35 0.018 60);
  --primary-foreground: oklch(0.985 0.004 80);
  --secondary: oklch(0.96 0.005 80);
  --secondary-foreground: oklch(0.35 0.018 60);
  --muted: oklch(0.96 0.005 80);
  --muted-foreground: oklch(0.55 0.01 70);
  --accent: oklch(0.72 0.19 150);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(0.89 0.008 75);
  --input: oklch(0.89 0.008 75);
  --ring: oklch(0.72 0.19 150);
  --radius: 0.75rem;
  --chart-1: oklch(0.72 0.19 150);
  --chart-2: oklch(0.55 0.01 70);
  --chart-3: oklch(0.35 0.018 60);
  --chart-4: oklch(0.89 0.008 75);
  --chart-5: oklch(0.96 0.005 80);
  --sidebar: oklch(1 0 0);
  --sidebar-foreground: oklch(0.27 0.013 65);
  --sidebar-primary: oklch(0.35 0.018 60);
  --sidebar-primary-foreground: oklch(0.985 0.004 80);
  --sidebar-accent: oklch(0.96 0.005 80);
  --sidebar-accent-foreground: oklch(0.27 0.013 65);
  --sidebar-border: oklch(0.89 0.008 75);
  --sidebar-ring: oklch(0.72 0.19 150);
}
```

- [ ] **Step 2: Replace the `.dark` color variables**

Replace the entire content between `.dark {` and `}` (lines 86-118) with:

```css
.dark {
  --background: oklch(0.21 0.01 60);
  --foreground: oklch(0.96 0.005 80);
  --card: oklch(0.21 0.01 60);
  --card-foreground: oklch(0.96 0.005 80);
  --popover: oklch(0.21 0.01 60);
  --popover-foreground: oklch(0.96 0.005 80);
  --primary: oklch(0.89 0.008 75);
  --primary-foreground: oklch(0.21 0.01 60);
  --secondary: oklch(0.27 0.013 65);
  --secondary-foreground: oklch(0.96 0.005 80);
  --muted: oklch(0.27 0.013 65);
  --muted-foreground: oklch(0.72 0.015 70);
  --accent: oklch(0.72 0.19 150);
  --accent-foreground: oklch(0.21 0.01 60);
  --destructive: oklch(0.704 0.191 22.216);
  --destructive-foreground: oklch(0.96 0.005 80);
  --border: oklch(0.27 0.013 65);
  --input: oklch(0.35 0.018 60);
  --ring: oklch(0.72 0.19 150);
  --sidebar: oklch(0.21 0.01 60);
  --sidebar-foreground: oklch(0.96 0.005 80);
  --sidebar-primary: oklch(0.72 0.19 150);
  --sidebar-primary-foreground: oklch(0.21 0.01 60);
  --sidebar-accent: oklch(0.27 0.013 65);
  --sidebar-accent-foreground: oklch(0.96 0.005 80);
  --sidebar-border: oklch(0.27 0.013 65);
  --sidebar-ring: oklch(0.72 0.19 150);
}
```

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add frontend/src/app/globals.css
git commit -m "feat(ui): apply Warm Earth color tokens in globals.css"
```

---

### Task 2: Update Nav Bar with warm glassmorphism

**Files:**
- Modify: `frontend/src/components/nav-bar.tsx`

- [ ] **Step 1: Add warm glassmorphism classes to nav element**

Change the `<nav>` element from:
```tsx
<nav className="border-b">
```
To:
```tsx
<nav className="sticky top-0 z-50 border-b border-stone-200 bg-white/80 backdrop-blur-sm">
```

- [ ] **Step 2: Add hover color to icon buttons**

Find the icon buttons (ShoppingCart, Bell, User, LayoutDashboard, LogOut) and add `hover:text-emerald-600 transition-colors` to each.

For example, change:
```tsx
<Link href="/cart"><Button variant="ghost" size="icon"><ShoppingCart className="h-5 w-5" /></Button></Link>
```
To:
```tsx
<Link href="/cart"><Button variant="ghost" size="icon"><ShoppingCart className="h-5 w-5 hover:text-emerald-600 transition-colors" /></Button></Link>
```

Apply to all icon buttons (cart, bell, user, dashboard, logout).

- [ ] **Step 3: Make the Register button emerald**

Change the Register Button from:
```tsx
<Link href="/auth/register"><Button>Register</Button></Link>
```
To:
```tsx
<Link href="/auth/register"><Button className="bg-emerald-600 hover:bg-emerald-700">Register</Button></Link>
```

- [ ] **Step 4: Commit**

```bash
cd D:\Github\mini-e-commerce
git add frontend/src/components/nav-bar.tsx
git commit -m "feat(ui): add warm glassmorphism nav bar with emerald accents"
```

---

### Task 3: Update landing hero with warm gradient

**Files:**
- Modify: `frontend/src/app/(public)/page.tsx`

- [ ] **Step 1: Add warm gradient background to hero section**

Change the hero section from:
```tsx
<section className="py-24 text-center">
```
To:
```tsx
<section className="py-24 text-center bg-gradient-to-b from-stone-100 to-white">
```

- [ ] **Step 2: Update CTA buttons to emerald**

Change:
```tsx
<Link href="/products"><Button size="lg">Browse Products</Button></Link>
<Link href="/categories"><Button variant="outline" size="lg">Categories</Button></Link>
```
To:
```tsx
<Link href="/products"><Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">Browse Products</Button></Link>
<Link href="/categories"><Button variant="outline" size="lg" className="border-stone-300 text-stone-700 hover:bg-stone-100">Categories</Button></Link>
```

- [ ] **Step 3: Add warm color to the section heading**

Change:
```tsx
<h2 className="text-2xl font-semibold mb-6">Latest Products</h2>
```
To:
```tsx
<h2 className="text-2xl font-semibold mb-6 text-stone-800">Latest Products</h2>
```

- [ ] **Step 4: Commit**

```bash
cd D:\Github\mini-e-commerce
git add frontend/src/app/(public)/page.tsx
git commit -m "feat(ui): update landing hero with warm gradient and emerald CTAs"
```

---

### Task 4: Update Product Card with shadows and hover lift

**Files:**
- Modify: `frontend/src/components/product-card.tsx`

- [ ] **Step 1: Update Card container with hover lift**

Change the Card from:
```tsx
<Card className="overflow-hidden transition-shadow hover:shadow-md">
```
To:
```tsx
<Card className="overflow-hidden border-stone-200 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
```

- [ ] **Step 2: Update price to warm brown**

Change the price from:
```tsx
<p className="text-lg font-semibold">${Number(price).toFixed(2)}</p>
```
To:
```tsx
<p className="text-lg font-semibold text-stone-800">${Number(price).toFixed(2)}</p>
```

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add frontend/src/components/product-card.tsx
git commit -m "feat(ui): add hover lift and warm styling to product cards"
```

---

### Task 5: Update Admin Sidebar with emerald active states

**Files:**
- Modify: `frontend/src/components/admin-sidebar.tsx`

- [ ] **Step 1: Update active link styling**

Change the active link condition from:
```tsx
pathname === link.href ? "bg-primary text-primary-foreground" : "hover:bg-muted"
```
To:
```tsx
pathname === link.href ? "bg-emerald-50 text-emerald-700 border-r-2 border-emerald-600" : "hover:bg-stone-100"
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add frontend/src/components/admin-sidebar.tsx
git commit -m "feat(ui): update admin sidebar with emerald active states"
```

---

### Task 6: Update admin tables with warm styling

**Files:**
- Modify: `frontend/src/app/(admin)/admin/dashboard/page.tsx`
- Modify: `frontend/src/app/(admin)/admin/products/page.tsx`
- Modify: `frontend/src/app/(admin)/admin/orders/page.tsx`
- Modify: `frontend/src/app/(admin)/admin/users/page.tsx`

- [ ] **Step 1: Add warm card classes to every admin page's Card wrapper**

In each admin page, find `<Card>` and add the classes `shadow-sm border-stone-200`.

```tsx
<Card className="shadow-sm border-stone-200">
```

- [ ] **Step 2: Add alternating row colors to table rows**

In each admin page with a `<table>`, add `even:bg-stone-50` to the `<tr>` elements, and add `bg-stone-50` to `<th>` elements:

Change `<tr className="border-b text-left">` to `<tr className="border-b text-left bg-stone-50">` for the header row.

For data rows:
```tsx
<tr key={p.id} className="border-b even:bg-stone-50">
```

Apply to admin products, orders, and users pages.

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add frontend/src/app/(admin)/admin/
git commit -m "feat(ui): update admin tables with warm styling and alternating rows"
```

---

### Task 7: Update Footer with warm tones

**Files:**
- Modify: `frontend/src/components/footer.tsx`

- [ ] **Step 1: Update footer classes**

Change:
```tsx
<footer className="border-t py-8 mt-16">
```
To:
```tsx
<footer className="border-t border-stone-200 bg-stone-50 py-8 mt-16">
```

Change the text from `text-muted-foreground`:
```tsx
<div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground">
```
To:
```tsx
<div className="max-w-7xl mx-auto px-4 text-center text-sm text-stone-500">
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add frontend/src/components/footer.tsx
git commit -m "feat(ui): update footer with warm background and text"
```

---

### Task 8: Verify build succeeds

- [ ] **Step 1: Build the frontend**

Run: `cd D:\Github\mini-e-commerce\frontend && npm run build`

Expected: `✓ Compiled successfully` with all 16 routes registered.

- [ ] **Step 2: Smoke check the login page**

```bash
cd D:\Github\mini-e-commerce\frontend && npm run dev
```
Visit `http://localhost:3000/auth/login` — the card should have warm borders, emerald focus ring on inputs, warm brown labels.

---

## Acceptance Criteria

- [ ] `globals.css` has warm earth color tokens (stone/emerald)
- [ ] Nav bar has glassmorphism effect and emerald icon hover
- [ ] Landing hero has warm vertical gradient
- [ ] CTA buttons are emerald green
- [ ] Product cards lift on hover with warm shadow
- [ ] Admin sidebar has emerald active state indicators
- [ ] Admin tables have warm card wrappers and alternating rows
- [ ] Footer has warm background
- [ ] Dark mode uses warm-toned dark grays
- [ ] `npm run build` succeeds

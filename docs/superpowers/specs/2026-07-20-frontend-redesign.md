# Frontend Redesign — Warm Earth Theme

## Overview

Visual overhaul of the existing ShopFlow frontend. No structural or logic changes — only CSS variable swaps and component class-level polish. Changes the color palette from neutral/shadcn-default to a warm earth theme with emerald accents.

## Design Direction

- **Style**: Modern commerce, minimal, warm
- **Reference feel**: Boutique storefront — cozy, earthy, inviting
- **Complexity**: Theme-only + class-level polish (Approach A)

## Color Palette

| Token | Light | Dark |
|-------|-------|------|
| Background | stone-50 (#fafaf9) | stone-900 (#1c1917) |
| Foreground | stone-800 (#292524) | stone-100 (#f5f5f4) |
| Primary | stone-700 (#44403c) | stone-200 (#e7e5e4) |
| Accent | emerald-600 (#10b981) | emerald-500 (#34d399) |
| Muted | stone-100 (#f5f5f4) | stone-800 (#292524) |
| Border | stone-200 (#e7e5e4) | stone-700 (#44403c) |
| Ring | emerald-500 (#34d399) | emerald-400 (#4ade80) |
| Radius | 0.75rem | 0.75rem |

## Changes Scope

### globals.css
- Swap color OKLCH values to warm earth tones
- Add `--card-shadow` custom property
- Increase `--radius` from 0.625rem to 0.75rem
- Remove sidebar theme overrides (use defaults derived from palette)
- Dark mode: warm-toned dark grays instead of neutral grays

### Nav Bar (`nav-bar.tsx`)
- Add `backdrop-blur-sm bg-white/80` for frosted glass effect
- `border-b border-stone-200`
- Cart/notif icons get emerald hover state (`hover:text-emerald-600`)
- Logo bolder, warm brown

### Landing Hero (`(public)/page.tsx`)
- Wrap hero in `bg-gradient-to-b from-stone-100 to-white`
- CTA buttons: primary → `bg-emerald-600 hover:bg-emerald-700`, outline → `border-stone-300 text-stone-700`
- Section heading: `text-stone-800`, optional emerald short underline

### Product Card (`product-card.tsx`)
- `shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200`
- `border-stone-200` card border
- Price in `text-stone-800 font-semibold`
- Category badge: emerald outline variant

### Product Grid (`product-grid.tsx`)
- Responsive gap `gap-6` (already correct)

### Buttons (global shadcn classes)
- Primary: `bg-emerald-600 hover:bg-emerald-700 text-white`
- Outline: `border-stone-300 text-stone-700 hover:bg-stone-100`
- Ghost: `hover:bg-stone-100 text-stone-600`
- Destructive: `bg-red-500 hover:bg-red-600`

### Forms (Input, Select, shadcn defaults)
- `border-stone-300 focus:border-emerald-500 focus:ring-emerald-500/20`
- `rounded-lg` radius
- Label: `text-stone-700 font-medium`

### Admin Sidebar (`admin-sidebar.tsx`)
- Active link: `bg-emerald-50 text-emerald-700 border-r-2 border-emerald-600`
- Hover: `hover:bg-stone-100`
- Sidebar bg: `bg-white border-r border-stone-200`

### Admin Tables
- Card wrapper: `shadow-sm border-stone-200`
- Table header: `text-stone-700 font-semibold bg-stone-50`
- Alternating rows: `even:bg-stone-50`
- Status badges: emerald (active/paid), amber (pending), red (cancelled), blue (shipping)

### Status Badges
Define color map:
- `paid`, `completed`, `active`: emerald
- `pending`: amber
- `cancelled`, `failed`: red
- `shipping`, `packing`: blue

### Footer (`footer.tsx`)
- `bg-stone-50 border-t border-stone-200 text-stone-500`

## Files Modified

| File | Change |
|------|--------|
| `src/app/globals.css` | Full color token replacement |
| `src/components/nav-bar.tsx` | Class additions for warm glassmorphism |
| `src/components/footer.tsx` | Class updates |
| `src/components/admin-sidebar.tsx` | Active/hover state colors |
| `src/components/product-card.tsx` | Shadow, hover lift, border |
| `src/app/(public)/page.tsx` | Hero gradient, button colors |
| `src/app/(public)/products/page.tsx` | Minor class tweaks |
| `src/app/(public)/products/[id]/page.tsx` | Minor class tweaks |
| `src/app/(admin)/admin/**/page.tsx` | Card/table wrapper classes |
| `src/app/(auth)/orders/**/page.tsx` | Badge colors |

## Non-Changes

- No component logic changes
- No new pages or routes
- No data fetching changes
- No Zustand/TanStack Query changes
- No layout changes (route groups, file structure)

# 002 — Replace array-index key with stable key in order detail items

- **Status**: TODO
- **Commit**: `d700dbe`
- **Severity**: MEDIUM
- **Category**: Bugs & correctness
- **Rule**: `react-doctor/no-array-index-as-key`
- **Estimated scope**: 1 file, 1 line

## Problem

`src/app/(auth)/orders/[id]/page.tsx:33` — The order items list uses `key={${item.productName}-${i}}`, embedding the array index `i`. If items reorder (e.g., the API sorts or the user filters), React can attach DOM state to the wrong rows.

Current code:

```tsx
// src/app/(auth)/orders/[id]/page.tsx:32-37
{order.items.map((item, i) => (
  <div key={`${item.productName}-${i}`}>
    <div className="flex justify-between"><span>{item.productName} × {item.quantity}</span><span>${Number(item.subtotal).toFixed(2)}</span></div>
    <Separator />
  </div>
))}
```

**User impact**: If order items are ever reordered (by the admin, or by a server-side sort change under the same client render), React preserves the wrong `Separator` and DOM state references. The actual risk is low today (items are append-only in a single order), but the pattern is a correctness liability.

## Target

Use `item.productName` as the key — product names are unique within a single order (you can't order the same product twice as separate line items; quantities are aggregated):

```tsx
// target
{order.items.map((item) => (
  <div key={item.productName}>
```

The `OrderItem` interface has no `id` field. `productName` is the natural stable identifier within an order's scope.

## Repo conventions to follow

- Other list renders in the codebase use stable keys: `Order` list uses `key={order.id}`, `Cart` uses `key={item.productId}`, `Notification` uses `key={n.id}`.
- Follow the same pattern: use a data field, not the iteration index.

## Steps

1. At `frontend/src/app/(auth)/orders/[id]/page.tsx:32`, change `(item, i)` to `(item)` (drop the index parameter).
2. On the same line, change `key={`${item.productName}-${i}`}` to `key={item.productName}`.

## Boundaries

- Do NOT add an `id` field to the `OrderItem` interface — the API contract may not provide one and changing it is out of scope.
- Do NOT change the visual layout or any other logic.

## Verification

- **Mechanical**: `npx react-doctor@latest --scope changed` clears the `no-array-index-as-key` diagnostic for `orders/[id]/page.tsx`.
- **Behavioral**: Navigate to an order detail page. Confirm all items render correctly. The page works identically before and after.
- **Done when**: the targeted diagnostic is clear, `npm run build` succeeds, and order items render correctly.

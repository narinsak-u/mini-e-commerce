# 001 — Add accessible label to OrderStatusSelect

- **Status**: TODO
- **Commit**: `d700dbe`
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Rule**: `react-doctor/control-has-associated-label`
- **Estimated scope**: 1 file, 1 line

## Problem

`src/components/order-status-select.tsx:31` — The `<select>` element has no accessible label. Screen reader users cannot identify what this control does. The control appears in the admin orders table alongside order IDs, but the relationship is only visual.

Current code:

```tsx
// src/components/order-status-select.tsx:30-39
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
```

**User impact**: A blind admin user tabbing through the orders table hears "select" with no context, cannot tell this controls order status, and cannot confidently operate the admin interface.

## Target

Add `aria-label="Order status"` to the `<select>` element:

```tsx
// target
<select
  value={status}
  onChange={e => handleChange(e.target.value)}
  disabled={saving}
  aria-label="Order status"
  className="h-7 text-xs rounded border border-input bg-background px-2 cursor-pointer"
>
```

The `aria-label` provides an accessible name without changing the visual appearance. This is the canonical fix for icon-only or context-dependent controls per the `react-doctor/control-has-associated-label` rule.

## Repo conventions to follow

- No existing `aria-label` usage in the codebase — this is the first. Keep it simple, one attribute on the native `<select>`.
- Preserve the existing `className`, event handlers, and state management.

## Steps

1. At `frontend/src/components/order-status-select.tsx:33` (the `<select>` opening tag), add `aria-label="Order status"` after `disabled={saving}` and before `className`.

## Boundaries

- Do NOT add a `<label>` element or visible text — the control is inline in a table row and visible text would add visual clutter. `aria-label` is the right tool here.
- Do NOT change any other file.

## Verification

- **Mechanical**: `npx react-doctor@latest --scope changed` clears the `control-has-associated-label` diagnostic for `order-status-select.tsx` and the score does not regress.
- **Behavioral**: Navigate to `/admin/orders`. The `<select>` is keyboard-focusable and operates identically. Using a screen reader (VoiceOver/NVDA), tab to the select and confirm it announces "Order status, select" or equivalent.
- **Done when**: the targeted diagnostic is clear, `npm run build` succeeds, and the select works as before.

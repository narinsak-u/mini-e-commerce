# 004 — Cleanup: remove dead code, unused exports, and unused dependency

- **Status**: TODO
- **Commit**: `d700dbe`
- **Severity**: LOW (batched)
- **Category**: Maintainability & architecture
- **Rule**: `deslop/unused-file`, `deslop/unused-export`, `react-doctor/only-export-components`, `deslop/unused-dependency`
- **Estimated scope**: 4 files

## Problem

Four low-severity issues that clutter the codebase. Batched because they're all one-line changes or deletions with no behavioral impact:

### 1. Unused `ErrorBoundary` component (`deslop/unused-file`)

`src/components/error-boundary.tsx` — A class-based `ErrorBoundary` is exported but no file imports it. 30 lines of dead code.

### 2. Unnecessary exports in `skeleton.tsx` (`deslop/unused-export`)

`src/components/skeleton.tsx:3,7` — `Skeleton` and `CardSkeleton` are exported but only used internally by `ProductGridSkeleton`. Extra API surface degrades Fast Refresh.

Current:

```tsx
export function Skeleton(...) { ... }
export function CardSkeleton() { ... }
export function ProductGridSkeleton(...) { ... }
```

Target: drop `export` from `Skeleton` and `CardSkeleton`:

```tsx
function Skeleton(...) { ... }
function CardSkeleton() { ... }
export function ProductGridSkeleton(...) { ... }
```

### 3. Non-component exports in component files (`only-export-components`)

`src/components/ui/badge.tsx:52` and `src/components/ui/button.tsx:58` — `badgeVariants` and `buttonVariants` are CVA variant objects exported alongside the `Badge` and `Button` components. This prevents React Fast Refresh from preserving component state — any edit triggers a full reload.

### 4. Unused `next-themes` dependency (`deslop/unused-dependency`)

`frontend/package.json` — `next-themes` is listed as a dependency but never imported anywhere in `src/`. Unnecessary install time and supply-chain surface.

## Target

### Fix 1: Delete `error-boundary.tsx`

Remove the file entirely. It's unreachable dead code.

### Fix 2: Unexport internal helpers in `skeleton.tsx`

Remove `export` from `Skeleton` and `CardSkeleton` function declarations. They're only used within the same file by `ProductGridSkeleton`.

### Fix 3: Separate variant exports in badge.tsx and button.tsx

For each file, move the `cva(...)` variant definition into the component file as a plain `const` (no export), and export it from a new file if external callers need it.

Since nothing in the codebase currently imports `badgeVariants` or `buttonVariants` directly (verified by grep), the simplest correct fix is to remove the export:

- `badge.tsx`: change `export { Badge, badgeVariants }` to `export { Badge }` and remove `export` from `badgeVariants` definition.
- `button.tsx`: change `export { Button, buttonVariants }` to `export { Button }` and remove `export` from `buttonVariants` definition.

If a grep reveals an external consumer, re-export from a sibling file instead.

### Fix 4: Remove `next-themes` from package.json

Remove `"next-themes": "^0.4.6"` from the `dependencies` object. Run `npm install` afterward to clean up `package-lock.json`.

## Repo conventions to follow

- The remaining shadcn UI files (`card.tsx`, `input.tsx`, `label.tsx`, `select.tsx`, `separator.tsx`) all export only their component — no variant objects. Fix 3 aligns `badge.tsx` and `button.tsx` with this convention.
- Use `npm install` (not `npm rm`) to clean lockfile after removing the dependency.

## Steps

1. Delete `src/components/error-boundary.tsx` (fix 1).
2. In `src/components/skeleton.tsx:3`, remove `export` from `Skeleton` (fix 2).
3. In `src/components/skeleton.tsx:7`, remove `export` from `CardSkeleton` (fix 2).
4. In `src/components/ui/badge.tsx:52`, remove `export` from `badgeVariants` definition and remove it from the `export { ... }` line (fix 3).
5. In `src/components/ui/button.tsx:58`, remove `export` from `buttonVariants` definition and remove it from the `export { ... }` line (fix 3).
6. Check `grep -r "badgeVariants\|buttonVariants" src/` to confirm no external imports exist.
7. In `frontend/package.json`, remove the `"next-themes"` line (fix 4).
8. Run `cd frontend && npm install` to update lockfile.

## Boundaries

- Do NOT change component behavior, visual appearance, or public APIs.
- If step 6 reveals external imports of `badgeVariants` or `buttonVariants`, keep the export and skip steps 4-5. Report the findings.
- Do NOT run a full `npm audit` or change other dependencies.

## Verification

- **Mechanical**: `npm run build` succeeds. `npx react-doctor@latest --scope changed` clears all four diagnostic types (unused-file, unused-export, only-export-components, unused-dependency). Score does not regress.
- **Behavioral**: Navigate to the products page (uses `ProductGridSkeleton` via `/products` loading state), admin pages (use `Badge` and `Button`). All render correctly. No regressions.
- **Done when**: All 4 diagnostics are clear, build succeeds, and affected pages render identically.

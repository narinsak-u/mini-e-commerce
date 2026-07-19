# 003 — Add server-side error logging to empty catch blocks

- **Status**: TODO
- **Commit**: `d700dbe`
- **Severity**: MEDIUM
- **Category**: Maintainability & architecture
- **Rule**: Beyond the scan
- **Estimated scope**: 7 files, ~7 insertions

## Problem

7 server components have empty `catch {}` blocks that silently swallow API errors. When the backend is down or returns an error, users see empty tables ("No orders.", "No notifications.", "No categories yet.") with no indication that something went wrong.

Affected files and the variable that silently stays at its default:

| File | Line | API call | Fallback |
|------|------|----------|----------|
| `src/app/(admin)/admin/dashboard/page.tsx` | 8 | `api<Dashboard>("/admin/analytics")` | `{ revenue: 0, totalOrders: 0, ... }` |
| `src/app/(admin)/admin/orders/page.tsx` | 9 | `api<{ data: Order[] }>("/admin/orders")` | `[]` |
| `src/app/(admin)/admin/products/page.tsx` | 11 | `api<{ data: Product[] }>("/products")` | `[]` |
| `src/app/(admin)/admin/users/page.tsx` | 9 | `api<{ data: User[] }>("/admin/users")` | `[]` |
| `src/app/(auth)/notifications/page.tsx` | 13 | `api<{ data: Notification[] }>("/notifications")` | `[]` |
| `src/app/(auth)/orders/page.tsx` | 18 | `api<{ data: Order[] }>("/orders")` | `[]` |
| `src/app/(public)/categories/page.tsx` | 10 | `api<{ data: Category[] }>("/categories")` | `[]` |

Current pattern (identical across all 7 files):

```tsx
let data: Type[] = [];
try { const res = await api<...>(...); data = res.data; } catch {}
```

**User impact**: An admin whose API is down sees "No orders." instead of "Failed to load orders." — misdiagnosing a backend outage as an empty database. They cannot distinguish "no data" from "data failed to load."

## Target

Change each `catch {}` to `catch { console.error("Failed to load [resource name]"); }`. This surfaces errors in server logs without changing the user-facing UI behavior in this change. Future work can add client-side error boundaries or toast notifications.

```tsx
// target pattern
let orders: Order[] = [];
try {
  const res = await api<{ data: Order[] }>("/admin/orders");
  orders = res.data;
} catch {
  console.error("Failed to load orders");
}
```

The user-facing behavior stays the same (empty state renders), but errors are now observable in server logs and the Next.js dev console.

## Repo conventions to follow

- Existing catch blocks with feedback: `add-to-cart-button.tsx` uses `toast.error()`, `login-form.tsx` uses `toast.error()`. Those are client components. For server components, `console.error` is the standard server-side logging mechanism.
- Use descriptive strings matching the pattern: `"Failed to load [ResourceName]"` in lowercase.
- Preserve the silent fallback behavior (variable stays at its default value) — the user-facing empty state is a separate UX concern.

## Steps

For each of the 7 files, apply the same transformation:

1. `src/app/(admin)/admin/dashboard/page.tsx:8`:
   ```
   // before: } catch {}
   // after: } catch { console.error("Failed to load dashboard"); }
   ```

2. `src/app/(admin)/admin/orders/page.tsx:9`:
   ```
   // before: } catch {}
   // after: } catch { console.error("Failed to load orders"); }
   ```

3. `src/app/(admin)/admin/products/page.tsx:11`:
   ```
   // before: } catch {}
   // after: } catch { console.error("Failed to load products"); }
   ```

4. `src/app/(admin)/admin/users/page.tsx:9`:
   ```
   // before: } catch {}
   // after: } catch { console.error("Failed to load users"); }
   ```

5. `src/app/(auth)/notifications/page.tsx:13`:
   ```
   // before: } catch {}
   // after: } catch { console.error("Failed to load notifications"); }
   ```

6. `src/app/(auth)/orders/page.tsx:18`:
   ```
   // before: } catch {}
   // after: } catch { console.error("Failed to load orders"); }
   ```

7. `src/app/(public)/categories/page.tsx:10`:
   ```
   // before: } catch {}
   // after: } catch { console.error("Failed to load categories"); }
   ```

## Boundaries

- Do NOT change the user-facing UI — no error banners, no toast notifications. Server components cannot use `toast`. A follow-up can wrap admin pages in a client error boundary.
- Do NOT change the initialized default values or the `try` blocks themselves.
- Do NOT add `const`/`let` or import new modules.

## Verification

- **Mechanical**: `npm run build` succeeds with no new errors.
- **Behavioral**: Navigate to each affected page with the backend offline. The page renders with empty data (same as before). Check the server/browser console — error messages appear for each failed fetch.
- **Done when**: All 7 files have non-empty `catch` blocks with `console.error`, `npm run build` succeeds, and errors are visible in the dev console when the API is unreachable.

# Improvement Plans — Mini E-Commerce (Frontend)

**Generated**: 2026-07-19  
**Commit**: `d700dbe`  
**React Doctor score**: 75/100 ("Needs work")

## Execution order

Plans are ordered by leverage (impact ÷ effort). No hard dependencies between plans — they can run in any order or in parallel.

| Order | Plan | Status | Severity | Category | Scope | Depends on |
|-------|------|--------|----------|----------|-------|------------|
| 1 | [001 — Add accessible label to OrderStatusSelect](./001-order-status-select-label.md) | TODO | MEDIUM | Accessibility | 1 file, 1 line | None |
| 2 | [002 — Replace array-index key in order detail](./002-order-detail-stable-key.md) | TODO | MEDIUM | Bugs & correctness | 1 file, 1 line | None |
| 3 | [003 — Add error logging to empty catch blocks](./003-empty-catch-error-handling.md) | TODO | MEDIUM | Maintainability | 7 files | None |
| 4 | [004 — Cleanup dead code and unused exports](./004-cleanup-dead-code-and-exports.md) | TODO | LOW | Maintainability | 4 files | None |

## Notes

- Plans 001 and 002 are the smallest changes (1 line each) and are safe to apply first.
- Plan 003 touches 7 files but every edit is identical — a one-word `catch {}` → `catch { console.error(...); }` insertion. Good candidate for a find-and-replace pass.
- Plan 004 batches 4 independent fixes. If any variant export (`badgeVariants`/`buttonVariants`) is externally imported, stop and report. Otherwise all 4 changes are safe deletions.
- After all plans are applied, re-run `npx react-doctor@latest` to confirm score improves from 75 to ~80+.

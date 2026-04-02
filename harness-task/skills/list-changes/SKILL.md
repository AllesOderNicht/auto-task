---
name: list-changes
description: Scan .dev-changes directory and display all development changes with their status, progress, and metadata.
user-invocable: true
---

# List Development Changes

Scan `.dev-changes/` and `.dev-changes/archive/` to display all changes.

## Execution

### 1. Scan Active Changes

Read `.dev-changes/*/status.json` for each non-archive subdirectory.

### 2. Scan Archived Changes

Read `.dev-changes/archive/*/status.json` or list archive directories.

### 3. Display Table

Format output as a table:

```
| Change | Stage | Branch | Progress | Updated |
|--------|-------|--------|----------|---------|
| {branch-name} | executing | feature/login-flow | PH-2/5 | 2h ago |
| {branch-name} | done | fix/prompt-flow | complete (5/5 phases) | 1d ago |
```

### 4. Summary

- Total active changes
- Changes ready to archive (stage=done)
- Blocked changes (if any)

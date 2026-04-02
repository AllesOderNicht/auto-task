---
name: list-changes
description: Scan .dev-changes directory and display all development changes with their status and progress.
user-invocable: true
---

# List Changes — View All Development Changes

Scan `.dev-changes/` and display a summary of all active and archived changes.

## Output Format

```markdown
## Active Changes

| Branch | Stage | Current Phase | Progress |
|--------|-------|---------------|----------|
| feature/auth | executing | PH-2 | 1/3 phases |
| fix/bug-123 | refining | — | — |

## Archived Changes

| Branch | Archived Date | Phases |
|--------|--------------|--------|
| feature/login | 2026-03-15 | 4 |
```

## How It Works

1. Scan `.dev-changes/*/status.json` for active changes (stage != archived).
2. Scan `.dev-changes/archive/*/status.json` for archived changes.
3. For each change, extract: branch, stage, current phase, total phases, completed phases.
4. Display in a formatted table.

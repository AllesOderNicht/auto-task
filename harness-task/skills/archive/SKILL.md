---
name: archive
description: Archive a completed development change. Moves the change directory to archive with a date prefix.
user-invocable: true
---

# Archive — Complete and Archive a Change

Archive a development change that has reached the `verifying` stage with all phases completed.

## Prerequisites

- The change must be in `verifying` stage.
- All phases must have `completed` status.
- All tests must pass.

## Steps

1. **Validate** — Read `status.json` and verify:
   - `stage` is `verifying`.
   - All phases have `status: "completed"`.
   - Run the test suite to confirm everything passes.

2. **Archive** — Move the change directory:
   ```
   .dev-changes/{branch-dir}/  →  .dev-changes/archive/YYYY-MM-DD-{branch-dir}/
   ```

3. **Clean up branch** (optional) — Ask the user if they want to:
   - Delete the feature branch.
   - Keep the branch for further work.

4. **Report** — Show the user:
   - What was archived.
   - Where the archive is located.
   - Branch cleanup status.

## Archive Structure

```
.dev-changes/
  archive/
    2026-04-02-feature-auth/
      prompt.md
      refined-prompt.md
      proposal.md
      design.md
      tasks.md
      status.json
      phases/
        PH-1-summary.md
        PH-2-summary.md
```

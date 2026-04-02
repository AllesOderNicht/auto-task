---
name: sync-specs
description: Manually merge delta specs from an active change into `.harness-task/specs/` without archiving. Useful for incremental spec updates.
user-invocable: true
---

# Sync Delta Specs

Merge delta specs from an active change into `.harness-task/specs/` without archiving the change.

## Parameters

- `$ARGUMENTS`: Git branch name whose delta specs should be synced. If empty, use the current branch or list changes with delta specs.

## Execution Flow

### 1. Find Delta Specs

Resolve the safe directory name from the target branch, then read `.dev-changes/{safe-branch-dir}/specs/*.md` for delta spec files.

### 2. Preview Changes

Same merge logic as the archive skill:
- Parse ADDED/MODIFIED/REMOVED Requirements
- Show what will change in `.harness-task/specs/`
- Ask user to confirm

### 3. Execute Merge

Apply delta specs to `.harness-task/specs/`:
- ADDED → append or create
- MODIFIED → find and replace by requirement name
- REMOVED → find and delete by requirement name

### 4. Mark as Synced

Note in execution-log.md that specs were synced at this point.

### 5. Output

- List all changes applied
- Note: change remains active (not archived)

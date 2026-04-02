---
name: archive
description: Archive a completed development change. Merges delta specs into `.harness-task/specs/`, moves the change to archive, and cleans up git branch/worktree.
user-invocable: true
---

# Archive Completed Change

Archive a completed change and merge its delta specs into the main `.harness-task/specs/` directory.

## Parameters

- `$ARGUMENTS`: Git branch name to archive. If empty, use the current branch or list archivable changes.

## Execution Flow

### 1. Validate

- Resolve the safe directory name from the target branch, then read `.dev-changes/{safe-branch-dir}/status.json`
- Verify `stage === "done"`
- If not done, show current stage and suggest completing the change first

### 2. Preview Delta Spec Merge

For each spec file in `.dev-changes/{safe-branch-dir}/specs/`:
- Parse delta format (ADDED/MODIFIED/REMOVED Requirements)
- Show preview of what will change in `.harness-task/specs/`:
  - New specs to be created
  - Existing specs to be updated (show diff)
  - Requirements to be removed
- Ask user to confirm merge

### 3. Execute Merge

For each delta spec:
- **ADDED Requirements**: Append to target spec's Requirements section. If target spec doesn't exist, create it.
- **MODIFIED Requirements**: Find matching requirement by name in target spec, replace content.
- **REMOVED Requirements**: Find matching requirement by name in target spec, remove it.

### 4. Move to Archive

```bash
mv .dev-changes/{safe-branch-dir} .dev-changes/archive/{YYYY-MM-DD}-{safe-branch-dir}
```

### 5. Clean Up Git

Based on `status.json`:
- If `use_worktree: true`: Remove worktree and branch
- If branch-based mode: Ask user if they want to delete the tracked branch

### 6. Output Summary

- List all merged spec changes
- Archive location
- Cleaned up resources

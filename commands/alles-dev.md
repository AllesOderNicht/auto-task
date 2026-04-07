Invoke the `harness-task:dev` skill to start or resume a development change.
Immediately run the startup hook before anything else:
- resolve the effective branch
- if an explicit branch name was provided and the repo is not on it,
  switch to it, or create it from the base branch
- create `.dev-changes/{safe-branch-dir}/` if it does not exist
- create `.dev-changes/{safe-branch-dir}/prompt.md` if it does not exist
- create `.dev-changes/{safe-branch-dir}/status.json` if it does not exist

The assistant must finish the startup hook first, then continue with prompt capture
or change resumption based on the current stage in status.json.

Pass an optional git branch name; if omitted, use the current branch.

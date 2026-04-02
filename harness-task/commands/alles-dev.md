Invoke the `harness-task:dev` skill to start or resume a development change.
Immediately run a startup hook before any planning or requirement follow-up:
- resolve the effective branch
- in default mode, if an explicit branch name was provided and the repo is not on it,
  switch to it, or create it from the base branch and switch to it
- create `.dev-changes/{safe-branch-dir}/` if it does not exist
- create `.dev-changes/{safe-branch-dir}/prompt.md` if it does not exist

The assistant must finish that startup hook first, then continue with prompt capture
or change resumption.

Pass an optional git branch name; if omitted, use the current branch. Support `-w`,
`-worktree`, and `--worktree` to request a dedicated worktree.

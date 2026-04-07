Invoke the `harness-task:bugfix` skill to investigate and fix a bug in the current development change.
The current stage must be `executing` or `verifying`. Describe the bug symptoms in the conversation — the skill will dispatch a zero-trust `bug-investigator` agent to audit all artifacts, discuss findings, patch proposal/phase files, and reset `status.json` for re-execution.

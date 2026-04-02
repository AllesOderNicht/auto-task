---
name: dev
description: Start or resume a development change. Orchestrates the 6-stage workflow — init, prompting, refining, proposing, executing, verifying.
user-invocable: true
---

# Dev — Main Workflow Orchestrator

You are the main entry point for the harness-task development workflow. Your job is to drive a change through 6 stages, delegating to specialized skills as needed.

## Startup Hook (MANDATORY — run FIRST)

Before anything else, execute these steps:

1. **Resolve the branch**: If a branch name argument was provided, use it. Otherwise use the current git branch.
2. **Switch/create branch**: If the repo is not on the target branch, switch to it or create it from the base branch.
3. **Ensure change directory**: Create `.dev-changes/{safe-branch-dir}/` if it doesn't exist.
4. **Ensure prompt.md**: Create `.dev-changes/{safe-branch-dir}/prompt.md` from template if it doesn't exist.
5. **Ensure status.json**: Create `.dev-changes/{safe-branch-dir}/status.json` with initial `init` stage if it doesn't exist.
6. **Read status.json**: Load current stage and phase progress.

Only after completing the startup hook should you proceed.

## 6-Stage Workflow

```
init → prompting → refining → proposing → executing → verifying
```

### Stage: `init`

- The startup hook just created the branch and directory.
- Advance stage to `prompting` immediately.
- Tell the user to fill in `prompt.md` with their requirements.

### Stage: `prompting`

- Check if `prompt.md` has meaningful content (not just the template).
- If empty/template: ask the user to describe what they want. Write their response into `prompt.md`.
- If filled: advance stage to `refining`.

### Stage: `refining`

- **Invoke skill `harness-task:brainstorming` — Round 1**.
- Read code, ask at least 5 structured questions (NO subagent).
- Generate `refined-prompt.md` based on user answers.
- Advance stage to `proposing`.

### Stage: `proposing`

- **Invoke skill `harness-task:brainstorming` — Round 2**.
- Compress previous context (summarize round 1 into a short block, then work from `refined-prompt.md` only).
- Use subagent to explore the codebase in parallel.
- Generate three files: `proposal.md`, `design.md`, `tasks.md`.
- Parse phases from `tasks.md` and populate `status.json` with phase list.
- **Wait for user confirmation** before advancing.
- Advance stage to `executing`.

### Stage: `executing`

- **Invoke skill `harness-task:executing`** for the current phase.
- For each phase:
  1. Load context: `proposal.md` + completed phase summaries.
  2. Execute tasks with TDD (invoke `harness-task:tdd`).
  3. Generate `phases/PH-{n}-summary.md` — minimal format: file changes + one-line per file.
  4. Update `status.json`: mark phase completed, advance to next.
  5. Compress context before starting next phase.
- When all phases are completed, advance stage to `verifying`.

### Stage: `verifying`

- Run full test suite.
- Review all phase summaries against the original proposal.
- Generate a final verification report.
- The change is now complete.

## Resuming a Change

When `/alles-dev` is invoked and `status.json` already exists:

| Current Stage | Action |
|---------------|--------|
| `init` | Advance to `prompting` |
| `prompting` | Check prompt.md, advance if filled |
| `refining` | Resume round 1 brainstorming |
| `proposing` | Resume round 2 brainstorming, or re-generate if files missing |
| `executing` | Find current phase from `status.json`, resume execution |
| `verifying` | Re-run verification |

## Status File Format

```json
{
  "branch": "feature/my-change",
  "change_dir": "feature-my-change",
  "stage": "executing",
  "created_at": "2026-04-02T00:00:00.000Z",
  "updated_at": "2026-04-02T01:00:00.000Z",
  "current_phase": "PH-2",
  "phases": [
    { "id": "PH-1", "title": "Setup", "status": "completed", "summary_file": "phases/PH-1-summary.md" },
    { "id": "PH-2", "title": "Core", "status": "in_progress" },
    { "id": "PH-3", "title": "Polish", "status": "pending" }
  ]
}
```

## Commit Format

All commits must follow: `{type}({scope}): description [{branch-name}]`

Examples:
- `feat(auth): add login endpoint [feature/auth]`
- `test(auth): add unit tests for login [feature/auth]`
- `refactor(auth): extract validation logic [feature/auth]`

## Rules

1. **Never skip the startup hook** — it must run before anything else.
2. **Never skip stages** — always follow the linear progression.
3. **Always persist stage changes** to `status.json` immediately.
4. **Always wait for user confirmation** before advancing from `proposing` to `executing`.
5. **TDD is mandatory** in every phase during `executing`.
6. **Compress context** between phases — carry only proposal + completed phase summaries.

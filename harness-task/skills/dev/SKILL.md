---
name: dev
description: Start or resume a development change. Orchestrates the 6-stage workflow — init, prompting, refining, proposing, executing, verifying.
user-invocable: true
---

# Dev — Main Workflow Orchestrator

You are the main entry point for the harness-task development workflow. Your job is to drive a change through 6 stages, delegating to specialized skills as needed.

## Startup Hook (MANDATORY — run FIRST)

Before anything else, execute these steps:

1. **Resolve the project root**: Use the current workspace/project root directory (NOT `~/Developer` or any home sub-directory). All `.dev-changes/` paths below are relative to this project root.
2. **Resolve the branch**: If a branch name argument was provided, use it. Otherwise use the current git branch.
3. **Switch/create branch**: If the repo is not on the target branch, switch to it or create it from the base branch.
4. **Ensure change directory**: Create `<project-root>/.dev-changes/{safe-branch-dir}/` if it doesn't exist.
5. **Ensure prompt.md**: Create `<project-root>/.dev-changes/{safe-branch-dir}/prompt.md` from template if it doesn't exist.
6. **Ensure status.json**: Create `<project-root>/.dev-changes/{safe-branch-dir}/status.json` with initial `init` stage if it doesn't exist.
7. **Read status.json**: Load current stage and phase progress.

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
- Update `prompt.md` with refined requirements based on user answers.
- Advance stage to `proposing`.
- **After advancing, immediately continue to the `proposing` stage below** — do NOT stop or wait for user input between rounds.

### Stage: `proposing`

- **Invoke skill `harness-task:brainstorming` — Round 2**.
- Compress previous context (summarize round 1 into a short block, then work from the updated `prompt.md` only).
- Use subagent to explore the codebase in parallel.
- Generate `proposal.md` and per-phase plan files (`phases/PH-{n}.md`).
- Populate `status.json` with phase list.
- **Wait for user confirmation** before advancing.
- Advance stage to `executing`.

### Stage: `executing`

- **Invoke skill `harness-task:executing`** for the current phase.
- For each phase:
  1. Load context: `proposal.md` + completed phase summaries from `status.json`.
  2. Read the current phase's plan from `phases/PH-{n}.md`.
  3. Execute tasks with TDD (invoke `harness-task:tdd`).
  4. Update `status.json`: mark phase completed, write summary string.
  5. **Adversarial review** (invoke `harness-task:phase-review`):
     - A `phase-reviewer` subagent is spawned with isolated context (only prompt.md + proposal.md + production code diff).
     - The reviewer scores the code across 6 weighted dimensions (7.0/10 pass threshold).
     - If score < 7.0: reviewer fixes code, a new reviewer re-evaluates (up to 3 rounds).
     - If 3 rounds fail: execution halts, user must decide how to proceed.
     - Review granularity adapts: <= 8 changed files = phase-level review; > 8 files = per-task review during Step 3.
  6. Advance `current_phase` to the next pending phase.
  7. Compress context before starting next phase.
- When all phases are completed, advance stage to `verifying`.

**Bug Reports**: If the user reports a bug during execution (describes unexpected behavior, test failures, or incorrect output), **stop current execution** and invoke `harness-task:bugfix`. The bugfix skill dispatches a zero-trust `bug-investigator` agent that independently audits all artifacts, discusses findings with the user, then patches proposal/phase files and resets `status.json`. After bugfix completes, resume executing from the reset phase.

### Stage: `verifying`

- Run full test suite.
- Review phase summaries in `status.json` against the original proposal.
- Generate a final verification report.
- The change is now complete.

## Resuming a Change

When `/alles-dev` is invoked and `status.json` already exists:

| Current Stage | Action |
|---------------|--------|
| `init` | Advance to `prompting` |
| `prompting` | Check prompt.md, advance if filled |
| `refining` | Resume round 1 brainstorming, then immediately continue to round 2 |
| `proposing` | Resume round 2 brainstorming (read updated prompt.md), or re-generate if files missing |
| `executing` | Find current phase from `status.json`, resume execution. If phases were reset by a bugfix (earlier phases completed but later ones pending), this is a post-bugfix resume — continue normally from `current_phase`. |
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
    { "id": "PH-1", "title": "Setup", "status": "completed", "summary": "src/index.ts: added entry point | tsconfig.json: configured compiler" },
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
6. **Compress context** between phases — carry only proposal + completed phase summaries from `status.json`.

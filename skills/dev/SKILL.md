---
name: dev
description: Start or resume a development change. Orchestrates the 6-stage workflow — init, prompting, refining, proposing, executing, verifying — with checkpoint-based question refinement.
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

- **Prerequisite**: `prompt.md` must already contain the user's requirements (filled during the `prompting` stage). Do NOT enter this stage with an empty prompt.
- **Invoke skill `harness-task:brainstorming`** — the brainstorming skill dispatches two specialized subagents with isolated context to drive three question checkpoints, tracked by `question_checkpoint` in `status.json` (0 → 1 → 2 → 3). The `analysis-agent` handles checkpoints 1–2 (requirement clarification), then the `proposal-agent` handles checkpoint 3 (code-first gap analysis and proposal generation).
- **Checkpoint 1 — Prompt-Input Clarification** (`question_checkpoint`: 0 → 1, agent: `analysis-agent`, tool budget: 15 code-reading calls, NO subagent):
  - Agent reads `prompt.md` (user's raw requirements) and explores the codebase to build context.
  - Agent asks at least 3 prompt-input questions (AskQuestion, single batch). Assumes the user has not read the code.
  - Agent updates `status.json`: set `question_checkpoint` to `1`. Stage remains `refining`.
- **Checkpoint 2 — Follow-up Clarification** (`question_checkpoint`: 1 → 2, agent: `analysis-agent`, tool budget: 5 targeted re-reads, NO subagent):
  - Agent analyzes Checkpoint 1 answers for divergence points (ambiguity, code-intent conflict, missing decisions).
  - Agent asks at least 3 follow-up questions (AskQuestion, single batch).
  - Agent updates `prompt.md` with refined requirements from both rounds.
  - Agent updates `status.json`: set `question_checkpoint` to `2`. Stage remains `refining`.
- **Checkpoint 3 — Proposal Transition** (`question_checkpoint`: 2 → 3, agent: `proposal-agent`, tool budget: 10 + explore subagents):
  - Agent deeply reads the codebase and systematically analyzes `prompt.md` for gaps against the actual code.
  - Agent asks at least 3 proposal-transition questions grounded in code evidence before generating artifacts.
  - Agent compresses prior context, reads updated `prompt.md` as single source of truth.
  - Agent generates `proposal.md` (product-level: module names + interfaces, NO file paths, MUST/MUST NOT/MAY boundaries).
  - Agent generates per-phase plan files (`phases/PH-{n}.md`) as self-contained technical specs (no estimated line counts).
  - Agent updates `status.json`: set `question_checkpoint` to `3`, set stage to `proposing`, populate phases array.
- **After Checkpoint 3, immediately continue to `proposing` stage below.**
- **Gate**: stage CANNOT advance from `refining` to `proposing` unless `question_checkpoint === 3`.

### Stage: `proposing`

- **User confirmation stage** — no new artifacts are generated here.
- Read `proposal.md` and present the proposal summary to the user.
- **Wait for user confirmation** before advancing.
- After confirmation, advance stage to `executing`.

### Stage: `executing`

- **Invoke skill `harness-task:executing`** — the main agent executes each phase directly.
- For each phase:
  0. **Phase Preamble**: reload context from files — read `proposal.md` + completed phase summaries from `status.json` + current `phases/PH-{n}.md`. Do NOT reference prior conversation history.
  1. Execute tasks with TDD (invoke `harness-task:tdd`). The main agent writes all code directly with full access to skills and rules.
  2. Update `status.json`: mark phase completed, write summary string.
  3. **Adversarial review** (invoke `harness-task:phase-review`):
     - A `phase-reviewer` subagent is spawned with isolated context (only prompt.md + proposal.md + production code diff).
     - The reviewer scores the code across 6 weighted dimensions (7.0/10 pass threshold).
     - If score < 7.0: reviewer fixes code, a new reviewer re-evaluates (up to 3 rounds).
     - If 3 rounds fail: execution halts, user must decide how to proceed.
     - Review granularity adapts: <= 8 changed files = phase-level review; > 8 files = per-task review during Step 1.
  4. **Context compression**: use compact tool if available; otherwise treat prior conversation as unavailable.
  5. Advance `current_phase` to the next pending phase.
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
| `refining` | Check `question_checkpoint` in `status.json` to determine resume point: `0` → Checkpoint 1 via `analysis-agent` (prompt-input questions), `1` → Checkpoint 2 via `analysis-agent` (follow-up questions), `2` → Checkpoint 3 via `proposal-agent` (code-first gap analysis, proposal-transition questions, and proposal generation). Each checkpoint gate ensures correct ordering. |
| `proposing` | Proposal and phase plans already exist. Present proposal to user for confirmation. If files are missing, go back to `refining` and restart. |
| `executing` | Find current phase from `status.json`, resume execution. If phases were reset by a bugfix (earlier phases completed but later ones pending), this is a post-bugfix resume — continue normally from `current_phase`. |
| `verifying` | Re-run verification |

## Status File Format

```json
{
  "branch": "feature/my-change",
  "change_dir": "feature-my-change",
  "stage": "executing",
  "question_checkpoint": 3,
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

**`question_checkpoint` values:**
- `0` or absent: question checkpoints not started
- `1`: Checkpoint 1 (prompt-input clarification) completed
- `2`: Checkpoint 2 (follow-up clarification) completed
- `3`: Checkpoint 3 (proposal transition) completed — all checkpoints done, stage can advance

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
4. **Three question checkpoints are mandatory** — each checkpoint updates `question_checkpoint` in `status.json` (1/2/3). Each checkpoint must ask at least 3 questions. Stage cannot advance from `refining` to `proposing` unless `question_checkpoint === 3`.
5. **Always wait for user confirmation** before advancing from `proposing` to `executing`.
6. **Main agent executes phases directly** — write code, run tests, and generate summaries yourself. No delegation to execution subagents.
7. **TDD is mandatory** in every phase during `executing`.
8. **Phase Preamble is mandatory** — every phase starts by reading proposal, summaries, and phase plan from files. Never rely on conversation history.
9. **Compress context after each phase** — use compact if available; otherwise treat prior conversation as unavailable. Always start the next phase with a fresh Preamble.

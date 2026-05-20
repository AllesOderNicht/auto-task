---
name: dev
description: Start or resume a development change. Orchestrates the 6-stage workflow — init, prompting, refining, proposing, executing, verifying — with four checkpoint-based question categories during refining.
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
- **Domain language check (soft, non-blocking)**: Check whether a `CONTEXT.md` or `CONTEXT-MAP.md` exists at the project root.
  - If neither exists, briefly mention: "No domain glossary found. If this project has specific domain terms, consider using `harness-task:domain-docs` to create a `CONTEXT.md` — it helps the analysis agent ask better questions during `refining`."
  - If either exists, silently proceed — no prompt needed.

### Stage: `prompting`

- Check if `prompt.md` has meaningful content (not just the template).
- If empty/template: ask the user to describe what they want. Write their response into `prompt.md`.
- If filled: advance stage to `refining`.

### Stage: `refining`

- **Prerequisite**: `prompt.md` must already contain the user's requirements (filled during the `prompting` stage). Do NOT enter this stage with an empty prompt.
- **Invoke skill `harness-task:refining-orchestrator`** — the refining-orchestrator skill dispatches two specialized subagents with isolated context to drive four question checkpoints, tracked by `question_checkpoint` in `status.json` (0 → 1 → 2 → 3 → 4). The `analysis-agent` handles checkpoints 1–3 (one per question category, multi-round per category), then the `proposal-agent` handles checkpoint 4 (code-first gap analysis and proposal generation).
- **Checkpoint 1 — Category 1: Overall Framing** (`question_checkpoint`: 0 → 1, agent: `analysis-agent`, code-reading guideline: < 10 calls per round, NO subagent):
  - Agent reads `prompt.md` + `status.json` and explores the codebase to build context for Category 1.
  - Agent runs unbounded rounds (3–5 questions per round) covering: scope assessment & sub-project decomposition, new-feature vs. modification judgement, reuse points (for new features), modification scope (for modifications), history compatibility. Per-round state (`current_question_category`, `round_in_category`) is persisted.
  - Agent appends Category 1 decisions to `prompt.md` and updates `status.json`: set `question_checkpoint` to `1`, clear per-category scratch. Stage remains `refining`.
- **Checkpoint 2 — Category 2: Feature Breakdown + Code Boundaries** (`question_checkpoint`: 1 → 2, agent: `analysis-agent`, code-reading guideline: < 10 calls per round, NO subagent):
  - Agent proposes the feature point list by walking the code (user does NOT invent the breakdown).
  - For each feature point, agent asserts the code modification boundary at the module/file level — user does NOT confirm boundaries, only feature-point intent and unclear cases.
  - Agent runs unbounded rounds until every feature point has a boundary recorded and every flagged ambiguity is resolved.
  - Agent appends Category 2 decisions to `prompt.md` and updates `status.json`: set `question_checkpoint` to `2`. Stage remains `refining`.
- **Checkpoint 3 — Category 3: Coherence + Open Design** (`question_checkpoint`: 2 → 3, agent: `analysis-agent`, code-reading guideline: < 10 calls per round, NO subagent):
  - Agent runs unbounded rounds covering: cross-feature coherence, industry-standard alternative patterns vs. the codebase pattern, residual open questions.
  - Agent rewrites `prompt.md` from scratch using the four-section template (Context / Sub-projects / Requirements / Scope) plus a new `## Feature Breakdown` section with per-feature 方案摘要 / 代码修改边界 / 设计思想 / 边界情况 / 关键 case / 用户操作路径.
  - Agent updates `status.json`: set `question_checkpoint` to `3`. Stage remains `refining`.
- **Checkpoint 4 — Proposal Transition** (`question_checkpoint`: 3 → 4, agent: `proposal-agent`, tool budget: 10 + explore subagents):
  - Agent deeply reads the codebase and systematically analyzes the rewritten `prompt.md` for gaps against the actual code.
  - Agent asks at least 3 proposal-transition questions grounded in code evidence before generating artifacts.
  - Agent compresses prior context, reads updated `prompt.md` as single source of truth.
  - Agent generates `proposal.md` (product-level: module names + interfaces, NO file paths, MUST/MUST NOT/MAY boundaries).
  - Agent generates per-phase plan files (`phases/PH-{n}.md`) as self-contained technical specs (no estimated line counts).
  - Agent updates `status.json`: set `question_checkpoint` to `4`, set stage to `proposing`, populate phases array.
- **After Checkpoint 4, immediately continue to `proposing` stage below.**
- **Gate**: stage CANNOT advance from `refining` to `proposing` unless `question_checkpoint === 4`. In addition, before presenting the proposal to the user, run the artifact validator:
  - Execute `hooks/validate-artifacts --change-dir <abs-path-to-.dev-changes/{safe-branch-dir}> --gate refining-to-proposing` via the Bash tool.
  - Exit code `0`: proceed to the `proposing` stage.
  - Non-zero exit code: the validator prints a structured JSON error to stderr listing the missing files / fields / H2 sections. Surface that error to the user verbatim and STOP — do not advance the stage. Re-invoke `harness-task:refining-orchestrator` to repair the artifacts, then re-run the validator.

### Stage: `proposing`

- **User confirmation stage** — no new artifacts are generated here.
- Read `proposal.md` and present the proposal summary to the user.
- **Wait for user confirmation** before advancing.
- After confirmation, advance stage to `executing`.

### Stage: `executing`

- **Invoke skill `harness-task:executing`** — the main agent executes each phase directly.
- For each phase:
  0. **Phase Preamble**: reload context from files — read `proposal.md` + completed phase summaries from `status.json` + current `phases/PH-{n}.md`. Do NOT reference prior conversation history.
  1. **Discover available skills, rules, and MCP tools** from the IDE environment (`.codebuddy/`, `.cursor/`, `.claude/` directories and active MCP session). Apply relevant ones encountered during task execution — do not assume a fixed list.
  2. Execute tasks with TDD (invoke `harness-task:tdd`). The main agent writes all code directly, applying discovered rules as constraints and invoking discovered skills/MCP tools at their natural trigger points.
  3. Update `status.json`: mark phase completed, write summary string.
  4. **Adversarial review** (invoke `harness-task:phase-review`):
     - A `phase-reviewer` subagent is spawned with isolated context (only prompt.md + proposal.md + production code diff).
     - The reviewer scores the code across 6 weighted dimensions (7.0/10 pass threshold).
     - If score < 7.0: reviewer fixes code, a new reviewer re-evaluates (up to 3 rounds).
     - If 3 rounds fail: execution halts, user must decide how to proceed.
     - Review granularity adapts: <= 8 changed files = phase-level review; > 8 files = per-task review during Step 2.
  5. **Context compression**: use compact tool if available; otherwise treat prior conversation as unavailable.
  6. Advance `current_phase` to the next pending phase.
- When all phases are completed, advance stage to `verifying`.

**Bug Reports**: If the user reports a bug during execution (describes unexpected behavior, test failures, or incorrect output), **stop current execution** and invoke `harness-task:bugfix`. The bugfix skill dispatches a zero-trust `bug-investigator` agent that independently audits all artifacts, discusses findings with the user, then patches proposal/phase files and resets `status.json`. After bugfix completes, resume executing from the reset phase.

### Stage: `verifying`

- Run full test suite.
- Review phase summaries in `status.json` against the original proposal.
- Generate a final verification report.
- **Architecture check (optional, soft):** After the verification report, count the number of new modules introduced by this change (from phase summaries). If the change introduced 3 or more new modules or significantly restructured existing ones, suggest:
  > "This change introduced several new modules. Consider running `harness-task:architecture-deepening` to check for shallow modules before archiving — it's easier to deepen now than after future changes build on top."
  
  The user can skip. This does not block archiving.
- The change is now complete.

## Resuming a Change

When `/alles-dev` is invoked and `status.json` already exists:

| Current Stage | Action |
|---------------|--------|
| `init` | Advance to `prompting` |
| `prompting` | Check prompt.md, advance if filled |
| `refining` | Check `question_checkpoint` in `status.json` to determine resume point: `0` → Checkpoint 1 via `analysis-agent` (Category 1: overall framing), `1` → Checkpoint 2 via `analysis-agent` (Category 2: feature breakdown + boundaries), `2` → Checkpoint 3 via `analysis-agent` (Category 3: coherence + open design + prompt.md rewrite), `3` → Checkpoint 4 via `proposal-agent` (code-first gap analysis, proposal-transition questions, and proposal generation). Within each category, `current_question_category` and `round_in_category` in `status.json` enable mid-category resume. Each checkpoint gate ensures correct ordering. |
| `proposing` | Proposal and phase plans already exist. Present proposal to user for confirmation. If files are missing, go back to `refining` and restart. |
| `executing` | Find current phase from `status.json`, resume execution. If phases were reset by a bugfix (earlier phases completed but later ones pending), this is a post-bugfix resume — continue normally from `current_phase`. |
| `verifying` | Re-run verification |

## Status File Format

```json
{
  "branch": "feature/my-change",
  "change_dir": "feature-my-change",
  "stage": "executing",
  "question_checkpoint": 4,
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
- `1`: Checkpoint 1 (Category 1 — overall framing) completed
- `2`: Checkpoint 2 (Category 2 — feature breakdown + code boundaries) completed
- `3`: Checkpoint 3 (Category 3 — coherence + open design, `prompt.md` rewritten) completed
- `4`: Checkpoint 4 (proposal transition) completed — all checkpoints done, stage can advance

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
4. **Four question checkpoints are mandatory** — each checkpoint updates `question_checkpoint` in `status.json` (1/2/3/4). `analysis-agent` runs unbounded multi-round Q&A within each of Categories 1–3 (3–5 questions per round); `proposal-agent` runs Checkpoint 4. Stage cannot advance from `refining` to `proposing` unless `question_checkpoint === 4`.
5. **Always wait for user confirmation** before advancing from `proposing` to `executing`.
6. **Main agent executes phases directly** — write code, run tests, and generate summaries yourself. No delegation to execution subagents.
7. **TDD is mandatory** in every phase during `executing`.
8. **Phase Preamble is mandatory** — every phase starts by reading proposal, summaries, and phase plan from files. Never rely on conversation history.
9. **Compress context after each phase** — use compact if available; otherwise treat prior conversation as unavailable. Always start the next phase with a fresh Preamble.

---
name: refining-orchestrator
description: Orchestrates the four checkpoint-based question stages of the refining stage. Dispatches analysis-agent (checkpoints 1–3, one per question category, multi-round per category) and proposal-agent (checkpoint 4) to drive code-grounded Q&A and proposal generation. Progress tracked in status.json via question_checkpoint (0→1→2→3→4). Despite the legacy term "brainstorming" used in earlier docs, this skill performs structured convergence, not divergent ideation.
---

# Refining Orchestrator — Agent Dispatcher

This skill orchestrates the `refining` stage. It does **not** perform Q&A or proposal generation itself; it dispatches two specialized subagents in isolated sessions and gates progress on `question_checkpoint` in `status.json`.

> **Naming note**: this skill was previously called `brainstorming`. The new name reflects what it actually does — structured requirement convergence with code-first analytical skepticism. The mental model is convergence, not divergent ideation.

## When to Invoke

Called by `harness-task:dev` when the stage is `refining` and `question_checkpoint < 4`.

**Prerequisite**: `prompt.md` must already contain the user's requirements (filled during the `prompting` stage).

---

## Single Source of Truth: Dispatch Table

This is the **only** authoritative mapping in this document. Everything else (resume behavior, gate logic, etc.) refers back to this table.

| `question_checkpoint` | Agent to dispatch | Phase the agent starts from | Goal | status.json after success |
|-----------------------|-------------------|-----------------------------|------|----------------------------|
| `0` or absent | `analysis-agent` | Category 1 — overall framing + reuse + sub-project decomposition + history compatibility | Multi-round Q&A (3–5 questions per round, unbounded rounds) until Category 1 closure criteria pass | `question_checkpoint: 1`, per-category scratch (`current_question_category`/`round_in_category`) cleared |
| `1` | `analysis-agent` | Category 2 — feature breakdown + per-feature code modification boundaries | Multi-round Q&A until Category 2 closure criteria pass | `question_checkpoint: 2`, per-category scratch cleared |
| `2` | `analysis-agent` | Category 3 — cross-feature coherence + open-ended design exploration | Multi-round Q&A until Category 3 closure criteria pass; `prompt.md` rewritten with `Feature Breakdown` section | `question_checkpoint: 3`, `prompt.md` rewritten, per-category scratch cleared |
| `3` | `proposal-agent` | Step 1 — read refined `prompt.md`, deep code exploration | Code-first gap analysis, proposal-transition questions, generate `proposal.md` + phase plans | `question_checkpoint: 4`, stage → `proposing` |
| `4` | (none) | — | All checkpoints complete; skip dispatch | unchanged |

**Hard gate**: stage CANNOT advance from `refining` to `proposing` until `question_checkpoint === 4`.

---

## Orchestration Workflow

### Step 1: Read Current Progress

Read `status.json` from the change directory. Determine the current `question_checkpoint` (default `0` if absent). Look up the row in the **Dispatch Table** above. If the row says "(none)", do NOT dispatch any agent — proceed directly to the `proposing` stage and return control to `harness-task:dev`.

### Step 2: Collect Inputs

Gather the inputs needed by the dispatched agent:

1. **Branch name** — the human-readable branch.
2. **Change directory path** — the absolute path to `.dev-changes/{safe-branch-dir}/`.
3. **Current `question_checkpoint` value** — the integer from `status.json`.
4. **Project context** — content of `.harness-task/context.md` if present (already injected by the `session-start` hook in most cases; pass through as-is).
5. **Tool budget** — the explicit numbers listed below (re-injected into the task prompt to close the SKILL→agent gap).

| Agent | Code-reading guideline | Subagent allowed? |
|-------|------------------------|-------------------|
| `analysis-agent` | Soft guideline: ≤ 5 calls per question round (unbounded rounds per category). Rounds that exceed it append a `code_reads_log` entry with `over_budget: true`; never aborts. | No |
| `proposal-agent` | Hard cap: 10 direct code-reading calls. | Yes (`explore` subagents allowed and encouraged) |

### Step 3: Dispatch the Agent

Use an **isolated subagent session** (no parent conversation history) and pass a **minimal task prompt** that only injects parameters. Do **not** rewrite the agent's SOP — the agent's own definition file is the single source of truth for its workflow.

#### Task prompt template (analysis-agent — used when `question_checkpoint` is 0, 1, or 2)

```
You are the analysis-agent operating on change "{branch-name}".

## Inputs
- Change directory: {absolute change directory path}
- question_checkpoint: {0, 1, or 2}
- Active question category: {1 if cp=0; 2 if cp=1; 3 if cp=2}
- Code-reading guideline: soft cap of 5 calls per round; unbounded rounds per category. Append a `code_reads_log` entry on excess. Subagents are forbidden.

## Project Context
{content of .harness-task/context.md, or "(not provided)"}

## Instruction
Execute your full workflow as defined in your agent definition (`agents/analysis-agent.md`). Drive multi-round Q&A within the active category until its closure criteria pass, then close the category by calling `advanceQuestionCheckpoint`. On Category 3, also rewrite `prompt.md` with the `Feature Breakdown` section before closing. Persist `question_checkpoint`, `current_question_category`, and `round_in_category` to `status.json` every round. Do not advance the stage; only update `question_checkpoint`.
```

#### Task prompt template (proposal-agent — used when `question_checkpoint` is 3)

```
You are the proposal-agent operating on change "{branch-name}".

## Inputs
- Change directory: {absolute change directory path}
- question_checkpoint: 3
- Tool budget — 10 direct code-reading calls; explore subagents allowed.

## Project Context
{content of .harness-task/context.md, or "(not provided)"}

## Instruction
Execute your full workflow as defined in your agent definition (`agents/proposal-agent.md`). After producing artifacts, set `question_checkpoint: 4` and `stage: proposing` in `status.json`, populate `phases[]`, set `current_phase` to the first phase id, then stop and return control to the dev skill. Do NOT advance the stage past `proposing` — user confirmation is owned by the dev skill.
```

### Step 4: Verify Artifacts

After the dispatched agent reports completion, run `hooks/validate-artifacts` (bash + jq, lives in this plugin's `hooks/` directory) for the matching checkpoint. The script exits non-zero on any failure and writes a structured JSON error to stderr.

| Reached `question_checkpoint` | Agent | Required artifacts | Validation |
|-------------------------------|-------|--------------------|-----------|
| `1` | `analysis-agent` | `status.json.question_checkpoint === 1`; Category 1 decisions appended to `prompt.md` | (no script gate at this checkpoint — fast-path back to Step 1) |
| `2` | `analysis-agent` | `status.json.question_checkpoint === 2`; Category 2 decisions appended to `prompt.md` | (no script gate at this checkpoint) |
| `3` | `analysis-agent` | `prompt.md` rewritten with refined requirements and `Feature Breakdown` section; `status.json.question_checkpoint === 3` | (no script gate at this checkpoint) |
| `4` | `proposal-agent` | `prompt.md` finalized (Checkpoint 4 decisions appended); `proposal.md` generated; `phases/PH-*.md` generated; `status.json.question_checkpoint === 4` and `stage === "proposing"` | **Run `hooks/validate-artifacts --change-dir <path> --gate refining-to-proposing`. If non-zero, surface the error to the user verbatim and STOP — do not silently advance.** |

If any expected artifact is missing or the gate script fails, surface the gap to the user. Never silently advance.

### Step 5: Gate Check

Re-read `status.json`:

- If `question_checkpoint === 4` and `stage === "proposing"`: orchestration complete. Return control to `harness-task:dev` for the user-confirmation flow that owns `proposing → executing`.
- If `question_checkpoint < 4`: the agent was interrupted mid-flow. The next invocation of this skill resumes per the **Dispatch Table**.

---

## Resume Behavior

On resume, re-read `status.json` and consult the **Dispatch Table** in the single-source-of-truth section above — it covers every resume case. The dispatched agent is responsible for re-reading `prompt.md` as its source of truth; prior conversation history is unavailable.

---

## Failure Handling

Treat every condition below as a **hard stop**: surface to the user, never silently advance. The orchestrator must not write `question_checkpoint` itself — only the dispatched agent writes it on success.

| Symptom | Detection point | Handling |
|---------|-----------------|----------|
| Subagent exits with an error / runtime exception | After Step 3 dispatch returns | Report the agent's error message verbatim. Leave `status.json` untouched. Next invocation will resume from the same `question_checkpoint`. |
| Subagent times out or is interrupted by the user | Dispatch returns without confirmation of completion | Report to the user. Re-read `status.json`; if `question_checkpoint` did not advance, treat as resumable from the same checkpoint. |
| `status.json` is missing or unparseable JSON | Step 1 read | Stop. Do NOT auto-create or repair — the file is owned by the dev skill's startup hook. Tell the user to verify the change directory. |
| `status.json` has `question_checkpoint` outside `{0,1,2,3,4}` or non-integer | Step 1 schema check | Stop. Surface the malformed value. Ask the user whether to reset (manually) or recover. |
| `validate-artifacts` exits non-zero (CP4 only) | Step 4 | Forward the script's stderr JSON to the user. Do NOT advance the stage. The agent or user must fix the artifacts; on re-invocation, the gate is re-run. |
| `prompt.md` was deleted or zeroed between phases | Any phase start | Stop. The agent must re-read `prompt.md` as ground truth — without it the analysis is meaningless. |
| Concurrent change-dir writes (e.g., two IDE windows on the same branch) | `status.json.updated_at` moves backwards or jumps without our action | Surface a conflict warning. Recommend the user close one session and re-invoke. |
| Partial artifacts from a previous failed CP4 (e.g., `proposal.md` exists but `phases/` is empty) | Step 4 gate | The gate script will fail; treat as a normal gate failure and surface. Do NOT delete partial artifacts automatically. |

Cross-cutting rules:
- **Never write `question_checkpoint` from this skill.** Only the dispatched agent owns checkpoint advancement.
- **Never write `stage` from this skill** — `proposing → executing` is owned by `harness-task:dev` after user confirmation.
- **Never auto-repair `status.json`.** It is created by the startup hook in `dev`; if it's broken, that's a higher-level concern.

---

## Output Artifacts

| Artifact | Written by | Location |
|----------|------------|----------|
| Updated `prompt.md` | `analysis-agent` (Categories 1/2/3 decisions appended; full rewrite at end of Category 3) and `proposal-agent` (Step 6) | `.dev-changes/{safe-branch-dir}/prompt.md` |
| `proposal.md` | `proposal-agent` (Step 8) | `.dev-changes/{safe-branch-dir}/proposal.md` |
| Phase plans `phases/PH-{n}.md` | `proposal-agent` (Step 9) | `.dev-changes/{safe-branch-dir}/phases/` |
| `status.json` updates (`question_checkpoint`, `current_question_category`, `round_in_category`, `code_reads_log`, `phases`, etc.) | Both agents (only the fields each owns) | `.dev-changes/{safe-branch-dir}/status.json` |

---

## Rules

1. **Dispatch only — never execute checkpoint logic inline.** Use the Dispatch Table to pick the agent.
2. **Isolated context is mandatory** — each agent session must have NO conversation history from the parent workflow.
3. **Task prompts are minimal** — inject parameters and explicit tool budgets only; do not rewrite agent SOPs.
4. **Run the gate script at CP4** — `hooks/validate-artifacts --gate refining-to-proposing` is mandatory before returning control to `dev`.
5. **Gate on `question_checkpoint === 4`** — the stage CANNOT advance from `refining` to `proposing` until this is true.
6. **`prompt.md` is the single source of truth** for downstream agents.
7. **`proposal.md` and `phases/PH-*.md` are mandatory artifacts** at CP4 completion.
8. **Phase plans must be self-contained** — each `phases/PH-{n}.md` is executable without reading other plans.
9. **Failure handling is a hard stop** — never silently advance, never auto-repair `status.json`, never write `stage` yourself.

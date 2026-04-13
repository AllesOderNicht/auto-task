---
name: brainstorming
description: Orchestrates three checkpoint-based question stages inside refining. Dispatches the analysis-agent (checkpoints 1–2) and proposal-agent (checkpoint 3) to drive code-grounded Q&A, divergence detection, and proposal generation. Progress tracked in status.json via question_checkpoint (0→1→2→3).
---

# Brainstorming — Agent Orchestration

This skill orchestrates the `refining` stage by dispatching two specialized subagents. The `analysis-agent` drives checkpoints 1–2 (requirement clarification and divergence detection), then the `proposal-agent` drives checkpoint 3 (code-first gap analysis, proposal-transition questions, and proposal generation). Progress is tracked in `status.json` via `question_checkpoint` (`0 → 1 → 2 → 3`). The stage can only advance from `refining` to `proposing` when `question_checkpoint === 3`.

**Checkpoint overview:**

| Checkpoint | Name | Agent | Goal | status.json update |
|------------|------|-------|------|--------------------|
| 1 | Prompt-Input Clarification | `analysis-agent` | Broad questions grounded in actual code (at least 3) | `question_checkpoint: 1` |
| 2 | Follow-up Clarification | `analysis-agent` | Divergence detection + follow-up questions (at least 3) | `question_checkpoint: 2` |
| 3 | Proposal Transition | `proposal-agent` | Code-first gap analysis, proposal-shaping questions, then generate `proposal.md` + self-contained phase plans | `question_checkpoint: 3`, then stage → `proposing` |

## When to Invoke

Called by `harness-task:dev` when the stage is `refining` and `question_checkpoint < 3`.

**Prerequisite**: `prompt.md` must already contain the user's requirements (filled during the `prompting` stage).

---

## Orchestration Workflow

### Step 1: Read Current Progress

Read `status.json` from the change directory. Determine the current `question_checkpoint` value (default `0` if absent).

| `question_checkpoint` | Agent to dispatch | Starts from |
|-----------------------|-------------------|-------------|
| `0` or absent | `analysis-agent` | Phase 1 — read code + prompt, ask prompt-input questions |
| `1` | `analysis-agent` | Phase 2 — analyze Phase 1 answers, ask follow-up questions |
| `2` | `proposal-agent` | Step 1 — deep code exploration, gap analysis, proposal-transition questions, generate proposal + phase plans |
| `3` | None | All checkpoints complete — skip dispatch, proceed to `proposing` |

If `question_checkpoint >= 3`, do NOT dispatch any agent. Proceed directly to the `proposing` stage.

### Step 2: Collect Context

Gather the inputs for the agent:

1. **Change directory path** — the full path to `.dev-changes/{safe-branch-dir}/` (contains `prompt.md`, `status.json`, and any existing artifacts).
2. **Current `question_checkpoint` value** — so the agent knows which phase to execute.
3. **Project context** — `.harness-task/context.md` and `.harness-task/specs/` if available.

### Step 3: Dispatch the Appropriate Agent

Based on `question_checkpoint`, dispatch either the `analysis-agent` or the `proposal-agent` with an isolated subagent session:

- **Isolated context**: A new subagent session with NO conversation history from the parent workflow.

#### When `question_checkpoint` is 0 or 1 → Dispatch `analysis-agent`

Task prompt:

```
You are analyzing change "{branch-name}".

## Change Directory
{change directory path}

## Current Progress
question_checkpoint: {value}

## Project Context
{content of .harness-task/context.md, if available}

Execute from the current question_checkpoint. Follow your two-phase protocol:
- Phase 1 (checkpoint 0→1): Read code + prompt, ask prompt-input questions.
- Phase 2 (checkpoint 1→2): Divergence detection, follow-up questions, update prompt.md.

Persist question_checkpoint to status.json after each phase.
```

**Tool budget** (enforced by the agent internally):

| Phase | Max code-reading tool calls | Subagent |
|-------|-----------------------------|----------|
| Phase 1 (Checkpoint 1) | 15 | Forbidden |
| Phase 2 (Checkpoint 2) | 5 (targeted re-reads only) | Forbidden |

#### When `question_checkpoint` is 2 → Dispatch `proposal-agent`

Task prompt:

```
You are generating a proposal for change "{branch-name}".

## Change Directory
{change directory path}

## Current Progress
question_checkpoint: 2

## Project Context
{content of .harness-task/context.md, if available}

Execute your full workflow:
1. Read the refined prompt.md (output of two prior checkpoint rounds).
2. Deep code exploration via explore subagent(s).
3. Analyze prompt.md for gaps against the codebase.
4. Ask at least 3 proposal-transition questions.
5. Update prompt.md with Checkpoint 3 decisions.
6. Generate proposal.md + per-phase plan files.
7. Update status.json: question_checkpoint → 3, stage → proposing.

Persist question_checkpoint to status.json after completion.
```

**Tool budget** (enforced by the agent internally):

| Activity | Max tool calls | Subagent |
|----------|----------------|----------|
| Direct code-reading | 10 | Allowed (explore subagents) |

### Step 4: Verify Artifacts

After the dispatched agent completes, verify the expected outputs exist:

| `question_checkpoint` reached | Agent | Expected artifacts |
|-------------------------------|-------|--------------------|
| `1` | `analysis-agent` | `status.json` updated with `question_checkpoint: 1` |
| `2` | `analysis-agent` | `prompt.md` rewritten with refined requirements; `status.json` updated with `question_checkpoint: 2` |
| `3` | `proposal-agent` | `prompt.md` finalized; `proposal.md` generated; `phases/PH-{n}.md` files generated; `status.json` updated with `question_checkpoint: 3` and stage set to `proposing` |

If any expected artifact is missing, report the gap to the user — do NOT silently advance.

### Step 5: Gate Check

Read `status.json` one final time:

- If `question_checkpoint === 3` and stage is `proposing`: orchestration is complete. Return control to `harness-task:dev` for user confirmation.
- If `question_checkpoint < 3`: the agent was interrupted mid-flow. The next invocation of this skill will resume from the current checkpoint (see Resume Behavior).

---

## Resume Behavior

When resuming a conversation that was interrupted during `refining`, check `question_checkpoint` in `status.json`:

| `question_checkpoint` | Resume from |
|-----------------------|-------------|
| `0` or undefined | Dispatch `analysis-agent` from Phase 1 |
| `1` | Dispatch `analysis-agent` from Phase 2 |
| `2` | Dispatch `proposal-agent` from Step 1 |
| `3` | All checkpoints complete — proceed to `proposing` stage |

The dispatched agent re-reads `prompt.md` as the source of truth on resume. Prior conversation history is unavailable.

---

## Output Artifacts

| Artifact | Written by | Location |
|----------|------------|----------|
| Updated `prompt.md` | `analysis-agent` (Phase 2), `proposal-agent` (Step 6) | `.dev-changes/{safe-branch-dir}/prompt.md` |
| `proposal.md` | `proposal-agent` (Step 8) | `.dev-changes/{safe-branch-dir}/proposal.md` |
| Phase plans | `proposal-agent` (Step 9) | `.dev-changes/{safe-branch-dir}/phases/PH-{n}.md` |
| `status.json` updates | Both agents | `.dev-changes/{safe-branch-dir}/status.json` |

---

## Rules

1. **Dispatch the correct agent based on `question_checkpoint`** — `analysis-agent` for checkpoints 0–1, `proposal-agent` for checkpoint 2. Do NOT execute checkpoint logic inline.
2. **Isolated context is mandatory** — each agent session must have NO conversation history from the parent workflow.
3. **Verify artifacts after dispatch** — never assume the agent succeeded; check files exist.
4. **Gate on `question_checkpoint === 3`** — the stage CANNOT advance from `refining` to `proposing` unless all three checkpoints are complete.
5. **`prompt.md` is the single source of truth** — after the `analysis-agent` completes Phase 2, all requirements live in this file.
6. **`proposal.md` is a mandatory artifact** — the `proposal-agent` must produce it before advancing.
7. **Phase plans must be self-contained** — each `phases/PH-{n}.md` is executable without reading other plans.

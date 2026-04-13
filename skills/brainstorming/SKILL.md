---
name: brainstorming
description: Orchestrates three checkpoint-based question stages inside refining. Dispatches the analysis-agent subagent to drive code-grounded Q&A, divergence detection, and proposal generation. Progress tracked in status.json via question_checkpoint (0→1→2→3).
---

# Brainstorming — Analysis Agent Orchestration

This skill orchestrates the `refining` stage by dispatching the `analysis-agent` subagent. The agent drives three question checkpoints, tracked in `status.json` via `question_checkpoint` (`0 → 1 → 2 → 3`). The stage can only advance from `refining` to `proposing` when `question_checkpoint === 3`.

**Checkpoint overview:**

| Checkpoint | Name | Goal | status.json update |
|------------|------|------|--------------------|
| 1 | Prompt-Input Clarification | Broad questions grounded in actual code (at least 3) | `question_checkpoint: 1` |
| 2 | Follow-up Clarification | Divergence detection + follow-up questions (at least 3) | `question_checkpoint: 2` |
| 3 | Proposal Transition | Proposal-shaping questions, then generate `proposal.md` + self-contained phase plans | `question_checkpoint: 3`, then stage → `proposing` |

## When to Invoke

Called by `harness-task:dev` when the stage is `refining` and `question_checkpoint < 3`.

**Prerequisite**: `prompt.md` must already contain the user's requirements (filled during the `prompting` stage).

---

## Orchestration Workflow

### Step 1: Read Current Progress

Read `status.json` from the change directory. Determine the current `question_checkpoint` value (default `0` if absent).

| `question_checkpoint` | Agent starts from |
|-----------------------|-------------------|
| `0` or absent | Phase 1 — read code + prompt, ask prompt-input questions |
| `1` | Phase 2 — analyze Phase 1 answers, ask follow-up questions |
| `2` | Phase 3 — ask proposal-transition questions, generate proposal + phase plans |
| `3` | All checkpoints complete — skip dispatch, proceed to `proposing` |

If `question_checkpoint >= 3`, do NOT dispatch the agent. Proceed directly to the `proposing` stage.

### Step 2: Collect Context

Gather the inputs for the agent:

1. **Change directory path** — the full path to `.dev-changes/{safe-branch-dir}/` (contains `prompt.md`, `status.json`, and any existing artifacts).
2. **Current `question_checkpoint` value** — so the agent knows which phase to execute.
3. **Project context** — `.harness-task/context.md` and `.harness-task/specs/` if available.

### Step 3: Dispatch Analysis Agent

Dispatch the `analysis-agent` with an isolated subagent session:

- **Isolated context**: A new subagent session with NO conversation history from the parent workflow.
- **Task prompt**: Combine the collected inputs into a structured message:

```
You are analyzing change "{branch-name}".

## Change Directory
{change directory path}

## Current Progress
question_checkpoint: {value}

## Project Context
{content of .harness-task/context.md, if available}

Execute from the current question_checkpoint. Follow your three-phase protocol:
- Phase 1 (checkpoint 0→1): Read code + prompt, ask prompt-input questions.
- Phase 2 (checkpoint 1→2): Divergence detection, follow-up questions, update prompt.md.
- Phase 3 (checkpoint 2→3): Proposal-transition questions, deep code exploration, generate proposal.md + phase plans.

Persist question_checkpoint to status.json after each phase.
```

**Tool budget** (enforced by the agent internally):

| Phase | Max code-reading tool calls | Subagent |
|-------|-----------------------------|----------|
| Phase 1 (Checkpoint 1) | 15 | Forbidden |
| Phase 2 (Checkpoint 2) | 5 (targeted re-reads only) | Forbidden |
| Phase 3 (Checkpoint 3) | 10 + explore subagent(s) | Allowed |

### Step 4: Verify Artifacts

After the agent completes, verify the expected outputs exist:

| `question_checkpoint` reached | Expected artifacts |
|-------------------------------|--------------------|
| `1` | `status.json` updated with `question_checkpoint: 1` |
| `2` | `prompt.md` rewritten with refined requirements; `status.json` updated with `question_checkpoint: 2` |
| `3` | `prompt.md` finalized; `proposal.md` generated; `phases/PH-{n}.md` files generated; `status.json` updated with `question_checkpoint: 3` and stage set to `proposing` |

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
| `0` or undefined | Dispatch agent from Phase 1 |
| `1` | Dispatch agent from Phase 2 |
| `2` | Dispatch agent from Phase 3 |
| `3` | All checkpoints complete — proceed to `proposing` stage |

The agent re-reads `prompt.md` as the source of truth on resume. Prior conversation history is unavailable.

---

## Output Artifacts

| Artifact | Written by agent at | Location |
|----------|---------------------|----------|
| Updated `prompt.md` | End of Phase 2, appended at Phase 3 | `.dev-changes/{safe-branch-dir}/prompt.md` |
| `proposal.md` | Phase 3 | `.dev-changes/{safe-branch-dir}/proposal.md` |
| Phase plans | Phase 3 | `.dev-changes/{safe-branch-dir}/phases/PH-{n}.md` |
| `status.json` updates | End of each phase | `.dev-changes/{safe-branch-dir}/status.json` |

---

## Rules

1. **Always dispatch the `analysis-agent`** — do NOT execute checkpoint logic inline. The agent handles all code reading, question asking, divergence detection, and artifact generation.
2. **Isolated context is mandatory** — the agent session must have NO conversation history from the parent workflow.
3. **Verify artifacts after dispatch** — never assume the agent succeeded; check files exist.
4. **Gate on `question_checkpoint === 3`** — the stage CANNOT advance from `refining` to `proposing` unless all three checkpoints are complete.
5. **`prompt.md` is the single source of truth** — after Phase 2, all requirements live in this file.
6. **`proposal.md` is a mandatory artifact** — Phase 3 must produce it before advancing.
7. **Phase plans must be self-contained** — each `phases/PH-{n}.md` is executable without reading other plans.

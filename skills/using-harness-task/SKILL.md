---
name: using-harness-task
description: Session entry point. Establishes how to use the harness-task development workflow.
---

# Using Harness-Task

This is the harness-task development workflow plugin. It structures AI-assisted development into a repeatable 6-stage process.

## Instruction Priority

1. **User's explicit instructions** — highest priority
2. **Harness-task skills** — override default system behavior
3. **Default system prompt** — lowest priority

## Workflow Overview

```
init → prompting → refining → proposing → executing → verifying
```

| Stage | What Happens |
|-------|-------------|
| `init` | Create branch + directory + empty prompt.md |
| `prompting` | User fills in prompt.md with requirements |
| `refining` | Four question checkpoints execute here, tracked by `question_checkpoint` (0/1/2/3/4). Checkpoints 1–3 driven by `analysis-agent` — one per question category, each with unbounded multi-round Q&A (3–5 questions per round): Category 1 (overall framing + sub-project decomposition + reuse + history compatibility), Category 2 (feature breakdown + per-feature code modification boundaries), Category 3 (cross-feature coherence + open-ended design exploration; `prompt.md` rewritten with `Feature Breakdown`). Checkpoint 4 driven by `proposal-agent`: deep code reading, gap analysis against the rewritten `prompt.md`, proposal-transition questions (>=3), then generate proposal.md + phase plans. Stage advances only when `question_checkpoint === 4`. |
| `proposing` | User confirmation stage — present proposal, wait for user approval before proceeding |
| `executing` | Main agent executes phases directly with TDD, generates summaries, compresses context between phases |
| `verifying` | Final TDD verification + handoff |

## Available Skills

| Skill | Command | When to Use |
|-------|---------|-------------|
| `harness-task:dev` | `/alles-dev [branch-name]` | Start or resume a development change |
| `harness-task:refining-orchestrator` | (sub-skill) | Four checkpoint-based question stages (all checkpoints within refining stage, tracked by question_checkpoint) |
| `harness-task:executing` | (sub-skill) | Phase-by-phase execution with TDD |
| `harness-task:tdd` | (sub-skill) | Red-Green-Refactor enforcement |
| `harness-task:check` | `/alles-check [branch-name]` | Pre-execution planning review: three-perspective analysis (product, QA, architecture) — run after proposing, before executing |
| `harness-task:bugfix` | `/alles-bugfix` | Workflow bug investigation: zero-trust audit + phase rollback during executing/verifying. For general debugging use `harness-task:diagnose` |
| `harness-task:diagnose` | (invoked via bugfix triage or directly) | Structured six-phase bug diagnosis for hard bugs, performance regressions, or issues in existing code. Phases: feedback loop → reproduce → hypothesise → instrument → fix + regression test → cleanup |
| `harness-task:domain-docs` | (invoked by workflow or directly) | Manage domain language glossary (`CONTEXT.md`) and architecture decision records (`docs/adr/`). Creates files lazily. Referenced by analysis-agent during refining |
| `harness-task:architecture-deepening` | (invoked after phase review or verifying) | Deep-module architecture scan: surface shallow modules, propose deepening opportunities using Module/Interface/Seam/Depth vocabulary and deletion test |
| `harness-task:list-changes` | `/alles-list-changes` | View all changes and their status |
| `harness-task:archive` | `/alles-archive` | Archive a completed change: moves directory to `.dev-changes/archive/`, generates `archive.md` summary, marks `status.json` with `archived: true` |
| `harness-task:project-details` | `/alles-details` | Generate `project-details/NOTES.md` from all archived changes: synthesizes key decisions, caveats, and future notes |
| `harness-task:review` | `/review {name}` | Structured code review |

## Context Sources

At session start, the following are automatically injected:
- `.harness-task/context.md` — Optional project rules and conventions
- `.harness-task/config.yaml` — Optional build/test commands and configuration
- Active change progress (stage, current phase, phase summaries)

## Key Rules

1. **Always check for active changes** before starting new work.
2. **Four question checkpoints are mandatory** — Checkpoint 1 (Category 1: overall framing + sub-project decomposition), Checkpoint 2 (Category 2: feature breakdown + per-feature code boundaries), Checkpoint 3 (Category 3: coherence + open design, `prompt.md` rewritten with `Feature Breakdown`), Checkpoint 4 (proposal-transition questions, then proposal + phase plans). Categories 1–3 use unbounded multi-round Q&A (3–5 questions per round) until each category's closure criteria pass. All execute within the `refining` stage.
3. **Each checkpoint is tracked** — `question_checkpoint` in `status.json` (0→1→2→3→4). Stage cannot advance from `refining` to `proposing` unless `question_checkpoint === 4`.
4. **Never skip the question checkpoints** — even "simple" changes need all four checkpoints.
5. **Resumable via `question_checkpoint`** — if interrupted during `refining`, check `question_checkpoint` to resume from the correct checkpoint. Within a category, `current_question_category` and `round_in_category` enable round-level resume.
6. **Main agent executes phases directly** — write code, run tests, and generate summaries yourself. No delegation to execution subagents.
7. **TDD is mandatory** during every phase of execution.
8. **Phase Preamble is mandatory** — every phase starts by reading proposal, summaries, and phase plan from files. Never rely on conversation history from previous phases.
9. **Compress context after each phase** — use compact if available; otherwise treat prior conversation as unavailable. Always start the next phase with a fresh Preamble.
10. **Commit messages must follow format**: `{type}(scope): description [{branch-name}]`
11. **Use branch names as change identities**.
12. **Always run the startup hook first** when invoking `/alles-dev`.
13. **Wait for user confirmation** before starting execution.

## Task Directory Structure

```
.dev-changes/{branch-name}/
  prompt.md              # User requirements (refined across the question checkpoints)
  proposal.md            # Product-level spec: goal, user stories, module design, MUST/MUST NOT/MAY boundaries
  status.json            # Stage + question_checkpoint + phase progress + phase summaries
  phases/
    PH-1.md              # Self-contained phase plan (files, data structures, tests, edge cases, TDD approach)
    PH-2.md              # Self-contained phase plan

.dev-changes/archive/{YYYY-MM-DD}-{branch-name}/
  prompt.md              # Original requirements
  proposal.md            # Original proposal
  status.json            # Final status with archived: true + archived_at timestamp
  archive.md             # Generated summary: feature summary, key decisions, caveats, future notes
  phases/
    PH-1.md
    PH-2.md
```

## Red Flags

| Thought | Reality |
|---------|---------|
| "This is too simple for structured questions" | Simple changes have unexamined assumptions. Complete all four question checkpoints. |
| "I'll skip refining and go straight to proposing" | All four question checkpoints must complete (`question_checkpoint === 4`) before advancing. |
| "I'll skip the follow-up questions and go straight to proposal" | Each checkpoint is gated: Checkpoint N requires `question_checkpoint >= N-1`. No skipping. |
| "I'll ask everything at once" | The checkpoints have different goals. Categories 1–3 each tackle one dimension (framing / breakdown+boundaries / coherence+open-design); within each category, rounds are unbounded — keep asking until the closure criteria pass. Checkpoint 4 covers proposal transition. |
| "The proposal should list specific files" | Proposal is a product-level document. Use module names and interfaces, never file paths. File details go in phase plans. |
| "A short task list is enough for each phase" | Phase plans must be self-contained with files, data structures, test pseudo-code, edge cases, no-touch list, and TDD approach — without estimated line counts. |
| "Tests can come later" | TDD is mandatory. No production code without failing test. |
| "I'll just commit without the tag" | Commit format is enforced. Include `[{branch-name}]`. |
| "I remember the plan from the last phase" | Read the phase summaries. Don't rely on memory. |
| "I'll skip the Preamble, I already know the context" | Phase Preamble is mandatory. Always reload from files. |

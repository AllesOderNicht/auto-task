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
| `refining` | Three question checkpoints execute here, tracked by `question_checkpoint` (0/1/2/3). Checkpoints 1–2 driven by `analysis-agent`: prompt-input questions (>=3), follow-up questions (>=3), update prompt.md. Checkpoint 3 driven by `proposal-agent`: deep code reading, gap analysis against prompt.md, proposal-transition questions (>=3), then generate proposal.md + phase plans. Stage advances only when `question_checkpoint === 3`. |
| `proposing` | User confirmation stage — present proposal, wait for user approval before proceeding |
| `executing` | Main agent executes phases directly with TDD, generates summaries, compresses context between phases |
| `verifying` | Final TDD verification + handoff |

## Available Skills

| Skill | Command | When to Use |
|-------|---------|-------------|
| `harness-task:dev` | `/alles-dev [branch-name]` | Start or resume a development change |
| `harness-task:brainstorming` | (sub-skill) | Three checkpoint-based question stages (all checkpoints within refining stage, tracked by question_checkpoint) |
| `harness-task:executing` | (sub-skill) | Phase-by-phase execution with TDD |
| `harness-task:tdd` | (sub-skill) | Red-Green-Refactor enforcement |
| `harness-task:bugfix` | `/alles-bugfix` | Zero-trust bug investigation during executing/verifying |
| `harness-task:list-changes` | `/alles-list-changes` | View all changes and their status |
| `harness-task:archive` | `/alles-archive` | Archive a completed change |
| `harness-task:review` | `/review {name}` | Structured code review |

## Context Sources

At session start, the following are automatically injected:
- `.harness-task/context.md` — Optional project rules and conventions
- `.harness-task/config.yaml` — Optional build/test commands and configuration
- Active change progress (stage, current phase, phase summaries)

## Key Rules

1. **Always check for active changes** before starting new work.
2. **Three question checkpoints are mandatory** — Checkpoint 1 (prompt-input questions >=3), Checkpoint 2 (follow-up questions >=3), Checkpoint 3 (proposal-transition questions >=3, then proposal + phase plans). All execute within the `refining` stage.
3. **Each checkpoint is tracked** — `question_checkpoint` in `status.json` (0→1→2→3). Stage cannot advance from `refining` to `proposing` unless `question_checkpoint === 3`.
4. **Never skip the question checkpoints** — even "simple" changes need all three checkpoints.
5. **Resumable via `question_checkpoint`** — if interrupted during `refining`, check `question_checkpoint` to resume from the correct checkpoint.
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
```

## Red Flags

| Thought | Reality |
|---------|---------|
| "This is too simple for structured questions" | Simple changes have unexamined assumptions. Complete all three question checkpoints. |
| "I'll skip refining and go straight to proposing" | All three question checkpoints must complete (`question_checkpoint === 3`) before advancing. |
| "I'll skip the follow-up questions and go straight to proposal" | Each checkpoint is gated: Checkpoint 2 requires `question_checkpoint >= 1`, Checkpoint 3 requires `question_checkpoint >= 2`. No skipping. |
| "I'll ask everything at once" | The checkpoints have different goals. Checkpoint 1 asks prompt-input questions, Checkpoint 2 resolves follow-up ambiguities, Checkpoint 3 asks proposal-transition questions. Each checkpoint still needs at least 3 questions. |
| "The proposal should list specific files" | Proposal is a product-level document. Use module names and interfaces, never file paths. File details go in phase plans. |
| "A short task list is enough for each phase" | Phase plans must be self-contained with files, data structures, test pseudo-code, edge cases, no-touch list, and TDD approach — without estimated line counts. |
| "Tests can come later" | TDD is mandatory. No production code without failing test. |
| "I'll just commit without the tag" | Commit format is enforced. Include `[{branch-name}]`. |
| "I remember the plan from the last phase" | Read the phase summaries. Don't rely on memory. |
| "I'll skip the Preamble, I already know the context" | Phase Preamble is mandatory. Always reload from files. |

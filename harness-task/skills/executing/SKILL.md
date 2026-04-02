---
name: executing
description: Phase executor. Runs each phase with TDD, generates summaries, compresses context between phases.
---

# Executing — Phase-by-Phase Implementation

This skill drives the `executing` stage. It processes one phase at a time, enforcing TDD and generating summaries.

## Phase Execution Loop

For each phase in `status.json`:

### 1. Load Context

Read before starting:
- `proposal.md` — overall goals and scope
- `phases/PH-{n}.md` — current phase's plan and task list
- `status.json` — completed phase summaries (in each phase's `summary` field)

Do NOT read the full conversation history from previous phases. The phase summaries in `status.json` are your compressed context.

### 2. Start Phase

- Update `status.json`: set current phase to `in_progress`.
- Read the current phase's tasks from `phases/PH-{n}.md`.

### 3. Execute Tasks with TDD

For each task in the current phase:

1. **Invoke `harness-task:tdd`** — follow Red-Green-Refactor:
   - **RED**: Write a failing test for the task's behavior.
   - **GREEN**: Write minimal implementation to pass.
   - **REFACTOR**: Clean up while keeping tests green.
2. **Commit** after each task or logical group:
   - Format: `{type}({scope}): description [{branch-name}]`

### 4. Update Status with Summary

After all tasks in a phase are complete, update `status.json`:
- Mark phase as `completed`.
- Write a **minimal** `summary` string: file changes with one-line descriptions, pipe-separated.
  Example: `"src/auth.ts: added login handler | tests/auth.test.ts: login unit tests"`
- If more phases remain: advance `current_phase` to the next pending phase.
- If all phases complete: update stage to `verifying`.

### 5. Compress Context

Before starting the next phase:
- For the next phase, only load: `proposal.md` + completed phase summaries from `status.json`.
- Do NOT carry implementation details, code snippets, or conversation history from previous phases.

## Error Handling

- If a test fails unexpectedly during a phase, investigate and fix before proceeding.
- If a build breaks, fix it before marking the phase complete.
- If blocked, update `status.json` and report to the user — do not improvise.
- If the task plan needs adjustment, discuss with the user first.

## Bug Reports

If the user reports a bug during phase execution:

1. **Do NOT attempt to fix it inline** — the current execution context may share the same blind spots that caused the bug.
2. **Invoke `harness-task:bugfix`** — this dispatches a `bug-investigator` agent with a zero-trust mindset that independently re-reads all artifacts (prompt, proposal, phase plans, source code, tests).
3. **The bugfix skill handles everything**: investigation, user discussion, proposal/phase file updates, and `status.json` reset.
4. **After bugfix completes**, the executing skill resumes from the updated `current_phase` in `status.json` as if it were a normal resume.

Signs that the user is reporting a bug (not a normal test failure):
- "There's a bug in..." or "This doesn't work correctly"
- Describes unexpected behavior that differs from the proposal
- Reports a problem discovered after a phase was marked completed
- Mentions issues that span multiple phases or require plan changes

## Resuming Execution

If execution was interrupted (conversation ended mid-phase):

1. Read `status.json` to find the current phase.
2. Check which tasks in that phase have been completed (via git log or file state).
3. Resume from the first uncompleted task.

## Rules

1. **One phase at a time** — never work on multiple phases simultaneously.
2. **TDD is mandatory** — no production code without a failing test first.
3. **Commit after each task** — small, atomic commits.
4. **Minimal summaries** — file changes + one-line descriptions only.
5. **Context compression is mandatory** — never carry full context between phases.
6. **User can abort** — if the user says stop, persist current progress and stop.

---
name: executing
description: Phase executor. Runs each phase with TDD, generates summaries, compresses context between phases.
---

# Executing — Phase-by-Phase Implementation

This skill drives the `executing` stage. It processes one phase at a time, enforcing TDD and generating summaries.

## Phase Execution Loop

For each phase in `status.json`:

### 1. Load Context

Read these files before starting:
- `proposal.md` — overall goals and scope
- `design.md` — technical approach
- `tasks.md` — current phase's task list
- All completed `phases/PH-{n}-summary.md` files — what was done before

Do NOT read the full conversation history from previous phases. The phase summaries are your compressed context.

### 2. Start Phase

- Update `status.json`: set current phase to `in_progress`.
- Read the current phase's tasks from `tasks.md`.

### 3. Execute Tasks with TDD

For each task in the current phase:

1. **Invoke `harness-task:tdd`** — follow Red-Green-Refactor:
   - **RED**: Write a failing test for the task's behavior.
   - **GREEN**: Write minimal implementation to pass.
   - **REFACTOR**: Clean up while keeping tests green.
2. **Commit** after each task or logical group:
   - Format: `{type}({scope}): description [{branch-name}]`

### 4. Generate Phase Summary

After all tasks in a phase are complete, create `phases/PH-{n}-summary.md`:

```markdown
# PH-{n}: {Phase Title}

## Files Changed

| File | Change |
|------|--------|
| path/to/file.ts | One-line description of what changed |
| path/to/test.ts | One-line description of what changed |
```

This is a **minimal** summary — just file changes and one-line descriptions. No full code, no detailed explanations.

### 5. Update Status

- Update `status.json`: mark phase as `completed`, set `summary_file`.
- If more phases remain: advance `current_phase` to the next pending phase.
- If all phases complete: update stage to `verifying`.

### 6. Compress Context

Before starting the next phase:
- Summarize the current phase's work into its summary file (already done in step 4).
- For the next phase, only load: `proposal.md` + `design.md` + all completed phase summaries.
- Do NOT carry implementation details, code snippets, or conversation history from previous phases.

## Error Handling

- If a test fails unexpectedly during a phase, investigate and fix before proceeding.
- If a build breaks, fix it before marking the phase complete.
- If blocked, update `status.json` and report to the user — do not improvise.
- If the task plan needs adjustment, discuss with the user first.

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

---
name: executing
description: Phase executor. Runs each phase with TDD, generates summaries, triggers adversarial review, compresses context between phases.
---

# Executing — Phase-by-Phase Implementation

This skill drives the `executing` stage. It processes one phase at a time, enforcing TDD, generating summaries, and triggering adversarial code review before advancing.

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
3. **Per-task review (large phases only)**: If the phase has > 8 changed files, invoke `harness-task:phase-review` after each task's TDD cycle. See Step 4.5 for details.

### 4. Update Status with Summary

After all tasks in a phase are complete, update `status.json`:
- Mark phase as `completed`.
- Write a **minimal** `summary` string: file changes with one-line descriptions, pipe-separated.
  Example: `"src/auth.ts: added login handler | tests/auth.test.ts: login unit tests"`

### 4.5. Phase Review — Adversarial Code Evaluation

**Invoke `harness-task:phase-review`** to trigger an isolated, adversarial code review.

**Review granularity** depends on the number of files changed in this phase:
- **<= 8 files changed**: Review the entire phase at once (after Step 4, before Step 5).
- **> 8 files changed**: Review was already triggered per-task during Step 3.

**What happens during review:**
1. A new `phase-reviewer` subagent is spawned with isolated context (prompt.md + proposal.md + production code diff ONLY — no test code, no conversation history).
2. The reviewer scores the code across 6 weighted dimensions (Proposal Alignment, Code Quality, Test Coverage, Security, Performance, Plan Compliance).
3. If the weighted average score >= 7.0/10: **PASS** — proceed to Step 5.
4. If score < 7.0: The reviewer fixes the code, then a **new** reviewer subagent re-evaluates (up to 3 rounds).
5. If all 3 rounds fail: **ESCALATE** — halt and present the user with score history and critical issues.

**After review passes**, update `status.json`:
- Record `review_score` and `review_round` on the phase.
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
- If a review escalation occurs, halt execution and wait for user decision before proceeding.

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
5. **Review is mandatory** — every phase must pass adversarial review before advancing.
6. **Context compression is mandatory** — never carry full context between phases.
7. **User can abort** — if the user says stop, persist current progress and stop.

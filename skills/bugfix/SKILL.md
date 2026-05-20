---
name: bugfix
description: Bug investigation and fix workflow. Dispatches a zero-trust bug-investigator agent to trace root cause, discuss with user, patch proposal/phase files, and reset status.json for re-execution.
---

# Bugfix — Zero-Trust Investigation and Remediation

This skill handles bug reports during the `executing` or `verifying` stage. It dispatches a `bug-investigator` agent that independently audits all artifacts with full skepticism, then autonomously patches the plan files and resets execution state.

## When to Invoke

Invoke this skill when ALL of these are true:
- The current stage is `executing` or `verifying`.
- The user reports a bug: describes unexpected behavior, test failures, runtime errors, or incorrect output.
- The bug is in code produced by the current change (not a pre-existing issue).

Do NOT invoke this skill for:
- Build errors during normal TDD cycles (handle in `harness-task:executing`).
- Requirement changes or scope expansions (restart the `harness-task:refining-orchestrator` skill instead).
- Bugs in infrastructure or tooling unrelated to the current change.

## Bug Type Triage — Choose the Right Path

Before dispatching the `bug-investigator`, determine which type of bug this is. Ask the user if unclear.

| Type | Indicators | Path |
|------|-----------|------|
| **Workflow bug** (use this skill) | Bug is in code written during the current executing workflow; fixing it requires re-running one or more phases; `status.json` needs to be rolled back | Continue with this skill → `bug-investigator` |
| **General debug** (use `diagnose`) | Bug origin is unclear; pre-existing code is involved; performance regression; user says "diagnose this" or "debug this"; no phase rollback needed | Invoke `harness-task:diagnose` instead |

**If this is a general debug situation**, invoke `harness-task:diagnose` and do not proceed further with this skill. The `diagnose` skill provides a structured six-phase investigation (feedback loop → reproduce → hypothesise → instrument → fix + regression test → cleanup) and is better suited for open-ended debugging.

**If this is a workflow bug**, continue below.

## Prerequisites

Before invoking:
1. Read `status.json` — confirm stage is `executing` or `verifying` and phases exist.
2. Collect the user's bug description — symptoms, error messages, expected vs actual behavior.

## Workflow

### Phase 1: Dispatch Investigation

Launch the `bug-investigator` agent with the following context:

- **Bug description**: The user's report (verbatim or summarized).
- **Change directory path**: The full path to `.dev-changes/{branch-dir}/`.
- **Project root**: The workspace/project root for reading source code.

The investigator operates with **zero trust** — it assumes every artifact (proposal, phase plan, implementation, tests) may contain errors. It reads everything from scratch and traces the bug through the full chain: requirement → proposal → plan → code → test.

### Phase 2: Review and Discussion

The investigator presents a structured **Bug Investigation Report** containing:
- Symptoms and root cause
- Chain of failure (where the artifact chain broke)
- Affected phase(s)
- Proposed fix direction
- Reset scope (which phases to re-execute)

The user reviews the report. Use structured questions (AskQuestion) to confirm:
- Is the root cause correctly identified?
- Is the fix direction acceptable?
- Is the reset scope appropriate (which phases to redo)?

If the user disagrees, the investigator adjusts the analysis and asks again.

### Phase 3: Autonomous Remediation

After user confirmation, the investigator performs all modifications:

1. **Update `proposal.md`** — Append a `## Bugfix` section documenting the bug, root cause, and fix approach.

2. **Update phase files** — Modify affected `phases/PH-{n}.md` files:
   - Add `[BUGFIX]` prefixed tasks for the fix
   - Keep unaffected tasks from the original plan
   - Ensure task ordering reflects the fix dependencies

3. **Reset `status.json`** — Roll back to the earliest affected phase:
   - Target phase → `in_progress`, `summary` cleared
   - All subsequent phases → `pending`, `summary` cleared
   - Earlier phases → remain `completed` (untouched)
   - `stage` → `executing`
   - `current_phase` → target phase ID

### Phase 4: Resume Execution

After the investigator completes remediation:
- Return control to `harness-task:executing`.
- The executing skill reads the updated `status.json` and resumes from `current_phase`.
- Normal TDD execution continues for all reset phases.

## Integration with Dev Workflow

```
executing/verifying
  ↓ user reports bug
bugfix skill invoked
  ↓ investigator dispatched
investigation + discussion + remediation
  ↓ status.json reset
back to executing (from reset phase)
  ↓ normal TDD resumes
verifying (when all phases complete again)
```

## Rules

1. **Never skip investigation** — even obvious bugs may have deeper root causes in the proposal or plan.
2. **Never modify files before user confirms** — the investigator presents findings first.
3. **Always append to proposal.md** — never delete existing proposal content; add a `## Bugfix` section.
4. **Always reset status.json** — the executing flow depends on correct phase states.
5. **Scope only the bug** — do not use bugfix as an opportunity to refactor or expand features.
6. **One bugfix at a time** — if multiple bugs are reported, handle them sequentially.

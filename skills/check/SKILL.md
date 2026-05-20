---
name: check
description: Pre-execution sanity check. Reads the current feature's prompt.md, proposal.md, and all phases/PH-*.md, then deeply reads the codebase to raise concerns from three perspectives — product viability, QA/edge-case prediction, and software architecture. Intended to run after all planning artifacts are complete but before any code is written.
user-invocable: true
---

# Check — Pre-Execution Planning Review

Perform a three-perspective critical review of a development change that has finished planning but has not yet started implementation.

## When to Use

- After `prompt.md`, `proposal.md`, and all `phases/PH-*.md` are complete.
- `status.json.stage` is `"proposing"` (or just advanced to it).
- **Before** any production code has been written (`executing` has not started).
- Invoked manually via `/alles-check {branch-name}` or `/alles-check`.

## Prerequisites

The following artifacts MUST exist before this skill runs:

| Artifact | Location |
|----------|----------|
| `prompt.md` | `.dev-changes/{safe-branch-dir}/prompt.md` |
| `proposal.md` | `.dev-changes/{safe-branch-dir}/proposal.md` |
| At least one `phases/PH-*.md` | `.dev-changes/{safe-branch-dir}/phases/` |

If any artifact is missing, report what is absent and stop. Do not proceed.

---

## Workflow

### Step 1: Resolve the Change Directory

1. Determine the branch name — from the argument passed to the command, or from `git branch --show-current`.
2. Derive the safe branch directory name (replace `/` and other unsafe chars with `-`).
3. Locate `.dev-changes/{safe-branch-dir}/`. If it does not exist, stop and report.
4. Read `status.json` and confirm `stage` is `"proposing"`. If the stage is `"executing"` or later, warn the user that code may already have been written and ask whether to continue anyway.

### Step 2: Read All Planning Artifacts

Read the following files in full:

1. `prompt.md` — the refined feature requirements and Feature Breakdown.
2. `proposal.md` — the high-level technical approach, phase overview, risks, and constraints.
3. Every `phases/PH-{n}.md` — sub-tasks, data structures, design patterns, test cases, edge cases, MUST / MUST NOT constraints.

### Step 3: Deep Codebase Exploration

Launch a `code-explorer` subagent (or use direct reads within a 12-call budget) to understand the areas of the codebase that the change will touch.

Focus on:
- Existing modules and their current responsibilities, interfaces, and data structures at the change boundary.
- Design patterns already established in the codebase (naming conventions, error-handling idioms, test infrastructure).
- Any module the proposal marks for modification — read its full current implementation.
- Integration points: callers of modified APIs, consumers of modified data structures.
- Test infrastructure: how tests are organized, what utilities and fixtures exist.
- Known fragile areas (long functions, unclear ownership, commented-out code).

**Do NOT write any code or modify any file during this step.**

### Step 4: Three-Perspective Review

Present the findings as three clearly separated sections. **Each section is optional** — if a perspective has nothing meaningful to raise, write:

> _No concerns from this perspective._

Do NOT invent concerns to fill space. Each concern raised MUST be grounded in a specific artifact, code fact, or established software principle — state the evidence explicitly.

---

#### Perspective 1 — Product & Feature Reasonableness

**Lens:** Would a senior product manager or an experienced end-user find this feature valuable, coherent, and safe to ship?

Questions to consider:
- Is the scope of the feature well-bounded? Does it try to do too much or too little?
- Are the user operation paths described in the phase plans realistic and complete? Are there missing flows (e.g., empty states, error states, cancellation)?
- Does the proposal conflict with any existing feature's UX contract or data model? Could it break existing user expectations?
- Are the success criteria in `proposal.md` measurable and sufficient?
- Is there a simpler design that achieves the same user outcome with less complexity?

Output format for each concern:

```
**[P1-{n}]** {one-sentence title}
- Evidence: {specific line/section in prompt.md, proposal.md, or phase plan that surfaces the concern}
- Concern: {what the problem is, from the user/product perspective}
- Suggestion: {concrete alternative or question to resolve it — or "none, requires product decision"}
```

---

#### Perspective 2 — QA & Edge-Case Prediction

**Lens:** Would a senior QA engineer or test architect find the plan well-tested and safe?

Questions to consider:
- Are there boundary values, off-by-one conditions, or empty/nil/zero inputs that the test cases do not cover?
- Does the proposal handle partial failures (e.g., one phase succeeds but a later one fails)? Is rollback or compensation described?
- Are there race conditions or ordering dependencies that could cause flaky tests or production bugs?
- Are external dependencies (file system, network, clocks, random values) properly isolated in the test plan?
- Does the phase plan rely on mutable global state that could leak between tests?
- Are there paths in the code that can throw but are not exercised by any listed test case?

Output format for each concern:

```
**[P2-{n}]** {one-sentence title}
- Evidence: {specific phase plan section, test case table row, or codebase file/function}
- Concern: {what edge case or bug is likely, and why}
- Suggestion: {specific test to add, guard to implement, or question to resolve}
```

---

#### Perspective 3 — Software Architecture & Design Quality

**Lens:** Would a senior software architect or open-source maintainer approve the structural decisions?

Questions to consider:
- Does the proposed design follow the existing codebase patterns? If it deviates, is the deviation justified?
- Are module boundaries and responsibilities cleanly separated? Does any proposed unit take on multiple responsibilities?
- Are the proposed interfaces (function signatures, data shapes, event contracts) stable and minimal? Do they expose more than the callers need?
- Is there over-engineering (premature abstraction, unnecessary generalization) or under-engineering (copy-paste, magic strings, hardcoded values)?
- Does the phase ordering introduce any avoidable coupling (e.g., Phase 2 depends on a specific internal detail of Phase 1 that should be hidden behind an interface)?
- Would this design hold up to a second contributor maintaining it 6 months from now?
- Are the chosen design patterns appropriate for the scale and lifecycle of this feature?
- Does the design meet the bar expected of a well-maintained open-source project (clear public API, separation of concerns, documented contracts)?

**Deep-module lens (apply the following additional checks):**
- **Depth check**: Apply the deletion test to each new or modified module. If you deleted the module, would complexity vanish (pass-through) or reappear across callers (earning its keep)? Flag any module that appears to be a shallow pass-through.
- **Interface size**: Is the proposed interface minimal — does it expose only what callers need? Or does it leak internal state, implementation details, or configuration that callers shouldn't need to know?
- **Seam placement**: Does the design introduce seams only where behaviour genuinely varies? Is there evidence of two distinct adapters (production + test) justifying each seam, or are seams being introduced as hypothetical structure?
- **Locality**: Will bugs, changes, and knowledge about this concept be concentrated in one place after this change, or will they still scatter across callers?
- **Test surface**: Can the proposed module be thoroughly tested through its interface, or would tests need to reach inside the implementation? If tests need to reach inside, the interface is the wrong shape.

Output format for each concern:

```
**[P3-{n}]** {one-sentence title}
- Evidence: {specific file, function, data structure, or proposal section — include codebase file path if grounded in existing code}
- Concern: {what architectural risk or design smell is present, and why it matters}
- Suggestion: {specific refactoring, pattern swap, interface change, or boundary adjustment}
```

---

### Step 5: Present the Review

Output the full review in this structure:

```markdown
# Pre-Execution Check: {feature name from proposal.md}

> **Branch:** {branch-name}
> **Stage:** {status.json.stage}
> **Artifacts reviewed:** prompt.md · proposal.md · {N} phase plan(s)

---

## Perspective 1 — Product & Feature Reasonableness

{concerns, or "No concerns from this perspective."}

---

## Perspective 2 — QA & Edge-Case Prediction

{concerns, or "No concerns from this perspective."}

---

## Perspective 3 — Software Architecture & Design Quality

{concerns, or "No concerns from this perspective."}

---

## Summary

| ID | Severity | Title |
|----|----------|-------|
| P1-1 | {High / Med / Low} | {title} |
| P2-1 | {High / Med / Low} | {title} |
| P3-1 | {High / Med / Low} | {title} |

**Total concerns raised:** {N}

> This check is advisory. No files have been modified. Proceed to `/alles-dev` when ready, or address the concerns above before executing.
```

**Severity guidelines:**

| Severity | Meaning |
|----------|---------|
| High | Likely to cause a user-visible bug, data loss, broken test, or architectural regression that is hard to reverse once code is written |
| Med | Could cause maintainability debt, subtle edge-case failures, or friction — worth addressing before execution but not a blocker |
| Low | Minor suggestion, style preference, or open question — can be deferred |

---

## Rules

1. **Read before judging.** Every concern must be grounded in a specific artifact or code fact. No abstract "you should consider X" without evidence.
2. **Three perspectives are independent.** A concern belongs to exactly one perspective. Do not repeat it.
3. **Silence is valid.** If a perspective has nothing to raise, say so explicitly — do not manufacture concerns.
4. **No code changes.** This skill is read-only. Do not write, modify, or delete any file.
5. **No stage transitions.** Do not modify `status.json`. The user owns the decision to proceed.
6. **Concerns are advisory.** The user may choose to proceed despite flagged concerns.
7. **Severity is honest.** Only mark High when the evidence clearly supports it.
8. **Cite file and line/section** wherever possible — make it easy for the user to navigate to the relevant artifact.

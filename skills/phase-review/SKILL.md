---
name: phase-review
description: Orchestrates adversarial code review after phase completion. Spawns isolated phase-reviewer subagent, parses JSON scores, handles retry loop.
---

# Phase Review — Adversarial Review Orchestration

This skill is invoked after a phase's tasks are complete (before context compression). It spawns an isolated `phase-reviewer` subagent to evaluate the code, handles scoring, and manages the fix-retry loop.

## When to Invoke

Called by `harness-task:executing` after all tasks in a phase are done and `status.json` is updated with the phase summary.

## Review Granularity

Determine review granularity based on the number of files changed in the current phase:

1. Run `git diff --name-only` against the state before the phase started (use the last commit before phase execution, or the branch point).
2. Count the number of changed files.

| Changed Files | Granularity | Behavior |
|---------------|-------------|----------|
| **<= 8** | Phase-level | Review the entire phase's diff at once |
| **> 8** | Per-task | Review was already triggered per-task during execution |

When granularity is per-task, `harness-task:executing` triggers this skill after each task's TDD cycle instead of at phase end. The orchestration logic below applies identically regardless of granularity.

## Review Loop

```
for round = 1 to MAX_ROUNDS (default: 3):
    1. Collect context
    2. Spawn phase-reviewer subagent (isolated)
    3. Parse JSON scores
    4. If weighted_average >= PASS_THRESHOLD (default: 7.0) → PASS, exit loop
    5. If weighted_average < PASS_THRESHOLD:
       - The reviewer agent fixes code in-place (same session)
       - Loop continues with a NEW reviewer subagent (fresh context)
    6. If round == MAX_ROUNDS and still failing → ESCALATE to user
```

### Step 1: Collect Context

Gather exactly three inputs for the reviewer — nothing more:

1. **`prompt.md`** — Read the full file from the change directory.
2. **`proposal.md`** — Read the full file from the change directory.
3. **Production code diff** — Run:
   ```bash
   git diff <base>..HEAD -- ':!*.test.*' ':!*.spec.*' ':!*__tests__*'
   ```
   This excludes test files. The reviewer sees only production code changes.

   For `<base>`, use the merge-base of the current branch and the configured base branch (from `.harness-task/config.yaml`, defaulting to `main`).

### Step 2: Spawn Reviewer Subagent

Dispatch the `phase-reviewer` agent with:

- **Isolated context**: A new subagent session with NO conversation history from the executing flow.
- **Task prompt**: Combine the three inputs into a structured message:

```
You are reviewing phase {phase_id}: {phase_title}.

## Requirements (prompt.md)
{content of prompt.md}

## Technical Approach (proposal.md)
{content of proposal.md}

## Code Changes (production code diff)
{git diff output}

Review this code according to your review protocol and output the JSON score block.
If the verdict is NEEDS_FIX, fix the code immediately after outputting your scores.
```

### Step 3: Parse Scores

Extract the JSON score block from the reviewer's output:

1. Find the JSON object in the output (the reviewer outputs it as a single block).
2. Validate all 6 dimensions are present with scores 0–10.
3. Recalculate the weighted average: `(3a + 3b + 3c + 2d + 2e + 1f) / 14`
4. Determine verdict based on the calculated average (not the reviewer's self-reported verdict).

**Scoring dimensions and weights:**

| Dimension | Weight |
|-----------|--------|
| Proposal Alignment | 3 (HIGH) |
| Code Quality | 3 (HIGH) |
| Test Coverage | 3 (HIGH) |
| Security & Safety | 2 (MEDIUM) |
| Performance & Scalability | 2 (MEDIUM) |
| Plan Compliance | 1 (LOW) |

### Step 4: Record and Decide

Update `status.json` with the review result:

```
updatePhaseReview(status, phaseId, weightedAverage, roundNumber)
```

| Verdict | Action |
|---------|--------|
| **PASS** (avg >= 7.0) | Log score, proceed to context compression and next phase |
| **NEEDS_FIX** (avg < 7.0, rounds remain) | The reviewer already fixed code; spawn a NEW reviewer for re-evaluation |
| **ESCALATE** (avg < 7.0, max rounds reached) | Report to user with all scores and critical issues; halt execution |

### Step 5: Escalation

When escalating to the user, present:

```markdown
## Phase Review Failed — Escalation Required

Phase {phase_id}: {phase_title} did not pass review after {MAX_ROUNDS} attempts.

### Score History
| Round | Weighted Average | Verdict |
|-------|-----------------|---------|
| 1 | {score_1} | NEEDS_FIX |
| 2 | {score_2} | NEEDS_FIX |
| 3 | {score_3} | ESCALATE |

### Outstanding Critical Issues
{list from latest review}

### Options
1. Override and continue (accept current quality)
2. Provide guidance for manual fix
3. Reset the phase for re-execution
```

Wait for user decision before proceeding.

## Configuration

These values can be overridden in `.harness-task/config.yaml`:

```yaml
review:
  pass_threshold: 7.0          # minimum weighted average to pass
  max_rounds: 3                # maximum review-fix-review cycles
  large_phase_file_threshold: 8 # file count that triggers per-task review
```

## Rules

1. **Every review uses a fresh subagent** — no shared context between review rounds.
2. **Never skip the review** — every completed phase must pass review before advancing.
3. **The reviewer's calculated average is authoritative** — not the self-reported `weighted_average` field.
4. **Production diff only** — never include test files in the reviewer's context.
5. **Persist scores immediately** — update `status.json` after every review round.
6. **Escalation halts execution** — do not proceed to the next phase until the user decides.

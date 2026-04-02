---
name: planning
description: Use when generating detailed plans for phases. Creates one zero-context phase plan per phase with clear do/don't boundaries, handoff guidance, sub-agent strategy, and skill references.
---

# Writing Detail Plans

## Overview

Write implementation plans as a sequence of phases. Each phase gets its own plan file
and describes what to do and what not to do, whether a sub-agent should handle it,
which skills apply, and what must be handed off to the next phase.
Plans must be concrete enough for an executor with zero prior context.

Do NOT list files or directories to modify — the executor discovers them during
implementation. Focus on behavior, logic, and testing strategy.

<TOOL-BUDGET>
Planning works from `proposal.md` and existing specs ONLY.

Do NOT read source code to write plans. The executor discovers implementation
details during execution. Plans describe BEHAVIOR, not file-level changes.

Tool calls for planning MUST be limited to:
- Reading `proposal.md`, the detail-plan template, and existing specs
- Writing phase plan files
MUST NOT exceed 3 tool calls per phase. Any tool call beyond this is a BUG.
</TOOL-BUDGET>

## Plan Structure

Read `.harness-task/templates/detail-plan.md` if it exists in the project. If it exists, use that template as the format for each phase plan file. If it doesn't exist, use the built-in default format below:

````markdown
# Phase PH-{n}: {title}

**Goal:** {One sentence}
**Verification:** {How to verify this phase is complete}
**Depends on:** {none | PH-{n-1}, PH-{n-2}}
**Sub-agent:** {yes: dev-executor | no: main agent handles it}
**Skills:** {comma-separated list, e.g. harness-task:tdd, harness-task:review}
**Handoff Input:** {Which compressed summaries or invariants from earlier phases matter}
**Completion Summary:** {1-3 sentence summary template for the next phase}

---

**Do:**
- {concrete action}
- {concrete action}

**Don't:**
- {anti-pattern to avoid}
- {scope boundary — what NOT to touch}

**Detail:**
{What to implement, how to test, key logic and edge cases to cover.
Describe the behavior, inputs, outputs, and error handling.
Include test strategy: what assertions to make, what edge cases to verify.}
````

## No Placeholders Rule

These are **plan failures** — never write them:
- "TBD", "TODO", "implement later"
- "Add appropriate error handling" (describe the specific handling)
- "Write tests for the above" (describe specific test cases)
- "Similar to Phase N" (repeat the content)

## Phase Granularity

Each phase is a cohesive unit of work that results in one commit:
- Small enough to implement and test in a single focused session
- Large enough to represent a meaningful, testable behavior change
- Follows TDD: describe what test to write, what it verifies, then what to implement
- Leaves behind a compressed summary that lets the next phase start in a fresh context

## Self-Review Checklist

After writing the plan:
1. **Proposal coverage**: Every requirement in proposal.md maps to at least one phase
2. **Placeholder scan**: No TBD/TODO/vague instructions
3. **Do/Don't clarity**: Each phase has explicit boundaries
4. **Test strategy**: Every phase describes how to verify correctness
5. **Handoff quality**: Every phase tells the next executor what must be preserved

Fix issues inline. No re-review needed.

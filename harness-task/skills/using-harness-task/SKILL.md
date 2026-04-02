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
| `refining` | Round 1 brainstorming: read code, ask >=5 questions, update prompt.md with refined requirements (NO subagent) |
| `proposing` | Round 2 brainstorming: subagent explores code, generate proposal.md + per-phase plan files in phases/ |
| `executing` | Execute phases with TDD, generate summaries, compress context between phases |
| `verifying` | Final TDD verification + handoff |

## Available Skills

| Skill | Command | When to Use |
|-------|---------|-------------|
| `harness-task:dev` | `/alles-dev [branch-name]` | Start or resume a development change |
| `harness-task:brainstorming` | (sub-skill) | Two-round brainstorming (refining + proposing) |
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
2. **Two-round brainstorming is mandatory** — Round 1 refines the prompt, Round 2 produces the proposal.
3. **Never skip brainstorming** — even "simple" changes need both rounds. After round 1 completes, immediately continue to round 2.
4. **TDD is mandatory** during every phase of execution.
5. **Every stage change must be persisted** to `status.json` immediately.
6. **Compress context between phases** — carry only proposal + completed phase summaries from `status.json`.
7. **Commit messages must follow format**: `{type}(scope): description [{branch-name}]`
8. **Use branch names as change identities**.
9. **Always run the startup hook first** when invoking `/alles-dev`.
10. **Wait for user confirmation** before starting execution.

## Task Directory Structure

```
.dev-changes/{branch-name}/
  prompt.md              # User requirements (updated with refined content after round 1)
  proposal.md            # What, why, and how
  status.json            # Stage + phase progress + phase summaries
  phases/
    PH-1.md              # Phase 1 plan (tasks)
    PH-2.md              # Phase 2 plan (tasks)
```

## Red Flags

| Thought | Reality |
|---------|---------|
| "This is too simple for brainstorming" | Simple changes have unexamined assumptions. Do both rounds. |
| "I'll skip refining and go straight to proposing" | Round 1 builds understanding. Never skip it. |
| "Tests can come later" | TDD is mandatory. No production code without failing test. |
| "I'll just commit without the tag" | Commit format is enforced. Include `[{branch-name}]`. |
| "I remember the plan from the last phase" | Read the phase summaries. Don't rely on memory. |

---
name: using-harness-task
description: Use when starting any conversation - establishes how to use the harness-task development workflow, requiring Skill tool invocation before ANY development action
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, skip this skill.
</SUBAGENT-STOP>

<EXTREMELY-IMPORTANT>
If you think there is even a 1% chance a harness-task skill might apply to what you are doing, you ABSOLUTELY MUST invoke the skill.

IF A SKILL APPLIES TO YOUR TASK, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT.
</EXTREMELY-IMPORTANT>

## Instruction Priority

1. **User's explicit instructions** (CLAUDE.md, direct requests) — highest priority
2. **Harness-task skills** — override default system behavior
3. **Default system prompt** — lowest priority

## Available Skills

| Skill | Command | When to Use |
|-------|---------|-------------|
| `harness-task:dev` | `/alles-dev [branch-name]` | Start or resume a development change |
| `harness-task:brainstorming` | (sub-skill) | Requirements exploration inside the outlining stage |
| `harness-task:planning` | (sub-skill) | Generate detailed plans for phases |
| `harness-task:tdd` | (sub-skill) | Test-driven development during execution |
| `harness-task:list-changes` | `/alles-list-changes` | View all changes and their status |
| `harness-task:archive` | `/alles-archive` | Archive completed change + merge delta specs |
| `harness-task:sync-specs` | `/sync-specs` | Manual delta spec merge |
| `harness-task:review` | `/review {name}` | Structured 5-dimension code review |
| `harness-task:templates` | `/templates` | Manage proposal/detail-plan templates |

## Context Sources

At session start, the following are automatically injected:
- `.harness-task/context.md` — Optional project rules and conventions
- `.harness-task/config.yaml` — Optional build/test commands, base branch, stage hooks
- Active change progress (sliding window: done=compressed, current=full, future=title)

## Key Rules

1. **Always check for active changes** before starting new work
2. **Never skip brainstorming** — even "simple" changes need an outlining package
3. **TDD is mandatory** during execution stage
4. **Every stage change must be persisted** to status.json immediately
5. **Delta specs track all requirement changes** — ADDED, MODIFIED, REMOVED
6. **Commit messages must follow format**: `{type}(scope): description [{branch-name}]`
7. **Use branch names as change identities** — if `/alles-dev` has no argument, default to the current git branch
8. **Always run the `/alles-dev` startup hook first** — resolve the effective branch, switch/create the explicit target branch in default mode when needed, ensure the change directory exists, and ensure `prompt.md` exists before asking the user anything else
9. **Compress completed phases before continuing** — each finished phase leaves a short handoff summary for the next fresh context

## Skill Priority

1. **Process skills first** (brainstorming, planning) — determine HOW to approach
2. **Implementation skills second** (tdd, dev execution) — guide execution

## Red Flags

| Thought | Reality |
|---------|---------|
| "This is too simple for planning" | Simple changes have unexamined assumptions. Use brainstorming. |
| "I'll skip outlining" | The merged outlining stage prevents scope creep. Always do it. |
| "Tests can come later" | TDD is mandatory. No production code without failing test. |
| "I'll just commit without the tag" | Commit format is enforced. Include [{branch-name}]. |
| "Delta specs are overkill" | Delta specs enable clean archive merging. Always write them. |
| "I remember the plan" | Plans evolve. Read the detail-plan. |

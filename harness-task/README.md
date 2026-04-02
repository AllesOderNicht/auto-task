# Harness Task

Structured 6-stage development workflow plugin for Claude Code and Cursor.

## Workflow

```
init → prompting → refining → proposing → executing → verifying
```

| Stage | Description |
|-------|------------|
| **init** | Create branch + directory + empty prompt.md |
| **prompting** | User fills in prompt.md with requirements |
| **refining** | Round 1 brainstorming: read code, ask >=5 questions, update prompt.md with refined requirements (no subagent) |
| **proposing** | Round 2 brainstorming: subagent explores code, generate proposal.md + per-phase plan files |
| **executing** | Execute phases with TDD, generate summaries, compress context between phases |
| **verifying** | Final TDD verification + handoff |

## Quick Start

1. Start a new development change:
   ```
   /alles-dev feature/my-change
   ```

2. Fill in `prompt.md` with your requirements.

3. The workflow guides you through brainstorming, planning, and execution automatically.

## Commands

| Command | Description |
|---------|------------|
| `/alles-dev [branch]` | Start or resume a development change |
| `/alles-list-changes` | View all changes and their status |
| `/alles-archive` | Archive a completed change |
| `/review [branch]` | Structured code review |

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

## Key Features

- **Two-round brainstorming**: Round 1 asks structured questions to understand the problem. Round 2 uses subagent to explore code and generate a concrete proposal with per-phase plans.
- **Phased execution**: Tasks are split into independent phases. Each phase executes with TDD and produces a minimal summary.
- **Context compression**: Between phases, only the proposal and completed phase summaries are carried forward. No context window bloat.
- **Breakpoint resume**: Any interruption can be resumed. Status is persisted to `status.json` after every stage/phase change.
- **TDD enforcement**: Every task follows Red-Green-Refactor. No production code without a failing test.

## Configuration

Create `.harness-task/config.yaml` in your project root for custom settings:

```yaml
# Build and test commands
build_command: npm run build
test_command: npm test

# Base branch for new feature branches
base_branch: main
```

Create `.harness-task/context.md` for project-specific context injected at session start.

## Commit Format

```
{type}({scope}): description [{branch-name}]
```

Examples:
- `feat(auth): add login endpoint [feature/auth]`
- `test(auth): add unit tests for login [feature/auth]`
- `fix(api): handle null response [fix/null-response]`

## License

MIT

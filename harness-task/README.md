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
| **refining** | Round 1 brainstorming: read code, ask >=5 questions, generate refined-prompt.md (no subagent) |
| **proposing** | Round 2 brainstorming: subagent explores code, generate proposal.md + design.md + tasks.md |
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
  prompt.md              # Original user requirements
  refined-prompt.md      # After round 1 brainstorming
  proposal.md            # What and why (proposal)
  design.md              # How (technical design)
  tasks.md               # Phased task list
  status.json            # Stage + phase progress
  phases/
    PH-1-summary.md      # Phase 1 completion summary
    PH-2-summary.md      # Phase 2 completion summary
```

## Key Features

- **Two-round brainstorming**: Round 1 asks structured questions to understand the problem. Round 2 uses subagent to explore code and generate a concrete proposal.
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

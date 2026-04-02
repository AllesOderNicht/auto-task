# harness-task

A structured development workflow plugin for **Claude Code** and **Cursor**. It tracks branch-based changes, captures prompts into files, and drives implementation through a single outlining stage, TDD, review, and verification.

## Overview

harness-task uses this flow:

```text
prompt.md -> brainstorming -> proposal.md + delta specs + phase plans -> per-phase TDD + handoff -> verify -> archive
```

Start directly from `/alles-dev`.

## Installation

### Claude Code

```bash
claude plugin add /path/to/harness-task
```

### Cursor

Add the plugin path in Cursor plugin settings, or copy the plugin directory into your Cursor plugins location.

## Quick Start

### Start from the current branch

```text
/alles-dev
```

If you omit the branch name, harness-task uses the current git branch.

### Start from a specific branch

```text
/alles-dev feature/login-flow
```

If the branch exists, harness-task resumes that change. If it does not exist, the workflow creates it from the configured base branch at startup.

### Start in a worktree

```text
/alles-dev feature/login-flow -w
```

Supported flags:
- `-w`
- `-worktree`
- `--worktree`

Worktrees are created under `../{project-name}-worktrees/{safe-branch-dir}/` during startup.

## `prompt.md` First

Every `/alles-dev` run ensures a `prompt.md` file exists inside the change directory.

Before prompt capture, `/alles-dev` performs a startup hook:
- resolve the effective target branch
- if an explicit branch name was provided in default mode and the repo is not on it,
  switch to it immediately, or create it from the base branch and switch to it
- if worktree mode was requested, create or reuse the worktree immediately and bind it to the target branch
- create `.dev-changes/{safe-branch-dir}/` if needed
- create `prompt.md` if needed

Two input flows are supported:
- Conversation flow: the user describes the task in chat and the assistant writes it into `prompt.md`
- Manual flow: the user edits `prompt.md` directly, then replies `已填写`; the assistant reads it and continues

After the prompt is accepted, the assistant replies `已经填写`.

## Directory Layout

```text
your-project/
├── .dev-changes/
│   ├── feature__login-flow/
│   │   ├── prompt.md
│   │   ├── proposal.md
│   │   ├── status.json
│   │   ├── specs/
│   │   ├── phases/
│   │   │   └── PH-1.md
│   │   └── execution-log.md
│   └── archive/
└── .harness-task/
    ├── context.md            # optional project conventions
    ├── config.yaml           # optional build/test/base-branch/hooks config
    ├── specs/                # optional main specs directory
    └── templates/            # optional custom templates
```

Branch names are used as change identities. When a branch contains `/`, harness-task stores the change in a safe directory name such as `feature__login-flow`, while `status.json` keeps the original branch name.

## Stages

| Stage | What Happens |
|-------|--------------|
| `outlining` | Read `prompt.md`, brainstorm, write the merged `proposal.md`, generate delta specs, and produce one phase plan per phase |
| `executing` | Implement exactly one phase at a time with strict TDD, then hand off the next phase through a compressed summary and a fresh execution context |
| `verifying` | Run final checks and ask for validation |
| `done` | Mark the change complete and ready to archive |

## Phase Handoffs

Each completed phase leaves behind:
- one commit
- one short compressed summary in `execution-log.md` and `status.json`
- enough context for the parent agent to launch the next phase in a fresh execution context or `dev-executor` sub-agent

The next phase should rely on its own phase plan plus compressed summaries of completed phases, not on the previous phase's full conversational context.

## Optional Project Files

You can use harness-task with zero setup, but these optional files make it smarter:

- `.harness-task/context.md`: project conventions for planning and review
- `.harness-task/config.yaml`: build/test/lint commands, base branch, and stage hooks
- `.harness-task/specs/`: main specs merged with delta specs during archive or sync
- `.harness-task/templates/`: custom templates for the merged proposal and detail plans

Example `config.yaml`:

```yaml
project:
  name: my-app

commands:
  build: npm run build
  test: npm run test
  lint: npm run lint

git:
  base_branch: main

stage_hooks:
  pre_executing: npm run lint
  post_executing: npm run build && npm run test
```

If no config file exists, harness-task falls back to auto-detection from the project.

## Commands

| Command | Description |
|---------|-------------|
| `/alles-dev [branch-name]` | Start or resume a branch-based development change |
| `/alles-list-changes` | List active and archived changes |
| `/alles-archive [branch-name]` | Archive a completed change and merge delta specs |
| `/sync-specs [branch-name]` | Merge delta specs into `.harness-task/specs` without archiving |
| `/review [branch-name]` | Run structured code review for a change |
| `/templates` | Manage optional proposal/detail-plan templates |

## Commit Convention

All commits during execution must follow:

```text
{type}({scope}): description [{branch-name}]
```

Types:
- `feat`
- `fix`
- `refactor`
- `chore`
- `docs`
- `style`
- `perf`
- `test`

Examples:
- `feat(auth): add JWT token validation [feature/login-flow]`
- `test(api): add endpoint integration tests [feature/login-flow]`
- `fix(ui): correct button alignment [fix/prompt-entry]`

## License

MIT

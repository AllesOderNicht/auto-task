---
name: templates
description: Manage customizable templates for merged proposals and detail plans. List, show, or reset templates to defaults.
user-invocable: true
---

# Template Management

Manage the templates used by harness-task for generating merged proposals and detail plans. Templates live in `.harness-task/templates/` and are optional.

## Template Files

| Template | Path | Used By |
|----------|------|---------|
| Proposal | `.harness-task/templates/proposal.md` | outlining stage (proposal + phase outline) |
| Detail Plan | `.harness-task/templates/detail-plan.md` | planning skill (outlining stage) |

## Commands

### `/templates` — List Templates

Show all templates and their current status (default / customized / missing).

**Actions**:
1. Check if `.harness-task/templates/` exists
2. For each template file, show:
   - Whether it exists
   - Whether it has been customized (differs from default)
   - Last modified date
3. Display a summary table

### `/templates show {name}` — Show Template Content

Display the current content of a specific template.

- `name` can be: `proposal` or `detail-plan`
- If the template file doesn't exist, show the built-in default

### `/templates reset {name}` — Reset to Default

Reset a specific template back to its default content.

- `name` can be: `proposal`, `detail-plan`, or `all`
- Confirm with user before overwriting customized templates
- Write the default content to the template file

## Default Templates

### proposal.md

```markdown
## Why
{Motivation -- what problem does this solve?}

## What Changes
{Specific changes being made}

### New Capabilities
- `{name}`: {description}

### Modified Capabilities
- `{existing-name}`: {what's changing}

### Removed Capabilities
- `{name}`: {why removed}

## Scope
### Included
### Excluded

## Acceptance Criteria
- [ ] {criterion}

## Phase Outline
### Phase PH-{n}: {title}
- Goal: {one sentence}
- Verification: {how to verify}
```

### detail-plan.md

````markdown
# Phase PH-{n}: {title}

**Goal:** {one sentence}
**Verification:** {how to verify completion}
**Depends on:** {none | PH-{n-1}}
**Sub-agent:** {yes: dev-executor | no: main agent handles it}
**Skills:** {comma-separated list}
**Handoff Input:** {which compressed summaries matter}
**Completion Summary:** {1-3 sentence handoff summary template}

---

**Do:**
- {concrete action}

**Don't:**
- {anti-pattern to avoid}

**Detail:**
{What to implement, how to test, key logic and edge cases}
````

## Key Rules

1. **Templates are optional** — if `.harness-task/templates/` doesn't exist, built-in defaults are used
2. **Users can freely customize** — edit template files directly
3. **Placeholders use `{name}` syntax** — curly braces indicate fill-in points
4. **Reset is non-destructive** — always confirm before overwriting customizations

---
name: review
description: Structured code review with 5 dimensions. Invoked automatically after executing stage completes, or standalone via /review {branch-name}.
---

# Code Review — 5-Dimension Structured Review

Perform a structured self-review of all changes made during the executing stage (or on demand). The review ensures implementation quality before entering the verifying stage.

## When Invoked

- **Automatically**: After all phases in the executing stage complete, before entering verifying
- **Standalone**: User runs `/review {branch-name}` or omits it to use the current branch

## Environment

- **Change directory**: Resolve the safe directory name from the target branch, then read `.dev-changes/{safe-branch-dir}/`
- **Proposal**: `.dev-changes/$ARGUMENTS/proposal.md`
- **Delta specs**: `.dev-changes/$ARGUMENTS/specs/`
- **Phase plans**: `.dev-changes/$ARGUMENTS/phases/`
- **Execution log**: `.dev-changes/$ARGUMENTS/execution-log.md`

## Review Process

### Step 1: Gather Context

1. Read `proposal.md` — acceptance criteria, scope, and phase outline
2. Read all phase plans in `phases/`
3. Read all delta specs in `specs/`
4. Read `execution-log.md` — what was actually done
5. Run `git diff {base-branch}...HEAD` to see all changes

### Step 2: Evaluate 5 Dimensions

#### Dimension 1: Proposal Coverage

Check that every acceptance criterion in `proposal.md` maps to actual implementation.

- List each criterion from `## Acceptance Criteria`
- For each, identify the implementing code/test
- Flag any criterion without a clear implementation as **Critical**

#### Dimension 2: Code Quality

Review all changed files for:

- **Patterns**: Consistent with project conventions in `.harness-task/context.md` when present
- **Error handling**: All error paths covered, no swallowed errors
- **Naming**: Clear, consistent, follows project conventions
- **Duplication**: No copy-paste code that should be extracted
- **Complexity**: Functions/methods not too long, single responsibility

#### Dimension 3: Test Coverage

For every new function, method, or behavior:

- Verify a corresponding test exists
- Check edge cases are tested (null, empty, boundary values)
- Verify error paths have tests
- Flag any untested public function/behavior as **Important**

#### Dimension 4: Delta Spec Consistency

Compare delta specs against actual implementation:

- Every ADDED requirement should have corresponding new code
- Every MODIFIED requirement should show the change in code
- Every REMOVED requirement should have corresponding deletions
- Flag any mismatch as **Important**

#### Dimension 5: Security & Safety

Scan for common security issues:

- No hardcoded secrets, API keys, or credentials
- No unsafe `eval()`, `exec()`, or equivalent
- Input validation on user-facing interfaces
- No SQL injection vectors (parameterized queries)
- No path traversal vulnerabilities
- Dependencies are from trusted sources
- No overly permissive file/network access

### Step 3: Generate Report

Output the review as a structured report:

```markdown
# Code Review: {branch-name}

## Summary
{1-2 sentence overall assessment}

## Dimension Scores
| Dimension | Status | Issues |
|-----------|--------|--------|
| Proposal Coverage | PASS/FAIL | {count} |
| Code Quality | PASS/WARN | {count} |
| Test Coverage | PASS/FAIL | {count} |
| Delta Spec Consistency | PASS/WARN | {count} |
| Security & Safety | PASS/FAIL | {count} |

## Critical Issues
{Must be resolved before verifying}

### CRIT-{n}: {title}
- **Dimension**: {dimension}
- **Location**: `{file}:{line}`
- **Description**: {what's wrong}
- **Fix**: {suggested fix}

## Important Issues
{Should be resolved, but non-blocking}

### IMP-{n}: {title}
- **Dimension**: {dimension}
- **Location**: `{file}:{line}`
- **Description**: {what's wrong}
- **Fix**: {suggested fix}

## Suggestions
{Nice to have improvements}

### SUG-{n}: {title}
- **Description**: {suggestion}

## Verdict
{PASS | PASS WITH WARNINGS | BLOCKED}
```

### Step 4: Handle Verdict

- **PASS**: Proceed to verifying stage
- **PASS WITH WARNINGS**: Proceed, but note warnings for user
- **BLOCKED**: Critical issues found — present to user, fix issues, then re-review

## Issue Severity Guide

| Severity | Criteria | Blocks Verifying? |
|----------|----------|-------------------|
| **Critical** | Missing acceptance criteria, security vulnerability, broken functionality | Yes |
| **Important** | Missing tests, spec mismatch, code quality concern | No (but flagged) |
| **Suggestion** | Style improvement, potential optimization, documentation | No |

## Key Rules

1. **Always read the actual diff** — don't rely on execution log alone
2. **Check every acceptance criterion** — this is the primary gate
3. **Critical issues block transition** — user must acknowledge
4. **Be specific** — include file paths, line numbers, code snippets
5. **Suggest fixes** — don't just identify problems, propose solutions

---
name: review
description: Structured code review with multiple dimensions. Can be invoked after execution completes or standalone.
user-invocable: true
---

# Review — Structured Code Review

Review a development change across multiple dimensions.

## When to Use

- After all phases of execution complete (before or during `verifying` stage).
- Standalone via `/review {branch-name}`.

## Review Dimensions

### 1. Proposal Coverage

- Does the implementation match what `proposal.md` specified?
- Are all requirements from `refined-prompt.md` addressed?
- Are there unplanned additions or missing pieces?

### 2. Code Quality

- Is the code clean, readable, and maintainable?
- Are naming conventions consistent?
- Is there unnecessary duplication?
- Are error cases handled?

### 3. Test Coverage

- Does every behavior have a corresponding test?
- Are edge cases covered?
- Do tests follow TDD patterns (descriptive names, single assertion focus)?

### 4. Phase Summaries

- Do phase summaries accurately reflect the changes?
- Is anything missing from the file change lists?

### 5. Security & Safety

- Are there hardcoded secrets or credentials?
- Are user inputs validated?
- Are there potential injection vectors?

## Output Format

```markdown
# Code Review: {change-name}

## Summary
<!-- 2-3 sentence overview -->

## Dimension Scores

| Dimension | Score | Notes |
|-----------|-------|-------|
| Proposal Coverage | {pass/partial/fail} | {brief note} |
| Code Quality | {pass/partial/fail} | {brief note} |
| Test Coverage | {pass/partial/fail} | {brief note} |
| Phase Summaries | {pass/partial/fail} | {brief note} |
| Security | {pass/partial/fail} | {brief note} |

## Issues Found
<!-- List any issues, grouped by severity -->

### Critical
<!-- Must fix before merge -->

### Suggestions
<!-- Nice to have improvements -->

## Verdict
<!-- APPROVE / REQUEST_CHANGES / NEEDS_DISCUSSION -->
```

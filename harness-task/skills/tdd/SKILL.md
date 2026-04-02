---
name: tdd
description: Test-Driven Development enforcement. Red-Green-Refactor cycle for each task within a phase.
---

# TDD — Test-Driven Development

This skill enforces the Red-Green-Refactor cycle during the `executing` stage. Every task within a phase must follow this discipline.

## The Cycle

### 1. RED — Write a Failing Test

- Write a test that describes the expected behavior for the current task.
- The test MUST fail when run. If it passes, your test is wrong — it's not testing new behavior.
- Run the test and confirm the failure message matches expectations.

### 2. GREEN — Make It Pass

- Write the **minimal** production code to make the failing test pass.
- Do not over-engineer. Do not add code "for later". Just make the test green.
- Run the test and confirm it passes.
- Run the full test suite to ensure nothing else broke.

### 3. REFACTOR — Clean Up

- Improve the code without changing behavior. Tests must stay green.
- Apply: extract functions, rename for clarity, remove duplication.
- Run full test suite after refactoring.

## Rules

1. **No production code without a failing test** — this is the cardinal rule.
2. **One behavior per cycle** — don't test multiple things at once.
3. **Run tests after every step** — RED, GREEN, and REFACTOR each require a test run.
4. **Keep tests fast** — unit tests should complete in seconds.
5. **Test names describe behavior** — `it('returns error when input is empty')` not `it('test1')`.

## Build & Test Commands

Check `.harness-task/config.yaml` for project-specific commands. Fallback detection:

| File Present | Test Command | Build Command |
|-------------|-------------|---------------|
| `package.json` | `npm test` or `npx vitest run` | `npm run build` |
| `Cargo.toml` | `cargo test` | `cargo build` |
| `go.mod` | `go test ./...` | `go build ./...` |
| `pyproject.toml` | `pytest` | — |

## Integration with Phase Execution

When invoked from `harness-task:executing`:

1. Receive the current task description.
2. Execute one RED-GREEN-REFACTOR cycle for that task.
3. Return control to the executing skill.

Each completed TDD cycle should result in a commit:
`{type}({scope}): description [{branch-name}]`

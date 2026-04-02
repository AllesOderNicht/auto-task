---
name: tdd
description: Use when implementing any feature or bugfix during the executing stage. Enforces Red-Green-Refactor cycle. No production code without a failing test.
---

# Test-Driven Development (TDD)

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Write code before the test? Delete it. Start over. No exceptions.

## Red-Green-Refactor Cycle

### RED — Write Failing Test
- One minimal test showing what should happen
- Clear name describing behavior
- Real code, no mocks unless unavoidable

### Verify RED — Watch It Fail
**MANDATORY. Never skip.**
- Test fails (not errors)
- Failure message is expected
- Fails because feature missing (not typos)

### GREEN — Minimal Code
- Write simplest code to pass the test
- Don't add features beyond the test
- Don't refactor yet

### Verify GREEN — Watch It Pass
**MANDATORY.**
- Test passes
- Other tests still pass
- No warnings or errors

### REFACTOR — Clean Up
After green only:
- Remove duplication
- Improve names
- Extract helpers
- Keep tests green

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
| "Need to explore first" | Fine. Throw away exploration, start with TDD. |
| "Test hard = skip it" | Hard to test = hard to use. Fix the design. |
| "TDD will slow me down" | TDD is faster than debugging. |
| "Just this once" | That's rationalization. Follow the cycle. |

## Integration with Harness-Task

- Use test commands from `.harness-task/config.yaml` when present; otherwise auto-detect from the project
- Each phase plan follows Red-Green-Refactor
- Commit after each completed phase
- Log results and the compressed handoff summary in `execution-log.md`

## Red Flags — STOP and Start Over

- Code before test
- Test passes immediately (you're testing existing behavior)
- Can't explain why test failed
- Rationalizing "just this once"

**All of these mean: Delete code. Start over with TDD.**

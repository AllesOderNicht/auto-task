---
name: diagnose
description: Structured six-phase bug diagnosis. Use when debugging a hard bug, a performance regression, or any issue where the root cause is unclear. Phases — Build a feedback loop → Reproduce → Hypothesise → Instrument → Fix + regression test → Cleanup + post-mortem. Distinct from harness-task:bugfix, which handles phase-level rollback within the executing workflow.
user-invocable: true
---

# Diagnose

A disciplined six-phase process for hard bugs and performance regressions. Skip a phase only when explicitly justified.

When exploring the codebase, use any available domain glossary (`CONTEXT.md`) to build a clear mental model of the relevant modules, and check ADRs in the area you're touching.

---

## Phase 1 — Build a Feedback Loop

**This is the skill.** Everything else is mechanical. If you have a fast, deterministic, agent-runnable pass/fail signal for the bug, you will find the cause. Bisection, hypothesis testing, and instrumentation all just consume that signal. Without one, no amount of staring at code will help.

Spend disproportionate effort here. **Be aggressive. Be creative. Refuse to give up.**

### Ways to build one — try in roughly this order

1. **Failing test** at whatever seam reaches the bug — unit, integration, e2e.
2. **CLI invocation** with a fixture input, diffing stdout against a known-good snapshot.
3. **Curl / HTTP script** against a running dev server.
4. **Headless browser script** (Playwright / Puppeteer) — drives UI, asserts on DOM/console/network.
5. **Replay a captured trace** — save a real request/payload/event log; replay it in isolation.
6. **Throwaway harness** — spin up a minimal subset of the system with mocked deps, single function call.
7. **Property / fuzz loop** — if the bug is "sometimes wrong output", run many random inputs and look for the failure mode.
8. **Bisection harness** — if the bug appeared between two known states (commit, dataset, version), automate `git bisect run`.
9. **Differential loop** — run the same input through old vs. new (or two configs) and diff outputs.
10. **HITL bash script** — last resort if a human must click UI. Use a structured script so the loop is still repeatable.

### Iterate on the loop itself

A good loop has three properties:

- **Fast** — under 10 seconds ideally; 30 seconds is the outer limit before it loses value.
- **Deterministic** — pin time, seed RNG, isolate filesystem, freeze network.
- **Sharp signal** — assert on the specific symptom, not "didn't crash".

### Non-deterministic bugs

The goal is not a clean repro but a **higher reproduction rate**. Loop the trigger 100×, parallelise, add stress, narrow timing windows. A 50%-flake bug is debuggable; a 1%-flake is not — keep raising the rate until it's debuggable.

### When you cannot build a loop

Stop and say so explicitly. List what you tried. Ask the user for: (a) access to the environment that reproduces it, (b) a captured artifact (HAR file, log dump, core dump, screen recording), or (c) permission to add temporary production instrumentation.

**Do not proceed to Phase 2 without a loop.**

---

## Phase 2 — Reproduce

Run the loop. Watch the bug appear.

Confirm:

- [ ] The loop produces the failure mode the **user** described — not a different nearby failure. Wrong bug = wrong fix.
- [ ] The failure is reproducible across multiple runs (or reproducible at a high enough rate to debug).
- [ ] You have captured the exact symptom (error message, wrong output, slow timing) so later phases can verify the fix addresses it.

**Do not proceed to Phase 3 without reproduction.**

---

## Phase 3 — Hypothesise

Generate **3–5 ranked hypotheses** before testing any of them. Single-hypothesis generation anchors on the first plausible idea.

Each hypothesis must be **falsifiable** — state the prediction it makes:

> "If **{X}** is the cause, then **{changing Y}** will make the bug disappear / **{changing Z}** will make it worse."

If you cannot state the prediction, the hypothesis is a vibe — discard or sharpen it.

**Show the ranked list to the user before testing.** They often have domain knowledge that re-ranks instantly, or know hypotheses already ruled out. Do not block on a response if the user is AFK — proceed with your ranking.

---

## Phase 4 — Instrument

Each probe must map to a specific prediction from Phase 3. **Change one variable at a time.**

### Tool preference

1. **Debugger / REPL inspection** if the environment supports it — one breakpoint beats ten logs.
2. **Targeted logs** at the boundaries that distinguish hypotheses.
3. Never "log everything and grep" — it produces noise, not signal.

### Tag every debug log

Use a unique per-session prefix: `[DEBUG-{4-char-hex}]`, e.g., `[DEBUG-a4f2]`.

```typescript
// [DEBUG-a4f2] injected for diagnosis — remove after fix
console.log('[DEBUG-a4f2] processOrder entry', { orderId, state });
```

```python
# [DEBUG-a4f2] injected for diagnosis — remove after fix
print(f"[DEBUG-a4f2] handle_request entry: req={req!r}")
```

Cleanup at the end becomes a single `grep -r 'DEBUG-a4f2'`. Untagged logs survive; tagged logs die.

### Performance regressions

Logs are usually the wrong tool for perf bugs. Instead: establish a baseline measurement (timing harness, `performance.now()`, profiler, query plan), then bisect. Measure first, fix second.

---

## Phase 5 — Fix + Regression Test

Write the regression test **before the fix** — but only if there is a **correct seam** for it.

A correct seam is one where the test exercises the **real bug pattern** as it occurs at the call site. If the only available seam is too shallow (unit test that can't replicate the chain that triggered the bug), a regression test there gives false confidence.

**If no correct seam exists, that itself is a finding.** Note it — the codebase architecture is preventing the bug from being locked down. Flag it for Phase 6.

If a correct seam exists:

1. Turn the minimised repro into a failing test at that seam.
2. Watch it fail (RED).
3. Apply the minimal fix.
4. Watch it pass (GREEN).
5. Re-run the Phase 1 feedback loop against the original scenario to confirm the bug is gone.

---

## Phase 6 — Cleanup + Post-mortem

Required before declaring done:

- [ ] Original repro no longer reproduces (re-run the Phase 1 loop)
- [ ] Regression test passes — or the absence of a correct seam is documented
- [ ] All `[DEBUG-{prefix}]` instrumentation removed — run `grep -r 'DEBUG-{prefix}'` to verify
- [ ] Throwaway harnesses and prototypes deleted or moved to a clearly-marked debug location
- [ ] The hypothesis that turned out correct is stated in the commit message — so the next debugger learns

**Then ask: what would have prevented this bug?** If the answer involves architectural change (no good test seam, tangled callers, hidden coupling) — hand off to `harness-task:architecture-deepening` with the specifics. Make the recommendation **after** the fix is in, not before — you have more information now than when you started.

---

## Diagnose vs. Bugfix

| | `harness-task:diagnose` | `harness-task:bugfix` |
|---|---|---|
| **When to use** | Any bug or perf regression, including in existing code outside the current workflow | Bug in code produced by the current executing/verifying workflow |
| **Primary output** | Root cause, regression test, post-mortem | Patched proposal.md + phase files, reset status.json |
| **Status.json** | Not modified | Reset to affected phase |
| **Triggered by** | User or bugfix skill (triage) | `/alles-bugfix` command or dev skill during executing |

---

## Rules

1. **Phase 1 is the skill.** Do not skip to Phase 3 without a pass/fail signal.
2. **One variable at a time** during instrumentation.
3. **Tag every debug log** with a unique prefix for clean removal.
4. **Write regression test before fix** — only if a correct seam exists.
5. **Grep-verify cleanup** — confirm all debug tags are removed before closing.
6. **Post-mortem is mandatory** — the hypothesis, the miss, and any architectural debt must be recorded in the commit message.

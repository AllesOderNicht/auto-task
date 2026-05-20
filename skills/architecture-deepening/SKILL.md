---
name: architecture-deepening
description: Find and deepen shallow modules in the codebase. Use when you want to improve testability, reduce coupling, surface hidden complexity, or make the codebase more AI-navigable. Triggered automatically after phase review when architecture concerns are found, and suggested at the end of verifying.
user-invocable: true
---

# Architecture Deepening

Surface architectural friction and propose **deepening opportunities** — refactors that turn shallow modules into deep ones. The aim is testability, AI-navigability, and locality of change.

See [LANGUAGE.md](./LANGUAGE.md) for the precise definitions of all architectural terms used below.

---

## Before You Start

Read the project's domain glossary and any ADRs first:

- If `CONTEXT.md` exists at the project root (or as indicated by `CONTEXT-MAP.md`), read it. Use its terms when discussing modules — "the Order intake module" rather than "the FooBarHandler".
- If `docs/adr/` exists, scan it for decisions in the area you're about to touch. Do not re-litigate decisions already recorded in an ADR unless the friction is real enough to warrant reopening — and if so, flag it explicitly.

---

## Process

### Step 1: Explore

Use a `code-explorer` subagent to walk the codebase organically. Do not follow rigid heuristics — look for **friction**:

- Where does understanding one concept require bouncing between many small modules?
- Where are modules **shallow** — interface nearly as complex as the implementation?
- Where have pure functions been extracted just for testability, but the real bugs hide in how they're called (no **locality**)?
- Where do tightly-coupled modules leak across their seams?
- Which parts of the codebase are untested, or hard to test through their current interface?

Apply the **deletion test** to anything you suspect is shallow:

> Imagine deleting the module. If complexity vanishes — it was a pass-through and earns nothing. If complexity reappears across N callers — the module was hiding something real and is worth deepening.

A "reappears across callers" result is the signal you want.

### Step 2: Present Candidates

Present a numbered list of deepening opportunities. **Do not propose interfaces yet.** For each candidate:

```
**{N}. {Module name or area}**
- Files: {which files/modules are involved}
- Problem: {why the current structure causes friction — use LANGUAGE.md terms}
- Solution: {plain English description of what would change}
- Benefits: {locality and leverage gains; how tests would improve}
```

**Language rules:**
- Use `CONTEXT.md` vocabulary for domain concepts.
- Use [LANGUAGE.md](./LANGUAGE.md) vocabulary for structural concepts: **module**, **interface**, **seam**, **adapter**, **depth**, **leverage**, **locality**.
- Do not use "component", "service", "API", or "boundary" as structural terms.

**ADR conflict:** If a candidate contradicts an existing ADR, surface it only when the friction is real enough to warrant reopening. Mark it explicitly: _"contradicts ADR-NNNN — but worth reopening because…"_

Ask the user: **"Which of these would you like to explore?"** Do not proceed until they pick.

### Step 3: Grilling Loop

Once the user picks a candidate, enter a grilling conversation. Walk the design tree:

- What sits behind the seam? What stays outside it?
- What interface does the deepened module expose?
- What tests survive? Which ones become waste once the new interface exists?
- What adapters are needed — production and test? (Remember: one adapter = hypothetical seam; two adapters = real seam.)
- What is the migration path? Can callers be updated incrementally?

**Side effects during the grilling loop:**

- **New domain term?** If you name a deepened module after a concept not yet in `CONTEXT.md`, add the term immediately using `harness-task:domain-docs` format. Do not batch.
- **Fuzzy term sharpened?** Update `CONTEXT.md` right there.
- **User rejects a candidate with a load-bearing reason?** Offer an ADR:
  > "Want me to record this as an ADR so future architecture reviews don't re-suggest it?"
  
  Only offer when the rejection reason would genuinely help a future explorer avoid re-suggesting the same thing. Skip ephemeral reasons ("not worth it right now") and self-evident ones.
  
  Use `harness-task:domain-docs` format for the ADR.

---

## Integration Points in the Workflow

This skill is triggered automatically at two points in the `/alles-dev` workflow:

1. **After phase review** (`executing` Step 3.5): If `phase_review_score.architecture_concern` is true (architecture dimension score ≤ 6 or critical issues mention shallow modules / missing seams), the executing skill pauses and asks: _"Phase review flagged architecture concerns. Run `harness-task:architecture-deepening` before proceeding?"_ The user can skip.

2. **End of verifying**: After the final verification report, if the change introduced several new modules, the dev skill suggests: _"This change added N modules. Consider running `harness-task:architecture-deepening` to check for shallow modules before archiving."_ The user can skip.

It can also be invoked directly by the user at any time.

---

## Rules

1. **Glossary first.** Read `CONTEXT.md` and ADRs before exploring. Use their vocabulary.
2. **Explore organically.** No rigid checklists — look for friction, apply the deletion test.
3. **Present candidates, don't propose interfaces.** Step 2 lists problems; Step 3 designs solutions.
4. **Two-adapter rule.** Don't introduce a seam unless at least two adapters are justified.
5. **Tests at the interface.** Old shallow-module tests become waste once tests at the deepened interface exist.
6. **Domain documentation is live.** Update `CONTEXT.md` immediately when new terms emerge. Offer ADRs for load-bearing rejections.
7. **No scope creep.** Only propose deepening for modules in the current change path unless the user explicitly asks for a broader scan.

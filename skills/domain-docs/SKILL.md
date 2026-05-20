---
name: domain-docs
description: Manage the project's domain language glossary (CONTEXT.md) and architecture decision records (docs/adr/). Use when you want to establish or update the canonical vocabulary for the project, record a significant architectural decision, or look up what a domain term means. Creates files lazily — only when you have something to write.
user-invocable: true
---

# Domain Docs

Maintain the project's two living documents that keep AI and human contributors speaking the same language:

- **`CONTEXT.md`** — the domain language glossary (what things are called and what they mean)
- **`docs/adr/`** — architecture decision records (why significant choices were made)

Both are created lazily. Do not create them until there is real content to write.

---

## CONTEXT.md — Domain Language Glossary

See [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md) for the full format specification.

### Purpose

`CONTEXT.md` is a **glossary and nothing else**. It defines what domain terms mean in this project's context so that:

- AI agents use the project's own vocabulary rather than inventing synonyms
- New contributors learn the language quickly
- Ambiguous terms are resolved once and not relitigated every conversation

### What belongs here

Only terms that are **specific to this project's domain**. Ask: is this concept unique to this codebase, or is it a general programming concept? Only the former belongs.

Examples that belong: `Order`, `Materialization Cascade`, `Settlement Cycle`

Examples that do not belong: `timeout`, `retry`, `error handler`, `repository pattern`

### Positioning relative to `.harness-task/context.md`

These two files serve different purposes and coexist:

| File | Purpose | Who reads it |
|------|---------|--------------|
| `CONTEXT.md` | Domain language glossary — what terms mean | All agents and contributors |
| `.harness-task/context.md` | Engineering configuration — coding standards, architectural constraints, delivery boundaries | harness-task workflow agents |

Do not put implementation details into `CONTEXT.md`. Do not put domain term definitions into `.harness-task/context.md`.

### Lazy creation

If `CONTEXT.md` does not exist and a new term needs to be recorded, create it at the project root. If `CONTEXT-MAP.md` exists, the project has multiple bounded contexts — place each term in the correct context file as indicated by the map.

### Updating

When a term is resolved during a conversation or code review:

1. Check if `CONTEXT.md` already defines it.
2. If yes and the definition is consistent — no action needed.
3. If yes but the definition conflicts with current usage — call it out and update.
4. If no — add the term immediately. Do not batch updates.

`CONTEXT.md` should never become stale. Update it in the same session the term is clarified.

---

## docs/adr/ — Architecture Decision Records

See [ADR-FORMAT.md](./ADR-FORMAT.md) for the full format specification.

### When to create an ADR

All three conditions must be true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will look at the code and wonder "why on earth did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons

If any condition is missing, skip the ADR. Easy-to-reverse decisions don't need records. Obvious decisions don't need records. Decisions with no real alternatives don't need records.

### Lazy creation

Create `docs/adr/` only when the first ADR is needed. Scan for the highest existing number and increment by one for the filename (`0001-slug.md`, `0002-slug.md`, …).

---

## Rules

1. **Glossary only in `CONTEXT.md`** — no implementation details, no specs, no scratch notes.
2. **ADR three-condition gate** — do not create an ADR unless all three conditions are met.
3. **Lazy creation** — do not create files until there is real content to write.
4. **Update immediately** — when a term is resolved, update `CONTEXT.md` in the same session.
5. **One canonical term** — when multiple words exist for the same concept, pick one and list the others as terms to avoid.
6. **ADRs are append-only** — never delete an ADR. If a decision is superseded, add a new ADR and reference the old one.

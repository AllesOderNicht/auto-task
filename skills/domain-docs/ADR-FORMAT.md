# ADR Format

ADRs live in `docs/adr/` and use sequential numbering: `0001-slug.md`, `0002-slug.md`, etc.

Create the `docs/adr/` directory lazily — only when the first ADR is needed.

---

## Template

```md
# {Short title of the decision}

{1–3 sentences: what's the context, what did we decide, and why.}
```

That's it. An ADR can be a single paragraph. The value is in recording *that* a decision was made and *why* — not in filling out sections.

---

## Optional Sections

Only include these when they add genuine value. Most ADRs won't need them.

- **Status** frontmatter (`proposed | accepted | deprecated | superseded by ADR-NNNN`) — useful when decisions are revisited
- **Considered Options** — only when the rejected alternatives are worth remembering
- **Consequences** — only when non-obvious downstream effects need to be called out

---

## Numbering

Scan `docs/adr/` for the highest existing number and increment by one.

---

## The Three-Condition Gate

All three conditions must be true before creating an ADR:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will look at the code and wonder "why on earth did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons

If any condition is missing, skip the ADR:
- Easy-to-reverse decision → just reverse it if needed, no record required
- Obvious decision → nobody will wonder why, no record required
- No real alternative → "we did the obvious thing" is not a trade-off

---

## What Qualifies

- **Architectural shape** — "We're using event sourcing for the write model."
- **Integration patterns between contexts** — "Ordering and Billing communicate via domain events, not synchronous HTTP."
- **Technology choices with lock-in** — database, message bus, auth provider. Not every library — only ones that would take a quarter to swap out.
- **Boundary and scope decisions** — "Customer data is owned by the Customer context; other contexts reference it by ID only."
- **Deliberate deviations from the obvious path** — "We're using raw SQL instead of an ORM because X." These stop the next engineer from "fixing" something intentional.
- **Constraints not visible in the code** — "We can't use AWS due to compliance." "Response times must be under 200 ms because of the partner API contract."
- **Rejected alternatives when the rejection is non-obvious** — if you chose REST over GraphQL for subtle reasons, record it.

---

## ADRs Are Append-Only

Never delete an ADR. If a decision is superseded:

1. Add a new ADR explaining the change.
2. Update the old ADR's Status to `superseded by ADR-NNNN`.

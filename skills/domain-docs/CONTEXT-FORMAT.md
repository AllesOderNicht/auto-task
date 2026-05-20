# CONTEXT.md Format

## Structure

```md
# {Context Name}

{One or two sentence description of what this context is and why it exists.}

## Language

**{Term}**:
{A one or two sentence definition. Define what it IS, not what it does.}
_Avoid_: {synonym1}, {synonym2}

**{Term}**:
{Definition.}
_Avoid_: {synonym}
```

### Example

```md
# Ordering

The context that receives customer intent and turns it into a tracked commitment.

## Language

**Order**:
A customer's request to purchase one or more products, tracked from placement through fulfillment.
_Avoid_: Purchase, transaction, cart

**Line Item**:
A single product quantity within an Order.
_Avoid_: Order item, product entry

**Customer**:
A person or organization that places Orders.
_Avoid_: Client, buyer, account, user
```

---

## Rules

- **Be opinionated.** When multiple words exist for the same concept, pick the best one and list the others under `_Avoid_`.
- **Keep definitions tight.** One or two sentences max. Define what it IS, not what it does.
- **No implementation details.** `CONTEXT.md` is a glossary, not a spec. Never include file paths, function names, API routes, or data schemas.
- **Only domain terms.** General programming concepts (timeout, retry, repository, error handler) do not belong even if the project uses them extensively. Before adding a term, ask: is this concept unique to this context, or a general programming concept?
- **Flag conflicts explicitly.** If a term is used ambiguously in the codebase or conversation, call it out under a `## Flagged Ambiguities` section and record the resolution.
- **Show relationships where obvious.** Use `**Term**` cross-references within definitions when cardinality or direction matters (e.g., "An Order contains one or more **Line Items**").
- **Group terms under subheadings** when natural clusters emerge. A flat list is fine for small glossaries.

---

## Single vs. Multi-Context Repos

**Single context (most repos):** One `CONTEXT.md` at the repo root.

**Multiple bounded contexts:** A `CONTEXT-MAP.md` at the repo root lists contexts, their locations, and relationships:

```md
# Context Map

## Contexts

- [Ordering](./src/ordering/CONTEXT.md) — receives and tracks customer orders
- [Billing](./src/billing/CONTEXT.md) — generates invoices and processes payments
- [Fulfillment](./src/fulfillment/CONTEXT.md) — manages warehouse picking and shipping

## Relationships

- **Ordering → Fulfillment**: Ordering emits `OrderPlaced` events; Fulfillment consumes them to start picking
- **Fulfillment → Billing**: Fulfillment emits `ShipmentDispatched` events; Billing consumes them to generate invoices
- **Ordering ↔ Billing**: Shared types for `CustomerId` and `Money`
```

When multiple contexts exist, infer which one the current topic belongs to based on the code being discussed. If unclear, ask.

---

## Lazy Creation

Do not create `CONTEXT.md` until there is at least one term to write. Create the file at the moment the first term is resolved — not before.

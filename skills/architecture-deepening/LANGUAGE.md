# Language

Shared vocabulary for every suggestion this skill makes. Use these terms exactly — do not substitute "component", "service", "API", or "boundary." Consistent language is the point.

---

## Terms

**Module**
Anything with an interface and an implementation. Deliberately scale-agnostic — applies equally to a function, class, package, or a tier-spanning slice.
_Avoid_: unit, component, service.

**Interface**
Everything a caller must know to use the module correctly. Includes the type signature, but also invariants, ordering constraints, error modes, required configuration, and performance characteristics.
_Avoid_: API, signature (those refer only to the type-level surface — too narrow).

**Implementation**
What's inside a module — its body of code. Distinct from **Adapter**: a thing can be a small adapter with a large implementation (a Postgres repository) or a large adapter with a small implementation (an in-memory fake). Reach for "adapter" when the seam is the topic; "implementation" otherwise.

**Depth**
Leverage at the interface — the amount of behaviour a caller (or test) can exercise per unit of interface they must learn. A module is **deep** when a large amount of behaviour sits behind a small interface. A module is **shallow** when the interface is nearly as complex as the implementation.

**Seam** _(from Michael Feathers)_
A place where you can alter behaviour without editing in that place. The location at which a module's interface lives. Choosing where to put the seam is its own design decision, distinct from what goes behind it.
_Avoid_: boundary (overloaded with DDD's bounded context).

**Adapter**
A concrete thing that satisfies an interface at a seam. Describes role (what slot it fills), not substance (what's inside).

**Leverage**
What callers get from depth. More capability per unit of interface they must learn. One implementation pays back across N call sites and M tests.

**Locality**
What maintainers get from depth. Change, bugs, knowledge, and verification concentrate at one place rather than spreading across callers. Fix once, fixed everywhere.

---

## Principles

- **Depth is a property of the interface, not the implementation.** A deep module can be internally composed of small, mockable, swappable parts — they just aren't part of the interface. A module can have **internal seams** (private to its implementation, used by its own tests) as well as the **external seam** at its interface.

- **The deletion test.** Imagine deleting the module. If complexity vanishes, the module wasn't hiding anything (it was a pass-through). If complexity reappears across N callers, the module was earning its keep.

- **The interface is the test surface.** Callers and tests cross the same seam. If you want to test *past* the interface, the module is probably the wrong shape.

- **One adapter means a hypothetical seam. Two adapters means a real one.** Don't introduce a seam unless something actually varies across it. A single-adapter seam is just indirection.

---

## Relationships

- A **Module** has exactly one **Interface** (the surface it presents to callers and tests).
- **Depth** is a property of a **Module**, measured against its **Interface**.
- A **Seam** is where a **Module**'s **Interface** lives.
- An **Adapter** sits at a **Seam** and satisfies the **Interface**.
- **Depth** produces **Leverage** for callers and **Locality** for maintainers.

---

## Dependency Categories (for deepening assessment)

When assessing a candidate for deepening, classify its dependencies:

| Category | Description | Testing approach |
|----------|-------------|-----------------|
| **In-process** | Pure computation, in-memory state, no I/O | Always deepenable — merge and test through the new interface directly |
| **Local-substitutable** | Has a local test stand-in (PGLite for Postgres, in-memory filesystem) | Deepenable — test with the stand-in; seam is internal |
| **Remote but owned** | Your own services across a network boundary | Define a port (interface) at the seam; production adapter for real transport, in-memory adapter for tests |
| **True external** | Third-party services (Stripe, etc.) | Deep module takes the dependency as an injected port; tests provide a mock adapter |

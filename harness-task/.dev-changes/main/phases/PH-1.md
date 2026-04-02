# Phase PH-1: Core workflow consolidation

**Goal:** Make the core workflow definitions and tests treat `outlining` as the only planning stage and stop requiring `outline.md`.
**Verification:** The focused test suite passes, status utilities expose only four stages, and workflow-facing documents no longer describe `proposing` as a distinct stage.
**Depends on:** none
**Sub-agent:** no: main agent handles it
**Skills:** harness-task:tdd
**Handoff Input:** Preserve prompt capture semantics and the existing executing/verifying/done behavior while collapsing only the planning portion.
**Completion Summary:** Core workflow metadata now uses `outlining` as the single planning stage, `proposal.md` is the only high-level planning artifact, and tests prove the new stage order.

---

**Do:**
- Add a failing test that locks the new stage order and initial status behavior.
- Update the status utility definitions to remove `proposing`.
- Update the primary workflow skill so startup creates or switches branches immediately and outlining owns proposal generation, specs, plans, and the single confirmation gate.

**Don't:**
- Don't reintroduce backward-compatibility branches for old statuses or old artifact names.
- Don't change execution, review, or verification semantics beyond what is necessary to reference the merged planning stage.

**Detail:**
Start by expanding the existing status utility tests so they fail under the old five-stage model. Cover the initial stage, the next-stage progression, and the expectation that `proposal.md` is the high-level planning artifact. Then make the minimal code and workflow-definition changes required to satisfy those tests. Update any closely related skill text that directly governs runtime behavior, but keep the scope centered on workflow/state correctness rather than broad documentation polish.

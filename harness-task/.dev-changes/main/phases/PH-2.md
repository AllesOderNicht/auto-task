# Phase PH-2: Documentation and skill alignment

**Goal:** Bring every remaining skill and README reference into full alignment with the merged outlining workflow.
**Verification:** Repository searches no longer show user-facing references that require `proposing` or `outline.md`, and the README plus related skills consistently describe the new startup and confirmation behavior.
**Depends on:** PH-1
**Sub-agent:** no: main agent handles it
**Skills:** harness-task:tdd, harness-task:review
**Handoff Input:** Keep the terminology and artifact names identical to the finalized Phase 1 definitions so docs do not drift from runtime behavior.
**Completion Summary:** All user-facing docs now describe one outlining stage, immediate branch setup on `/alles-dev`, one planning confirmation, and `proposal.md` as the sole high-level planning document.

---

**Do:**
- Update the bilingual READMEs to reflect the merged planning model and the revised directory layout.
- Revise remaining skill docs such as brainstorming, planning, review, templates, and using-harness-task to remove stale stage or artifact references.
- Verify with targeted searches that no user-facing guidance still instructs the old flow.

**Don't:**
- Don't broaden into unrelated copy editing or redesign the workflow beyond the approved behavior change.
- Don't leave mixed terminology where some docs still mention `proposing` while others do not.

**Detail:**
Use the finalized workflow language from Phase 1 as the source of truth. Update the top-level flow diagrams, stage tables, recovery guidance, artifact descriptions, and template descriptions so they all point to `proposal.md` plus phase plans/specs. After editing, run targeted searches for `proposing` and `outline.md` in user-facing files and resolve any remaining stale references unless they are clearly historical or third-party content outside the plugin's own docs.

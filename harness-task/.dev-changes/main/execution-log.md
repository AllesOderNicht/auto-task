## Phase PH-1: Core workflow consolidation
- Status: completed
- Summary: The workflow state machine now starts in `outlining`, advances through four stages only, and the primary `dev` skill describes `proposal.md` as the single high-level planning document. Focused tests were updated first and now verify the new stage order and initial status behavior.
- Files changed: `src/utils/status.ts`, `tests/change-utils.test.ts`, `skills/dev/SKILL.md`, `dist/utils/status.js`, `dist/utils/status.d.ts`
- Tests: `npm test` passed; `npm run build` passed
- Commit: not created in this session
- Next handoff: Preserve the merged outlining terminology across every remaining user-facing doc and skill so no stale `proposing` or `outline.md` references remain.
- Timestamp: 2026-04-02T15:50:00.000Z

## Phase PH-2: Documentation and skill alignment
- Status: completed
- Summary: The README, Chinese README, plugin metadata, brainstorming/review/templates/using-harness-task skills, and template command docs now all describe one `outlining` stage, immediate branch preparation on startup, one planning confirmation point, and `proposal.md` as the sole top-level planning file.
- Files changed: `README.md`, `README.zh-CN.md`, `skills/brainstorming/SKILL.md`, `skills/planning/SKILL.md`, `skills/review/SKILL.md`, `skills/templates/SKILL.md`, `skills/using-harness-task/SKILL.md`, `.cursor-plugin/plugin.json`, `.claude-plugin/plugin.json`, `commands/templates.md`
- Tests: targeted `rg` validation found no remaining user-facing `proposing` or `outline.md` references; `ReadLints` reported no issues
- Commit: not created in this session
- Next handoff: none
- Timestamp: 2026-04-02T15:55:00.000Z

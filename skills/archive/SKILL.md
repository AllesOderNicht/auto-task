---
name: archive
description: Archive a completed development change. Moves the change directory to archive with a date prefix, writes archive.md summary, and marks status.json as archived.
user-invocable: true
---

# Archive — Complete and Archive a Change

Archive a development change that has reached the `verifying` stage (or already completed all phases).

## Prerequisites

- The change must be in `verifying` stage **or** have all phases with `completed` status.
- If in `verifying` stage, all tests should ideally pass (warn and confirm with user if they don't).

## Steps

### 1. Identify the Change

If no branch name is provided as argument:
- Check `status.json` for the current active change in `.dev-changes/`.
- If multiple active changes exist, ask the user which one to archive.
- If none found, report that no archivable change was found.

### 2. Validate

Read `status.json` and verify:
- `stage` is `verifying`, OR all phases have `status: "completed"`.
- If neither condition is met, report the current stage and refuse to archive.
- If in `verifying` but tests fail, warn the user and ask for explicit confirmation to proceed.

### 3. Generate `archive.md`

Create `archive.md` inside the change directory **before** moving it. This file must contain:

```markdown
# Archive: {branch-name}

**Archived:** {YYYY-MM-DD}
**Branch:** {branch-name}
**Stages Completed:** init → prompting → refining → proposing → executing → verifying

---

## Feature Summary

{Synthesize 2–4 paragraphs from proposal.md: what problem this change solved, what was built,
and the key design decisions made. Focus on "why" and "what", not line-by-line details.}

## Phase Summaries

{For each phase in status.json, write one line per phase:
- PH-1 ({title}): {summary}
- PH-2 ({title}): {summary}
...}

## Key Design Decisions

{Extract 3–7 notable decisions from proposal.md and phase summaries. Each item should explain
the decision and why it was made. Use the MUST/MUST NOT/MAY boundaries from proposal.md.}

## Known Caveats and Limitations

{List any explicitly mentioned constraints, trade-offs, or out-of-scope items from proposal.md
and the phase plans. If none were mentioned, write "None documented."}

## Notes for Future Reference

{Anything a future developer should know when revisiting this code: gotchas, follow-up work
suggested in the proposal, or important context from the Q&A refinement process.}
```

Use actual content from `proposal.md` and phase summaries in `status.json`. Do not copy proposal.md verbatim — synthesize and summarize.

### 4. Update `status.json`

Before moving the directory, add two fields to `status.json`:

```json
{
  "archived": true,
  "archived_at": "YYYY-MM-DDTHH:MM:SS.000Z"
}
```

Write the updated `status.json` back to disk. The `stage` field remains `verifying` (or its current value) — `archived` is a separate flag.

### 5. Move to Archive

Move the entire change directory:

```
.dev-changes/{branch-dir}/  →  .dev-changes/archive/YYYY-MM-DD-{branch-dir}/
```

Create `.dev-changes/archive/` if it doesn't exist.

### 6. Clean Up Branch (Optional)

Ask the user if they want to:
- Delete the feature branch locally.
- Keep the branch for further reference.

Do not force-delete; always ask first.

### 7. Report

Show a concise summary:

```
Archived: {branch-name}
Location: .dev-changes/archive/YYYY-MM-DD-{branch-dir}/
Archive summary: .dev-changes/archive/YYYY-MM-DD-{branch-dir}/archive.md
Branch: {kept / deleted}
```

## Archive Structure

```
.dev-changes/
  archive/
    2026-04-02-feature-auth/
      prompt.md
      proposal.md
      status.json        ← contains archived: true, archived_at: "..."
      archive.md         ← NEW: feature summary + key decisions + caveats
      phases/
        PH-1.md
        PH-2.md
```

## `status.json` After Archiving

```json
{
  "branch": "feature/my-change",
  "change_dir": "feature-my-change",
  "stage": "verifying",
  "question_checkpoint": 3,
  "created_at": "2026-04-02T00:00:00.000Z",
  "updated_at": "2026-04-02T01:00:00.000Z",
  "archived": true,
  "archived_at": "2026-04-02T02:00:00.000Z",
  "current_phase": "PH-2",
  "phases": [
    { "id": "PH-1", "title": "Setup", "status": "completed", "summary": "..." },
    { "id": "PH-2", "title": "Core", "status": "completed", "summary": "..." }
  ]
}
```

## `archive.md` Content Guidelines

- **Feature Summary**: Focus on problem statement and high-level solution. Avoid code-level detail. 2–4 paragraphs max.
- **Key Design Decisions**: Extract from proposal.md's MUST/MUST NOT/MAY sections and phase plan rationale. 3–7 bullet points.
- **Known Caveats**: Explicit trade-offs or scope exclusions from proposal.md. Be honest about limitations.
- **Notes for Future Reference**: Anything that would help someone revisit this in 6 months — environment assumptions, follow-up suggestions, non-obvious integration points.

## Error Cases

| Situation | Behavior |
|-----------|----------|
| Stage is not `verifying` and not all phases completed | Refuse with clear message showing current stage |
| `proposal.md` is missing | Generate archive.md with only phase summaries from status.json; note that proposal.md was not found |
| No changes exist in `.dev-changes/` | Report "No archivable changes found" |
| Archive destination already exists | Append `-2`, `-3` etc. to the archive directory name to avoid collision |

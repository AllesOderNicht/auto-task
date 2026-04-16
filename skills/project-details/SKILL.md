---
name: project-details
description: Generate a project notes file from archived development changes. Scans .dev-changes/archive/ and writes project-details/NOTES.md with synthesized key decisions, caveats, and future reference notes. Use when the user runs /alles-details or wants a summary of accumulated project knowledge.
user-invocable: true
---

# Project Details — Generate Project Notes from Archive

Scan `.dev-changes/archive/` and write `project-details/NOTES.md` with synthesized knowledge from all archived changes.

## Steps

### 1. Scan Archive

Read every `archive.md` under `.dev-changes/archive/*/archive.md`.

- If `.dev-changes/archive/` does not exist or contains no subdirectories, report:
  > No archived changes found. Run `/alles-archive` to archive completed changes first.
  Then stop.

### 2. Extract Sections from Each `archive.md`

For each archived change, extract:
- **Branch name** — from the directory name (`YYYY-MM-DD-{branch-dir}`) or the `# Archive:` heading
- **Archived date** — from the `YYYY-MM-DD` prefix of the directory name
- **Feature Summary** — the content under `## Feature Summary`
- **Key Design Decisions** — bullet points under `## Key Design Decisions`
- **Known Caveats and Limitations** — bullet points under `## Known Caveats and Limitations`
- **Notes for Future Reference** — bullet points under `## Notes for Future Reference`

### 3. Create Output Directory

Create `project-details/` in the workspace root if it does not already exist.

### 4. Write `project-details/NOTES.md`

Synthesize all extracted content into this file. Follow the template below exactly.

- **Key Design Decisions**: Merge all bullet points from all archives. Remove obvious duplicates. Prefix each item with `[{branch-name}]` so the origin is traceable.
- **Known Caveats**: Same merge approach.
- **Notes for Future Reference**: Same merge approach.
- **Change History**: One entry per archived change, ordered newest-first. Keep Feature Summary to 1–2 sentences.

## Output Template

```markdown
# Project Notes

_Last updated: {YYYY-MM-DD}. Generated from {N} archived change(s)._

---

## Key Design Decisions

- [{branch-name}] {decision}
- [{branch-name}] {decision}

## Known Caveats and Limitations

- [{branch-name}] {caveat}

## Notes for Future Reference

- [{branch-name}] {note}

---

## Change History

### {branch-name} ({YYYY-MM-DD})

{Feature Summary — 1–2 sentences}

```

## Error Cases

| Situation | Behavior |
|-----------|----------|
| `.dev-changes/archive/` missing or empty | Report and stop — do not create an empty file |
| An `archive.md` is missing a section | Skip that section for that change; do not error |
| `project-details/NOTES.md` already exists | Overwrite it; always regenerate from scratch |

## Report

After writing the file, show:

```
Generated: project-details/NOTES.md
Sources:   {N} archived change(s)
Changes:   {branch1}, {branch2}, ...
```

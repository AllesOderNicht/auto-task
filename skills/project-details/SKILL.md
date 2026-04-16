---
name: project-details
description: Generate a flat precautions checklist from archived development changes. Scans .dev-changes/archive/ and writes project-details/NOTES.md with all caveats and future reference notes extracted from each archive.md. Use when the user runs /alles-details or wants a consolidated list of things to watch out for.
user-invocable: true
---

# Project Details — Generate Precautions Checklist from Archive

Scan `.dev-changes/archive/` and write `project-details/NOTES.md` as a single flat list of precautions derived from all archived changes.

## Steps

### 1. Scan Archive

Read every `archive.md` under `.dev-changes/archive/*/archive.md`.

- If `.dev-changes/archive/` does not exist or contains no subdirectories, report:
  > No archived changes found. Run `/alles-archive` to archive completed changes first.
  Then stop.

### 2. Extract Content from Each `archive.md`

For each archived change, extract:

- **Feature name** — Derive a short human-readable name (2–5 words) from the first sentence of `## Feature Summary`. If the Feature Summary is missing or empty, fall back to the archive directory name (strip the `YYYY-MM-DD-` date prefix).
- **禁止事项** — All bullet points under `## 禁止事项`. Skip if the section is missing or contains only "None documented."
- **注意事项** — All bullet points under `## 注意事项`. Skip if the section is missing or contains only "None documented."
- **推荐做法** — All bullet points under `## 推荐做法`. Skip if the section is missing or contains only "None documented."

Do **not** extract Key Design Decisions, Feature Summary paragraphs, or Phase Summaries.

### 3. Build the Flat List

Combine all extracted caveats and future notes from all archives into a single list.

- Prefix each item with `[{feature-name}]` using the derived feature name from step 2.
- Preserve the original "禁止"/"注意"/"推荐" prefix on each item — do not strip it.
- Remove items that are obviously duplicates (identical or near-identical wording).
- Do not group or sort by archive, branch, or category — keep a single flat sequence.

### 4. Create Output Directory

Create `project-details/` in the workspace root if it does not already exist.

### 5. Write `project-details/NOTES.md`

Write the flat list using the template below. If all archives had empty caveats and notes sections, write the file with a note saying no precautions were documented.

## Output Template

```markdown
# 项目注意事项

_最后更新：{YYYY-MM-DD}。来源：{N} 个已归档变更。_

---

- [{feature-name}] {caveat or note}
- [{feature-name}] {caveat or note}
- [{feature-name}] {caveat or note}
```

Example:

```markdown
# 项目注意事项

_最后更新：2026-04-16。来源：3 个已归档变更。_

---

- [用户认证功能] 禁止直接修改 status.json 的 stage 字段而不经过校验逻辑
- [订单模块] 禁止在未完成所有 phases 的情况下调用 archive
- [用户认证功能] 注意 refresh token 过期后不自动续期，需引导重新登录
- [订单模块] 注意创建订单时需加分布式锁，防止重复提交
- [用户认证功能] 推荐从 Feature Summary 第一句话中提炼功能名称，保持可读性
```

## Error Cases

| Situation | Behavior |
|-----------|----------|
| `.dev-changes/archive/` missing or empty | Report and stop — do not create an empty file |
| An `archive.md` is missing all three sections (禁止/注意/推荐) | Skip that archive silently; continue with others |
| Feature Summary is missing or unparseable | Fall back to archive directory name (strip date prefix) |
| All extracted items are duplicates after dedup | Keep at least one copy per unique item |
| `project-details/NOTES.md` already exists | Overwrite it; always regenerate from scratch |

## Report

After writing the file, show:

```
Generated: project-details/NOTES.md
Sources:   {N} archived change(s)
Items:     {M} precaution(s) listed
```

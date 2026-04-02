---
name: brainstorming
description: Use during outlining to explore requirements and draft the proposal content that anchors the planning package.
---

# Brainstorming Requirements Into Proposal Content

Help turn ideas into structured proposal content through focused collaborative dialogue.

<HARD-GATE>
You MUST complete ALL of the following before generating ANY proposal content or planning:
1. Read prompt.md, project context, and RELEVANT SOURCE CODE first — understand the codebase yourself
2. Present at least 5 unclear/ambiguous points to the user as MULTIPLE-CHOICE questions
3. WAIT for the user to respond to those questions
4. Propose 2-3 approaches and get the user's preference
5. ONLY THEN generate proposal.md

Skipping ANY step — especially the 5-question discussion — is a CRITICAL VIOLATION.
This applies to EVERY change regardless of perceived simplicity.
Do NOT write any code or take any implementation action until the outlining package is confirmed.
</HARD-GATE>

<TOOL-BUDGET>
Allowed:
- Read prompt.md, context.md, specs/ files, templates
- Read source code files DIRECTLY RELEVANT to the prompt (targeted reading, not blind exploration)
- Dispatch ONE explore sub-agent if needed (for targeted code reading only)

Forbidden:
- Blind exploration — do NOT grep/search the entire codebase without clear purpose
- Do NOT read files unrelated to the prompt's scope
- MUST NOT exceed 15 tool calls total for code reading
</TOOL-BUDGET>

## Process

### Step 1. Understand Context
- Read optional project context (`.harness-task/context.md`, `.harness-task/specs/`)
- Read `.dev-changes/{safe-branch-dir}/prompt.md`
- Read the user's requirement description

### Step 2. Read Relevant Code (DO THIS BEFORE ASKING QUESTIONS)

<READ-FIRST>
You MUST read the relevant source code BEFORE asking the user any questions.
Do NOT ask the user questions that you could answer by reading the code yourself.

Bad example (asks user to explain what the code already shows):
  "What is a pptw file? Where is it in the project?"
  → You should have found this by reading the code.

Good example (asks about decisions the code cannot answer):
  "I see the pptw renderer uses Canvas API (src/renderer.ts:42). For the export,
   should we: A) reuse Canvas rendering  B) use Playwright to render the full page
   C) other?"
  → This requires a human decision about approach.
</READ-FIRST>

- Identify source code files directly relevant to the prompt
- Read them with targeted purpose — understand existing behavior, interfaces, and constraints
- Build a mental model of the relevant parts of the codebase
- Do NOT blindly explore the entire codebase; stay within the prompt's scope

### Step 3. Discuss Unclear Points (MANDATORY — at least 5 MULTIPLE-CHOICE questions)

<STOP-AND-ASK>
After reading code, you MUST stop here and present at least 5 unclear or ambiguous
points to the user. You are FORBIDDEN from generating proposal.md, phase plans,
or any planning content until the user has answered these questions.

If you cannot identify 5 points, you have not read the prompt or code carefully enough.
Go back and re-read.
</STOP-AND-ASK>

<QUESTION-FORMAT>
EVERY question MUST be in multiple-choice format. This is mandatory, not optional.

Format each question as:
```
**{N}. {Question text that shows you understood the code}**
   A) {Option — with brief explanation}
   B) {Option — with brief explanation}
   C) {Option — with brief explanation}
   D) 其他（请说明）
```

Rules:
- Each question MUST have 2-4 concrete options PLUS a free-input "其他" option
- Options should reflect YOUR understanding from reading the code — show the user you did the homework
- Questions must be about DECISIONS (approach, scope, behavior) — NOT about facts you could find in code
- Lead with a brief context sentence referencing specific code you read (file, function, line) so the user knows you understand the codebase
- The user should be able to answer most questions by just typing "1A 2B 3C 4A 5B" — make it that easy

BAD questions (things you should figure out yourself by reading code):
- "What is X? Where is it in the project?" → Read the code.
- "What framework does the frontend use?" → Read package.json.
- "How does the existing feature work?" → Read the source.

GOOD questions (decisions that require human judgment):
- "The export could be triggered from: A) toolbar button B) right-click menu C) API endpoint D) 其他"
- "I found the renderer uses Canvas. For PDF export: A) reuse Canvas output B) Playwright full-page screenshot C) 其他"
- "Error handling for failed exports: A) toast notification B) retry dialog C) silent log + download retry D) 其他"
</QUESTION-FORMAT>

Questions may cover:
  - Implementation approach decisions with trade-offs discovered in the code
  - Feature scope boundaries (must-have vs nice-to-have)
  - UX decisions (trigger method, output format, error feedback)
  - Edge cases found in the existing code
  - Performance vs quality trade-offs
  - Compatibility concerns with existing architecture

**Rules for this step:**
- Present all 5+ questions at once as a numbered list
- **ALL questions MUST be multiple-choice** — no open-ended questions
- **WAIT** for the user to respond — do NOT proceed until they answer
- If the user's response raises new questions, ask follow-ups (also in multiple-choice format)

### Step 4. Propose 2-3 Approaches
- Based on the user's answers, present 2-3 overall implementation approaches
- Each approach: 1-2 sentence summary, key trade-offs, your recommendation
- Format as options (方案 A / 方案 B / 方案 C) so the user can pick easily
- Wait for the user to indicate their preference

### Step 5. Generate `proposal.md`

<PREREQUISITE-CHECK>
Before generating proposal.md, verify you have completed:
- [x] Read prompt.md and relevant source code (Step 1-2)
- [x] Asked at least 5 multiple-choice questions AND received user answers (Step 3)
- [x] Proposed approaches AND received user preference (Step 4)

If ANY checkbox is not met, GO BACK to the missing step. Do NOT proceed.
</PREREQUISITE-CHECK>

Once all prerequisites are met:

1. Check if `.harness-task/templates/proposal.md` exists in the project
2. Use `.harness-task/templates/proposal.md` if it exists
3. If it doesn't exist, use the built-in default format below:

```markdown
## Why
{Motivation — what problem does this solve?}

## What Changes
{Specific changes being made}

### New Capabilities
- `{name}`: {description}

### Modified Capabilities
- `{existing-name}`: {what's changing}

### Removed Capabilities
- `{name}`: {why it's being removed}

## Scope
### Included
{What's in scope}

### Excluded
{What's explicitly out of scope}

## Acceptance Criteria
- [ ] {Criterion 1}
- [ ] {Criterion 2}

## Phase Outline
### Phase PH-{n}: {title}
- Goal: {one sentence}
- Verification: {how to verify}
```

### Step 6. Write and Hand Off
- **MUST** write the file to `.dev-changes/{safe-branch-dir}/proposal.md`
- Ensure it is ready to be presented together with delta specs and phase plans
- proposal.md is a mandatory output — NEVER skip writing this file

## Key Principles

- **Read code first, ask questions second** — never ask the user about things you can find in the code
- **All questions must be multiple-choice** — the user should be able to answer by picking options (e.g. "1A 2B 3C 4A 5B")
- **5-question minimum is non-negotiable** — no proposal without user-answered questions
- **proposal.md is a mandatory artifact** — always write it to disk before proceeding
- **YAGNI ruthlessly** — remove unnecessary scope
- **Explore alternatives** — always offer 2-3 approaches
- **No implementation before confirmation** — the full outlining package is the gate

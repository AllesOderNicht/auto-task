---
name: brainstorming
description: Two-round structured brainstorming. Round 1 (refining) — no subagent, ask questions, generate refined-prompt.md. Round 2 (proposing) — subagent explores code, generate proposal.md + design.md + tasks.md.
---

# Brainstorming — Two-Round Design Process

This skill drives two distinct brainstorming rounds. Each round has different tools, goals, and outputs.

---

## Round 1: Refining (stage = `refining`)

**Goal**: Deeply understand the user's intent and generate a comprehensive `refined-prompt.md`.

**Constraints**: NO subagent. Work entirely in the current conversation context.

### Steps

1. **Read the codebase** — Before asking any questions, spend tool calls exploring the project:
   - Read `prompt.md` to understand the user's raw request.
   - Read key project files: `package.json`, `README.md`, config files, entry points.
   - Scan directory structure to understand the project layout.
   - Read source files most relevant to the prompt.
   - Budget: use as many tool calls as needed to understand the project sufficiently.

2. **Ask at least 5 structured questions** — Based on your code reading and the prompt, present questions using the structured question tool (AskQuestion / multiple-choice format). Questions must:
   - Be concrete, not vague. Reference specific files, APIs, or patterns you found.
   - Cover: scope boundaries, technical approach, constraints, edge cases, priorities.
   - Use multiple-choice options (2–5 per question) when possible.
   - Be asked in a single batch, not one at a time.

   Example question areas:
   - "Which modules should be affected?" (with options based on actual code)
   - "Should X behavior be preserved or changed?"
   - "What's the priority: performance vs simplicity vs extensibility?"
   - "Should this be backward-compatible?"
   - "How should error cases be handled?"

3. **Generate `refined-prompt.md`** — After receiving answers, create a comprehensive refined prompt:

   ```markdown
   # Refined Prompt

   - Branch: `{branch-name}`
   - Original Prompt: `prompt.md`

   ## Context
   <!-- Project context discovered during code reading -->

   ## Requirements
   <!-- Consolidated from original prompt + Q&A answers -->

   ### Functional Requirements
   <!-- What the system should do -->

   ### Non-Functional Requirements
   <!-- Constraints, performance, compatibility -->

   ## Scope
   ### In Scope
   <!-- Explicitly included -->

   ### Out of Scope
   <!-- Explicitly excluded -->

   ## Key Decisions
   <!-- Decisions made during Q&A -->
   - Q: {question} → A: {answer} → Decision: {what this means for implementation}
   ```

4. **Update status.json** — Set stage to `proposing`.

### Round 1 Checklist

- [ ] Read project structure and relevant source code
- [ ] Read prompt.md
- [ ] Ask >= 5 structured questions in a single batch
- [ ] Receive all answers
- [ ] Generate refined-prompt.md
- [ ] Update status.json to `proposing`

---

## Round 2: Proposing (stage = `proposing`)

**Goal**: Generate `proposal.md`, `design.md`, and `tasks.md` with concrete implementation plans.

**Constraints**: USE subagent to explore code. Compress round 1 context first.

### Context Compression

Before starting round 2, compress the round 1 context:
- Do NOT carry the full round 1 conversation history.
- Read `refined-prompt.md` as the authoritative input.
- Summarize any round 1 context into a short paragraph, then proceed with round 2 work.

### Steps

1. **Read `refined-prompt.md`** — This is your single source of truth for requirements.

2. **Explore code with subagent** — Launch subagent(s) to explore the codebase:
   - Use `explore` type subagents to investigate different code areas in parallel.
   - Areas to explore: source code structure, existing patterns, test infrastructure, dependencies, config.
   - Each subagent should return: key files found, patterns observed, potential impact areas.

3. **Synthesize and generate three files**:

   **`proposal.md`** — What and Why:
   ```markdown
   # Proposal: {title}

   ## Goal
   <!-- What this change achieves -->

   ## Background
   <!-- Current state and why change is needed -->

   ## Changes Overview
   <!-- High-level summary of what will change -->

   ## Impact
   <!-- What's affected: files, APIs, behavior -->

   ## Risks
   <!-- What could go wrong and mitigation -->
   ```

   **`design.md`** — How:
   ```markdown
   # Design: {title}

   ## Architecture
   <!-- Key architectural decisions -->

   ## Technical Approach
   <!-- Implementation strategy -->

   ## Interface Changes
   <!-- API/interface modifications -->

   ## Data Flow
   <!-- How data moves through the system -->

   ## Dependencies
   <!-- External dependencies, if any -->
   ```

   **`tasks.md`** — Execution Plan:
   ```markdown
   # Tasks

   ## Phase 1: {title}
   - [ ] 1.1 {specific task with file paths}
   - [ ] 1.2 {another specific task}

   ## Phase 2: {title}
   - [ ] 2.1 {specific task}
   - [ ] 2.2 {another specific task}

   ## Phase 3: {title}
   - [ ] 3.1 {specific task}
   ```

   Task writing rules:
   - Each phase should be completable independently.
   - Each task should reference specific files or modules.
   - Each task should be small enough to implement and test in one TDD cycle.
   - Order phases by dependency: foundational work first.

4. **Update status.json** — Parse phases from `tasks.md`, populate the phases array, keep stage as `proposing`.

5. **Wait for user confirmation** — Present the proposal summary and ask the user to confirm before proceeding. Only after confirmation, set stage to `executing`.

### Round 2 Checklist

- [ ] Compress round 1 context
- [ ] Read refined-prompt.md
- [ ] Launch subagent(s) to explore codebase
- [ ] Generate proposal.md
- [ ] Generate design.md
- [ ] Generate tasks.md with phased plan
- [ ] Update status.json with parsed phases
- [ ] Present summary to user
- [ ] Receive user confirmation
- [ ] Update status.json stage to `executing`

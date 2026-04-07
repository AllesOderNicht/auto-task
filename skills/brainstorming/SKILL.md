---
name: brainstorming
description: Three checkpoint-based question stages inside refining. Checkpoint 1 follows prompt input, checkpoint 2 follows the first answers, checkpoint 3 happens at the refine-to-proposal handoff. Each checkpoint asks at least 3 questions and progress is tracked in status.json via question_checkpoint (1/2/3).
---

# Brainstorming — Three Question Checkpoints

This skill drives three distinct question checkpoints, all executed within the `refining` stage. Progress is tracked in `status.json` via the `question_checkpoint` field (`0 -> 1 -> 2 -> 3`). The stage can only advance from `refining` to `proposing` when `question_checkpoint === 3`.

**Checkpoint overview:**

| Checkpoint | Name | Goal | status.json update |
|------------|------|------|--------------------|
| 1 | Prompt-Input Clarification | Ask at least 3 broad questions after reading the prompt and code | `question_checkpoint: 1` |
| 2 | Follow-up Clarification | Ask at least 3 follow-up questions after checkpoint 1 answers | `question_checkpoint: 2` |
| 3 | Proposal Transition | Ask at least 3 proposal-shaping questions, then generate `proposal.md` + self-contained phase plans | `question_checkpoint: 3`, then set stage to `proposing` |

---

## Checkpoint 1: Prompt-Input Clarification (`question_checkpoint`: 0 -> 1)

**Prerequisite**: `prompt.md` must already contain the user's requirements (filled during the `prompting` stage). Checkpoint 1 does NOT start until the user has input their prompt.

**Gate check**: Read `status.json` — if `question_checkpoint >= 1`, skip to Checkpoint 2.

**Goal**: Explore the problem space across multiple dimensions with broad questions, grounded in actual code.

**Constraints**: NO subagent. Work entirely in the current conversation context.

### Steps

1. **Read `prompt.md` and the codebase** — Before asking any questions:
   - **First**, read `prompt.md` to understand the user's raw request.
   - **Then**, explore the project to build technical context around the prompt:
     - Read key project files: `package.json`, `README.md`, config files, entry points.
     - Scan directory structure to understand the project layout.
     - Read source files most relevant to the prompt.
   - Budget: use as many tool calls as needed to understand the project sufficiently.

2. **Ask at least 3 prompt-input questions** — Present questions using the AskQuestion tool (multiple-choice format) in a **single batch**.

   **Requirements:**
   - Assume the user has NOT read the code. Each question must include enough code context for the user to make an informed choice.
   - Cover at least 3 different dimensions: scope boundaries, technical direction, priorities, compatibility, error handling strategy, performance vs simplicity trade-offs.
   - Use multiple-choice options (2-5 per question) grounded in actual code patterns discovered during code reading.

3. **Update `status.json`** — Set `question_checkpoint` to `1`. Stage remains `refining`.

4. **Immediately proceed to Checkpoint 2.**

### Checkpoint 1 Checklist

- [ ] Read `prompt.md` (user's raw requirements)
- [ ] Read project structure and relevant source code
- [ ] Ask at least 3 prompt-input questions (AskQuestion, single batch)
- [ ] Receive answers
- [ ] Update `status.json`: set `question_checkpoint` to `1`
- [ ] Immediately proceed to Checkpoint 2 (do NOT stop here)

---

## Checkpoint 2: Follow-up Clarification (`question_checkpoint`: 1 -> 2)

**Gate check**: Read `status.json` — `question_checkpoint` must be `>= 1`. If `>= 2`, skip to Checkpoint 3.

**Goal**: Resolve ambiguities, conflicts, and missing decisions identified from Checkpoint 1 answers.

**Constraints**: NO subagent. Work entirely in the current conversation context.

### Steps

1. **Analyze Checkpoint 1 answers** using the **three-rule divergence detection**:

   | Rule | What to look for |
   |------|------------------|
   | **Ambiguity/Contradiction** | Answers that are vague, conflict with each other, or leave room for multiple interpretations |
   | **Code-Intent Conflict** | Places where the user's stated intent conflicts with existing code patterns, dependencies, or architecture |
   | **Missing Key Decisions** | Critical decisions not yet made: error handling strategy, migration approach, backward compatibility, data validation rules |

2. **Ask at least 3 follow-up questions** — Present follow-up questions using AskQuestion (multiple-choice format) in a **single batch**, each targeting a specific divergence point identified above. Every question must:
   - Explicitly state which divergence it addresses.
   - Provide concrete options with clear trade-off descriptions.

3. **Update `prompt.md`** — After receiving all answers from Checkpoint 1 and Checkpoint 2, rewrite `prompt.md` with the refined content:

   ```markdown
   # Prompt

   - Branch: `{branch-name}`

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
   ### Checkpoint 1 Decisions
   - Q: {question} -> A: {answer} -> Decision: {what this means}

   ### Checkpoint 2 Decisions
   - Divergence: {what was ambiguous/conflicting} -> Resolution: {decision made}
   ```

4. **Update `status.json`** — Set `question_checkpoint` to `2`. Stage remains `refining`.

5. **Immediately proceed to Checkpoint 3.**

### Checkpoint 2 Checklist

- [ ] Analyze Checkpoint 1 answers for divergence points (3 rules)
- [ ] Ask at least 3 follow-up questions (AskQuestion, single batch)
- [ ] Receive answers
- [ ] Update `prompt.md` with refined requirements (all decisions from Checkpoint 1 + Checkpoint 2)
- [ ] Update `status.json`: set `question_checkpoint` to `2`
- [ ] Immediately proceed to Checkpoint 3 (do NOT stop here)

---

## Checkpoint 3: Proposal Transition (`question_checkpoint`: 2 -> 3)

**Gate check**: Read `status.json` — `question_checkpoint` must be `>= 2`. If `< 2`, go back to the missing checkpoint.

**Goal**: Ask the final proposal-shaping questions, then generate `proposal.md` as a product-level document and per-phase plan files (`phases/PH-{n}.md`) as self-contained technical specifications.

**Constraints**: Ask questions in the current conversation context first. After answers arrive, USE subagent to explore code. Compress prior context before proposal generation.

### Context Compression

Before starting proposal generation for Checkpoint 3, compress the earlier question context:

**Capability-based detection** (do whichever applies):
- If you have access to a conversation compaction tool (e.g., `compact` in Claude Code): use it to compress context, preserving only the updated `prompt.md` path and Checkpoint 3 goals.
- Otherwise (e.g., in Cursor): treat all prior conversation history as unavailable. Do NOT reference prior conversation content.

In **both** cases:
- Read `prompt.md` (updated after Checkpoint 2, and appended again after Checkpoint 3 answers if needed) as the authoritative input.
- Do NOT carry the full earlier conversation history.
- Proceed with proposal work using `prompt.md` as the single source of truth.

### Steps

1. **Ask at least 3 proposal-transition questions** — Use AskQuestion in a **single batch** to clarify final implementation-shaping choices before generating the proposal. Focus on:
   - phase boundaries,
   - architecture trade-offs,
   - rollout or compatibility posture,
   - testing expectations,
   - explicit non-goals.

2. **Update `prompt.md`** — Append the final answers under a `Checkpoint 3 Decisions` section so the proposal is generated from the full refined record.

3. **Read `prompt.md`** — This is your single source of truth for requirements.

4. **Explore code with subagent** — Launch subagent(s) to explore the codebase:
   - Use `explore` type subagents to investigate different code areas in parallel.
   - Areas to explore: source code structure, existing patterns, test infrastructure, dependencies, config.
   - Each subagent should return: key files found, patterns observed, potential impact areas, existing data structures and interfaces.

5. **Generate `proposal.md`** — A product-level document that serves as the authoritative specification. It defines WHAT to build and WHY, with module-level technical direction but NO specific file paths.

   ```markdown
   # Proposal: {title}

   ## Goal
   <!-- What this change achieves, in 2-3 sentences -->

   ## Background
   <!-- Current state of the system and why the change is needed -->

   ## User Stories
   <!-- Concrete user scenarios that this change enables -->
   <!-- Format: As a {role}, I want {action}, so that {benefit} -->

   ## Technical Approach
   <!-- Architecture and module-level design decisions -->
   <!-- Reference module names and key interface designs -->
   <!-- e.g., "AuthService should expose login(credentials) and logout(sessionId)" -->
   <!-- Do NOT include specific file paths -->

   ## Boundary Definition
   ### In Scope (MUST)
   - MUST: {requirement}

   ### Out of Scope (MUST NOT)
   - MUST NOT: {constraint}

   ### Optional (MAY)
   - MAY: {nice-to-have}

   ## Risks
   <!-- What could go wrong and mitigation strategies -->

   ## Phase Overview
   <!-- Each phase has ONLY a title and one-sentence description -->
   <!-- Detailed technical specs live in phases/PH-{n}.md -->
   | Phase | Title | Description |
   |-------|-------|-------------|
   | PH-1 | {title} | {one sentence} |
   | PH-2 | {title} | {one sentence} |
   ```

   **Proposal writing rules:**
   - NO file paths anywhere in the document.
   - Module names and interface signatures are allowed (e.g., `EventBus.emit(event)`, `AuthService.login`).
   - Boundary definitions use MUST/MUST NOT/MAY keywords explicitly.
   - Phase Overview contains only titles and one-line summaries — all technical detail goes into phase plan files.

6. **Generate per-phase plan files** — Create `phases/PH-{n}.md` for each phase. Each phase plan is a **self-contained technical specification** that contains everything needed to execute the phase without referencing other phase plans. Do not add estimated line counts to phase plans.

   ```markdown
   # PH-{n}: {Phase Title}

   ## Context Summary
   <!-- For PH-1: summarize the proposal's goal and technical approach -->
   <!-- For PH-2+: summarize completed phases from status.json summaries -->
   <!-- This section makes the phase plan self-contained -->

   ## Files to Modify
   <!-- Every file that will be created, modified, or read in this phase -->
   | File | Action | Purpose |
   |------|--------|---------|
   | {path} | CREATE/MODIFY/READ | {why} |

   ## Data Structure Design
   <!-- New or modified data structures, types, interfaces -->
   <!-- Use language-appropriate pseudo-code or type definitions -->

   ## State Transitions
   <!-- How system state changes during this phase -->
   <!-- Use state machine notation or transition tables when applicable -->

   ## Sub-tasks
   - [ ] {n}.1 {specific task description}
   - [ ] {n}.2 {specific task description}
   <!-- Each sub-task should be small enough for one TDD cycle -->

   ## Test Cases
   <!-- Test scenarios with pseudo-code skeletons -->
   <!-- Include test name and input/output pairs, NOT full implementation -->
   | Test Name | Input | Expected Output |
   |-----------|-------|-----------------|
   | {descriptive name} | {input data} | {expected result} |

   ### Test Pseudo-code
   <!-- Skeleton structure for key tests -->
   test('{descriptive name}', () => {
     // given: {setup}
     // when: {action}
     // then: {assertion}
   });

   ## Edge Cases
   <!-- Boundary conditions and unusual inputs to handle -->
   - {edge case description} -> {expected behavior}

   ## No-Touch List
   <!-- Files, modules, and interfaces that MUST NOT be modified in this phase -->
   <!-- Prevents unintended side effects -->
   | Item | Reason |
   |------|--------|
   | {file/module/interface} | {why it must not be touched} |

   ## TDD Approach
   <!-- For each sub-task: what test to write first, what behavior to verify -->
   | Sub-task | RED: Test to Write First | GREEN: Minimal Implementation |
   |----------|--------------------------|------------------------------|
   | {n}.1 | {test description} | {implementation approach} |

   ## Required Skills
   <!-- Harness-task skills to invoke during this phase -->
   - `harness-task:tdd` — for each sub-task
   - `harness-task:phase-review` — after all sub-tasks complete
   ```

   **Phase plan writing rules:**
   - Each phase plan MUST be self-contained: a developer should be able to execute it without reading other phase plans.
   - Context Summary bridges the gap: PH-1 summarizes the proposal; PH-2+ summarizes prior phase summaries from `status.json`.
   - Sub-tasks must be small enough for a single TDD cycle (RED-GREEN-REFACTOR).
   - Test Cases provide pseudo-code skeletons (test name + input/output pairs), not full implementations.
   - No-Touch List explicitly names files/modules/interfaces that must not be modified in this phase.
   - Order phases by dependency: foundational work first.

7. **Update `status.json`** — Set `question_checkpoint` to `3`, set stage to `proposing`, populate the phases array, and set `current_phase` to the first phase ID.

8. **Wait for user confirmation** — Present the proposal summary and ask the user to confirm before proceeding. Only after confirmation, set stage to `executing`.

### Checkpoint 3 Checklist

- [ ] Ask at least 3 proposal-transition questions
- [ ] Update `prompt.md` with Checkpoint 3 decisions
- [ ] Compress prior context
- [ ] Read `prompt.md` (single source of truth)
- [ ] Launch subagent(s) to explore codebase
- [ ] Generate `proposal.md` (product-level, no file paths, MUST/MUST NOT/MAY boundaries)
- [ ] Generate `phases/PH-{n}.md` plan files (self-contained, no estimated line counts)
- [ ] Update `status.json`: set `question_checkpoint` to `3`, set stage to `proposing`, populate phases array
- [ ] Present summary to user
- [ ] Receive user confirmation
- [ ] Update `status.json` stage to `executing`

---

## Resume Behavior

When resuming a conversation that was interrupted during `refining`, check `question_checkpoint` in `status.json`:

| `question_checkpoint` | Resume from |
|-----------------------|-------------|
| `0` or undefined | Checkpoint 1 — read code + prompt, ask prompt-input questions |
| `1` | Checkpoint 2 — analyze Checkpoint 1 answers, ask follow-up questions |
| `2` | Checkpoint 3 — ask proposal-transition questions, then generate proposal + phase plans |
| `3` | All checkpoints complete — proceed to `proposing` stage (user confirmation) |

**Note**: When resuming from Checkpoint 2 or 3, re-read `prompt.md` as the source of truth. Prior conversation history is unavailable.

# Harness Task

A team-oriented AI development workflow plugin for Cursor, Claude Code, and similar AI IDEs.

It is not trying to be just another stronger personal skill. It is a framework for teams that need AI coding to be traceable, recoverable, collaborative, and maintainable over time.

## Why This Exists

Most AI IDE tools today, including `skill`, `rule`, and `spec` systems, are designed around individuals or single projects. That works well for personal productivity, but it breaks down in larger team environments where multiple developers are shipping into the same codebase over time.

There are three common problems:

1. Teams lack a shared AI coding standard. One person uses a design skill, another uses open spec, someone else uses super power. All of them may produce working code, but the process, analysis depth, quality bar, and boundary control vary too much.
2. Vibe coding creates review imbalance. Generating thousands of lines is easy, but reviewing them is expensive. Reviewers often have no visibility into how the code was scoped, designed, or validated.
3. Shared base skills are hard to maintain. A team may want a common evolving foundation, but in practice people overwrite each other, and knowledge never stabilizes into a reusable team asset.

`dev-task` was built to solve exactly these three issues.

## Core Ideas

- **State-machine driven workflow**: every step is recorded, so work can be resumed, rolled back, regenerated, or inspected without losing the process.
- **Convention over configuration**: `/alles-dev <branch>` enforces one branch for one change, and all artifacts are written into `.dev-changes/{branch}`.
- **Sub-agents handle analysis and guardrails**: code analysis, clarification, proposal generation, code review, and state management are delegated to fixed-purpose agents to reduce variation between users.
- **Project-friendly and team-friendly**: projects can define shared main-agent and sub-agent behavior while still allowing personal skill differences where appropriate.
- **Minimal built-ins**: the framework only ships the smallest necessary skill set, so it stays easy to adopt while still producing stable, explainable results even without heavy customization.

## Workflow

```
init → prompting → refining → proposing → executing → verifying
```

| Stage | Description |
|-------|-------------|
| **init** | Create or switch to the target branch, then initialize `.dev-changes/{branch}`, `prompt.md`, and `status.json` |
| **prompting** | The user writes `prompt.md`, optionally supported by PRDs, technical docs, screenshots, or other source material |
| **refining** | Four question checkpoints (three first-principles requirement categories driven by analysis-agent + one proposal-transition checkpoint by proposal-agent) progressively clarify scope, fill gaps, and validate the real execution boundary |
| **proposing** | Deep code reading produces `proposal.md` and `phases/PH-*.md`, then waits for confirmation |
| **executing** | The main agent implements phase by phase, invoking team skills / base skills, reviewing each phase, and compressing context between phases |
| **verifying** | Final validation confirms the result, delivery boundary, and readiness for archive or bugfix |

## How It Solves Team Problems

### 1. A shared AI coding standard

`dev-task` does not force everyone to use the same personal skill. Instead, it standardizes the parts that actually need to be consistent:

- how a task starts
- how boundaries are defined
- how requirements are clarified
- how proposals are generated
- how work is split into phases
- how implementation and review are performed
- how state is recorded and resumed

That allows individuals to keep their own habits while still working inside one structured delivery pipeline.

### 2. Lower review cost for large-scale vibe coding

The real problem with large AI-generated diffs is usually not the number of lines. It is the lack of process context. `dev-task` restores that context by making the workflow explicit:

- every change starts in `prompt.md` instead of jumping straight into code
- every task goes through multiple clarification rounds instead of one-shot execution
- every implementation starts from `proposal.md` and explicit phase plans
- every phase has its own state, summary, and traceable history
- every implementation step is checked by a dedicated review agent

This means reviewers do not just see "a few thousand new lines." They can inspect a complete decision trail.

### 3. A stable foundation for shared team capabilities

The biggest failure mode of shared AI tooling is accidental overwrite. `dev-task` separates flow control from capability extension:

- the workflow stays stable through commands and state transitions
- team capability evolves through project-level skill and rule injection
- personal capability remains local and does not directly break the team framework

That makes it possible to maintain a shared base skill without letting individual usage patterns derail the process.

## Full Process

### 1. `/alles-dev <branch>`

This starts a new development change or resumes an existing one.

The command first runs the startup hook, which:

- resolves the effective branch name
- switches to that branch, or creates it from the base branch
- creates `.dev-changes/{branch}/`
- creates `prompt.md`
- creates `status.json`

After that, the workflow enters prompt capture. The user can write requirements directly or supplement them with PRDs, technical docs, and similar materials.

### 2. First prompt refinement

A sub-agent performs a fast read of the codebase and uses the initial prompt to do two things:

- verify whether the requested scope is actually executable
- ask questions about unclear wording, missing constraints, and risky ambiguity

The goal here is not to produce a solution yet. The goal is to make the requirement precise.

### 3. Second prompt refinement

Another sub-agent round continues from the first answers, asking follow-up questions and converting vague intent into executable constraints, while continuously updating `prompt.md`.

This stage is mainly about reducing "I assumed you meant X" mistakes.

### 4. Proposal generation

A deeper sub-agent pass reads the code again, this time focusing on:

- the true module boundaries that need to change
- the right design patterns to apply
- what should be included and what should explicitly stay out of scope
- how the work should be split into execution phases

It then generates:

- `proposal.md`
- `phases/PH-*.md`

By the time coding begins, the requirement, boundaries, execution path, and phase split have already been written down.

### 5. Main-agent implementation by phase

Actual coding is done by the main agent, not by continuing to chain sub-agents. The practical reason is that many AI IDE sub-agent systems cannot recursively orchestrate more sub-agents.

Inside each phase, the main agent will:

- read the current phase plan
- invoke base skills and team skills as needed
- implement and validate the phase
- call a code review agent after implementation
- clear or compress context to keep context usage within a safe range

This keeps implementation power while avoiding long-context drift.

### 6. `/alles-bugfix`

When a problem is discovered during execution or verification, this command enters the bugfix workflow.

It will:

- identify the phase most likely responsible for the issue
- move the state machine back to the correct point
- update the proposal and phase plans
- patch the downstream code
- preserve overall functional correctness after the fix

So bugfixing becomes a controlled replay inside the workflow, not an ad hoc patch.

### 7. `/alles-archive`

Once the change is complete, archive it as a long-term project asset.

The archive can preserve:

- key design decisions
- bugfix history
- important implementation notes
- reusable lessons

The purpose is not just to clean up files. It is to turn one AI-assisted development cycle into team knowledge.

### 8. `/alles-details`

Aggregate archived changes from `.dev-changes/archive/` and generate `project-details/NOTES.md`.

It captures:

- key design decisions
- known caveats and limitations
- notes useful for future work
- change history summaries ordered newest first

The purpose is not to duplicate each archive, but to distill them into project-level notes the team can keep reusing.

## Commands

| Command | Description |
|---------|-------------|
| `/alles-dev [branch]` | Start or resume a development change |
| `/alles-bugfix` | Enter the bugfix workflow during `executing` or `verifying` |
| `/alles-list-changes` | View all changes and their status |
| `/alles-archive` | Archive a completed change |
| `/alles-details` | Generate `project-details/NOTES.md` from archived changes |
| `/review [branch]` | Run a structured code review for a change |

## Task Directory Structure

```
.dev-changes/{branch-name}/
  prompt.md              # User requirements, refined through multiple question rounds
  proposal.md            # Product-level proposal: what, why, and scope boundaries
  status.json            # Current stage, question_checkpoint, phase progress, summaries
  phases/
    PH-1.md              # Phase 1 plan
    PH-2.md              # Phase 2 plan
```

## Key Mechanisms

### Four question checkpoints

The workflow does not jump directly from prompt to proposal. The `refining` stage must pass through four checkpoints, the first three of which are driven by `analysis-agent` (one per question category, with unbounded multi-round Q&A inside each category) and the last by `proposal-agent`:

1. **Category 1 — Overall framing**: new vs. modify, reuse points, sub-project decomposition, history compatibility.
2. **Category 2 — Feature breakdown + code boundaries**: feature-point list, per-feature module/file-level boundaries.
3. **Category 3 — Coherence + open design**: cross-feature coupling, industry-standard alternatives, residual open questions; `prompt.md` is rewritten with a `Feature Breakdown` section.
4. **Proposal transition**: code-first gap analysis followed by `proposal.md` and per-phase plans.

Each round asks 3–5 questions; rounds within a category are unbounded — the agent keeps asking until the category's closure criteria pass.

### Resume from interruption

All meaningful state is written into `status.json`. Whether the interruption comes from the IDE, context loss, or a manual pause, the workflow can resume from the last known state.

### Phase-based execution

Work is not generated in one giant pass. It is split into phases, each with its own plan, execution, and summary, which is much easier to manage in large tasks and team environments.

### Context compression

After each phase, context is cleared or compressed so that only the necessary proposal and summaries are retained. This reduces long-context drift.

### Project-level configuration

Projects can inject team-wide constraints through shared configuration instead of relying on every developer to manually keep local rules aligned.

## Configuration

Create `.harness-task/config.yaml` in your project root:

```yaml
# Build and test commands
build_command: npm run build
test_command: npm test

# Base branch for new feature branches
base_branch: main
```

You can also create `.harness-task/context.md` to inject project-level context such as architectural constraints, coding standards, delivery boundaries, and team conventions.

## Commit Format

```
{type}({scope}): description [{branch-name}]
```

Examples:

- `feat(auth): add login endpoint [feature/auth]`
- `test(auth): add unit tests for login [feature/auth]`
- `fix(api): handle null response [fix/null-response]`

## Who This Is For

- teams that want to turn AI coding from a personal trick into a team workflow
- projects that want to reduce the review and maintenance cost of vibe coding
- organizations that want one complete chain from skill and rule to review, bugfix, and archive
- engineering teams that want shared delivery standards without eliminating individual flexibility

## License

MIT

## MODIFIED Requirements

### Requirement: Planning workflow SHALL use a single outlining stage

The workflow SHALL remove the standalone `proposing` stage. After prompt capture, the assistant SHALL perform requirement discussion, planning, delta spec generation, and phase planning within `outlining`.

#### Scenario: entering planning

- **GIVEN** a user starts `/alles-dev`
- **WHEN** prompt capture is complete
- **THEN** the change enters `outlining`
- **AND** no intermediate `proposing` stage is used

#### Scenario: stage progression

- **GIVEN** a planning confirmation is accepted
- **WHEN** the assistant advances the change
- **THEN** the next stage is `executing`
- **AND** the valid workflow sequence is `outlining -> executing -> verifying -> done`

### Requirement: Planning artifacts SHALL be consolidated into proposal.md

`proposal.md` SHALL be the only top-level planning document. It SHALL include both requirement/proposal content and the high-level phase outline. The workflow SHALL NOT require `outline.md`.

#### Scenario: planning output

- **GIVEN** the assistant finishes planning
- **WHEN** it writes planning artifacts
- **THEN** it writes `proposal.md`, delta specs, and per-phase plan files
- **AND** it does not require a separate `outline.md`

### Requirement: Workflow startup SHALL prepare the branch immediately

When `/alles-dev` starts, it SHALL create or switch to the target branch immediately in default mode instead of deferring branch creation until planning confirmation.

#### Scenario: explicit branch startup

- **GIVEN** the user runs `/alles-dev feature/login-flow`
- **WHEN** the workflow starts in default mode
- **THEN** the assistant creates or switches to `feature/login-flow` before planning begins

### Requirement: Planning confirmation SHALL occur once

The user SHALL confirm the planning package once after the assistant has produced the merged `proposal.md`, delta specs, and per-phase plans.

#### Scenario: confirming planning

- **GIVEN** the assistant has produced the planning package
- **WHEN** the user confirms it
- **THEN** the workflow advances directly to `executing`

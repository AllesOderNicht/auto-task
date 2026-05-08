export type Stage =
  | 'init'
  | 'prompting'
  | 'refining'
  | 'proposing'
  | 'executing'
  | 'verifying';

export const STAGE_ORDER: Stage[] = [
  'init',
  'prompting',
  'refining',
  'proposing',
  'executing',
  'verifying',
];

export type PhaseStatus = 'pending' | 'in_progress' | 'completed';

export interface PhaseProgress {
  id: string;
  title: string;
  status: PhaseStatus;
  summary?: string;
  review_score?: number;
  review_round?: number;
}

/**
 * Question category within the `refining` stage.
 *
 * The analysis-agent organizes its multi-round Q&A around three sequential
 * categories (see `agents/analysis-agent.md`):
 *   1 = Overall requirement framing (new/modify, reuse points, sub-project
 *       decomposition, history compatibility)
 *   2 = Feature breakdown + per-feature code modification boundaries
 *   3 = Cross-feature coherence + open-ended design exploration
 *
 * Each category is closed by exactly one `question_checkpoint` advance, but
 * the agent may run any number of rounds within a category before closing it.
 */
export type QuestionCategory = 1 | 2 | 3;

/**
 * Soft-budget log entry for code-reading inside a single question round.
 *
 * The analysis-agent's tool budget is no longer a hard cap; instead it is a
 * soft guideline of ~5 code-reading calls per round. Rounds that exceed the
 * guideline append an entry here with `over_budget: true` so the orchestrator
 * and downstream review can audit reading patterns without aborting the run.
 */
export interface CodeReadLogEntry {
  category: QuestionCategory;
  round: number;
  count: number;
  over_budget: boolean;
  at: string;
}

/**
 * Maximum number of `CodeReadLogEntry` rows kept inline in `status.json`.
 *
 * Older entries are dropped from the head when the log would exceed this cap;
 * the cap exists purely to keep `status.json` from unbounded growth on
 * pathological multi-round sessions. See `appendCodeReadLog`.
 */
export const CODE_READS_LOG_MAX = 50;

/**
 * Number of most-recent entries kept after truncation triggers.
 */
export const CODE_READS_LOG_KEEP = 20;

export interface ChangeStatus {
  branch: string;
  change_dir: string;
  stage: Stage;
  created_at: string;
  updated_at: string;
  current_phase: string | null;
  phases: PhaseProgress[];
  question_checkpoint?: number;
  /**
   * Which question category the analysis-agent is currently driving.
   * Cleared when the category is closed via `advanceQuestionCheckpoint`.
   */
  current_question_category?: QuestionCategory;
  /**
   * 1-based round counter inside `current_question_category`.
   * Cleared when the category is closed.
   */
  round_in_category?: number;
  /**
   * Append-only soft-budget audit log; capped per `CODE_READS_LOG_MAX` /
   * `CODE_READS_LOG_KEEP`.
   */
  code_reads_log?: CodeReadLogEntry[];
}

type LegacyBrainstormingStatus = {
  brainstorming_round?: number;
};

type StatusWithLegacyCheckpoint = ChangeStatus & LegacyBrainstormingStatus;

function stripLegacyBrainstormingRound(status: StatusWithLegacyCheckpoint): ChangeStatus {
  const { brainstorming_round: _legacyBrainstormingRound, ...cleanStatus } = status;
  return cleanStatus;
}

function getQuestionCheckpoint(status: StatusWithLegacyCheckpoint): number {
  return status.question_checkpoint ?? status.brainstorming_round ?? 0;
}

export function createInitialStatus(branchName: string, changeDir: string): ChangeStatus {
  return {
    branch: branchName,
    change_dir: changeDir,
    stage: 'init',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    current_phase: null,
    phases: [],
  };
}

export function updateStage(status: ChangeStatus, newStage: Stage): ChangeStatus {
  if (status.stage === 'refining' && newStage === 'proposing') {
    const questionCheckpoint = getQuestionCheckpoint(status);
    if (!hasCompletedQuestionCheckpoints(status)) {
      throw new Error(
        `Cannot advance from refining to proposing: question_checkpoint is ${questionCheckpoint}, must be ${QUESTION_CHECKPOINT_TOTAL}`,
      );
    }
  }
  const cleanStatus = stripLegacyBrainstormingRound(status);
  return {
    ...cleanStatus,
    stage: newStage,
    updated_at: new Date().toISOString(),
  };
}

export function getNextStage(current: Stage): Stage | null {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx === -1 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

export function isComplete(status: ChangeStatus): boolean {
  return status.stage === 'verifying' &&
    status.phases.length > 0 &&
    status.phases.every(p => p.status === 'completed');
}

export function setPhases(status: ChangeStatus, phases: PhaseProgress[]): ChangeStatus {
  const cleanStatus = stripLegacyBrainstormingRound(status);
  return {
    ...cleanStatus,
    phases,
    current_phase: phases.length > 0 ? phases[0].id : null,
    updated_at: new Date().toISOString(),
  };
}

export function advancePhase(
  status: ChangeStatus,
  completedPhaseId: string,
  summary: string,
  reviewScore?: number,
  reviewRound?: number,
): ChangeStatus {
  const phases = status.phases.map(p => {
    if (p.id === completedPhaseId) {
      return {
        ...p,
        status: 'completed' as PhaseStatus,
        summary,
        ...(reviewScore !== undefined ? { review_score: reviewScore } : {}),
        ...(reviewRound !== undefined ? { review_round: reviewRound } : {}),
      };
    }
    return p;
  });

  const nextPending = phases.find(p => p.status === 'pending');
  if (nextPending) {
    nextPending.status = 'in_progress';
  }

  const cleanStatus = stripLegacyBrainstormingRound(status);
  return {
    ...cleanStatus,
    phases,
    current_phase: nextPending?.id ?? null,
    updated_at: new Date().toISOString(),
  };
}

export function startPhase(status: ChangeStatus, phaseId: string): ChangeStatus {
  const phases = status.phases.map(p => {
    if (p.id === phaseId) {
      return { ...p, status: 'in_progress' as PhaseStatus };
    }
    return p;
  });

  const cleanStatus = stripLegacyBrainstormingRound(status);
  return {
    ...cleanStatus,
    phases,
    current_phase: phaseId,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Record review score and round on a phase without changing its status.
 * Used during the review loop before the phase is marked completed.
 */
export function updatePhaseReview(
  status: ChangeStatus,
  phaseId: string,
  reviewScore: number,
  reviewRound: number,
): ChangeStatus {
  const phases = status.phases.map(p => {
    if (p.id === phaseId) {
      return { ...p, review_score: reviewScore, review_round: reviewRound };
    }
    return p;
  });

  const cleanStatus = stripLegacyBrainstormingRound(status);
  return {
    ...cleanStatus,
    phases,
    updated_at: new Date().toISOString(),
  };
}

export const QUESTION_CHECKPOINT_TOTAL = 4;

/**
 * Advance question progress by one checkpoint.
 *
 * The `refining` stage uses four sequential checkpoints:
 *   Checkpoint 1 = Category 1 closed by analysis-agent
 *                  (overall framing + reuse + sub-project decomposition).
 *   Checkpoint 2 = Category 2 closed by analysis-agent
 *                  (feature breakdown + per-feature code boundaries).
 *   Checkpoint 3 = Category 3 closed by analysis-agent
 *                  (coherence + open-ended design); `prompt.md` is rewritten
 *                  with the `Feature Breakdown` section here.
 *   Checkpoint 4 = proposal-agent finished (proposal.md + phases/PH-*.md);
 *                  stage advances to `proposing` after this.
 *
 * Stage remains `refining` until `updateStage(status, 'proposing')` is called
 * with all 4 checkpoints completed. This function also clears the per-category
 * scratch state (`current_question_category`, `round_in_category`) since each
 * checkpoint advance closes one category for analysis-agent (CP1–CP3).
 * `code_reads_log` is intentionally preserved across checkpoints for audit.
 */
export function advanceQuestionCheckpoint(status: ChangeStatus): ChangeStatus {
  const current = getQuestionCheckpoint(status);
  if (current >= QUESTION_CHECKPOINT_TOTAL) {
    return stripLegacyBrainstormingRound(status);
  }
  const cleanStatus = stripLegacyBrainstormingRound(status);
  const {
    current_question_category: _cat,
    round_in_category: _round,
    ...withoutCategoryScratch
  } = cleanStatus;
  return {
    ...withoutCategoryScratch,
    question_checkpoint: current + 1,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Check whether all 4 question checkpoints are complete,
 * which is required before stage can advance from `refining` to `proposing`.
 */
export function hasCompletedQuestionCheckpoints(status: ChangeStatus): boolean {
  return getQuestionCheckpoint(status) >= QUESTION_CHECKPOINT_TOTAL;
}

/**
 * Clear the per-category scratch state (`current_question_category`,
 * `round_in_category`) without changing the checkpoint counter.
 *
 * Used when the analysis-agent decides to abandon a partially-driven category
 * (e.g. the user requested a re-scope mid-round) without closing it.
 * `code_reads_log` is preserved.
 */
export function resetCategoryState(status: ChangeStatus): ChangeStatus {
  const cleanStatus = stripLegacyBrainstormingRound(status);
  const {
    current_question_category: _cat,
    round_in_category: _round,
    ...rest
  } = cleanStatus;
  return {
    ...rest,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Append a code-reading audit entry to `code_reads_log`, truncating to the
 * most recent `CODE_READS_LOG_KEEP` entries when the log would otherwise
 * exceed `CODE_READS_LOG_MAX`. Returns a new status object.
 */
export function appendCodeReadLog(
  status: ChangeStatus,
  entry: CodeReadLogEntry,
): ChangeStatus {
  const cleanStatus = stripLegacyBrainstormingRound(status);
  const existing = cleanStatus.code_reads_log ?? [];
  const next = [...existing, entry];
  const trimmed =
    next.length > CODE_READS_LOG_MAX ? next.slice(-CODE_READS_LOG_KEEP) : next;
  return {
    ...cleanStatus,
    code_reads_log: trimmed,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Reset progress back to a specific phase for bugfix re-execution.
 * The target phase becomes `in_progress` with its summary cleared.
 * All subsequent phases become `pending` with summaries cleared.
 * Earlier phases remain `completed` and untouched.
 */
export function resetToPhase(status: ChangeStatus, phaseId: string): ChangeStatus {
  let found = false;
  const phases = status.phases.map(p => {
    if (p.id === phaseId) {
      found = true;
      return { ...p, status: 'in_progress' as PhaseStatus, summary: undefined };
    }
    if (found) {
      return { ...p, status: 'pending' as PhaseStatus, summary: undefined };
    }
    return p;
  });

  const cleanStatus = stripLegacyBrainstormingRound(status);
  return {
    ...cleanStatus,
    stage: 'executing',
    phases,
    current_phase: phaseId,
    updated_at: new Date().toISOString(),
  };
}

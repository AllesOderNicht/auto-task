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

export interface ChangeStatus {
  branch: string;
  change_dir: string;
  stage: Stage;
  created_at: string;
  updated_at: string;
  current_phase: string | null;
  phases: PhaseProgress[];
  question_checkpoint?: number;
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

export const QUESTION_CHECKPOINT_TOTAL = 3;

/**
 * Advance question progress by one checkpoint.
 * Checkpoint 1 = questions asked after prompt input.
 * Checkpoint 2 = follow-up questions after the first checkpoint.
 * Checkpoint 3 = proposal-transition questions and planning completed.
 * Stage remains `refining` — only advances to `proposing` via updateStage
 * after all 3 checkpoints are complete.
 */
export function advanceQuestionCheckpoint(status: ChangeStatus): ChangeStatus {
  const current = getQuestionCheckpoint(status);
  if (current >= QUESTION_CHECKPOINT_TOTAL) {
    return stripLegacyBrainstormingRound(status);
  }
  const cleanStatus = stripLegacyBrainstormingRound(status);
  return {
    ...cleanStatus,
    question_checkpoint: current + 1,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Check whether all 3 question checkpoints are complete,
 * which is required before stage can advance from `refining` to `proposing`.
 */
export function hasCompletedQuestionCheckpoints(status: ChangeStatus): boolean {
  return getQuestionCheckpoint(status) >= QUESTION_CHECKPOINT_TOTAL;
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

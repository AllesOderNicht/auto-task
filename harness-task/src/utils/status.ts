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
  summary_file?: string;
}

export interface ChangeStatus {
  branch: string;
  change_dir: string;
  stage: Stage;
  created_at: string;
  updated_at: string;
  current_phase: string | null;
  phases: PhaseProgress[];
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
  return {
    ...status,
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
  return {
    ...status,
    phases,
    current_phase: phases.length > 0 ? phases[0].id : null,
    updated_at: new Date().toISOString(),
  };
}

export function advancePhase(status: ChangeStatus, completedPhaseId: string, summaryFile: string): ChangeStatus {
  const phases = status.phases.map(p => {
    if (p.id === completedPhaseId) {
      return { ...p, status: 'completed' as PhaseStatus, summary_file: summaryFile };
    }
    return p;
  });

  const nextPending = phases.find(p => p.status === 'pending');
  if (nextPending) {
    nextPending.status = 'in_progress';
  }

  return {
    ...status,
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

  return {
    ...status,
    phases,
    current_phase: phaseId,
    updated_at: new Date().toISOString(),
  };
}

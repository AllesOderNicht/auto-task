import { getChangeDirName } from './change.js';

export type Stage =
  | 'outlining'
  | 'executing'
  | 'verifying'
  | 'done';

export const STAGE_ORDER: Stage[] = [
  'outlining',
  'executing',
  'verifying',
  'done',
];

export interface MilestoneStatus {
  id: string;
  title: string;
  status: 'done' | 'current' | 'pending';
  total_todos: number;
  completed_todos: string[];
}

export interface ChangeStatus {
  change: string;
  change_dir: string;
  stage: Stage;
  branch: string;
  use_worktree: boolean;
  worktree_path: string | null;
  prompt_ready: boolean;
  current_milestone: string | null;
  total_milestones: number;
  milestones: MilestoneStatus[];
  created_at: string;
  updated_at: string;
}

export interface CreateInitialStatusOptions {
  useWorktree?: boolean;
  worktreePath?: string | null;
  promptReady?: boolean;
}

export function createInitialStatus(
  branchName: string,
  options: CreateInitialStatusOptions = {}
): ChangeStatus {
  return {
    change: branchName,
    change_dir: getChangeDirName(branchName),
    stage: 'outlining',
    branch: branchName,
    use_worktree: options.useWorktree ?? false,
    worktree_path: options.worktreePath ?? null,
    prompt_ready: options.promptReady ?? false,
    current_milestone: null,
    total_milestones: 0,
    milestones: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function updateStage(status: ChangeStatus, newStage: Stage): ChangeStatus {
  return {
    ...status,
    stage: newStage,
    updated_at: new Date().toISOString(),
  };
}

export function updateMilestoneProgress(
  status: ChangeStatus,
  milestoneId: string,
  completedTodo: string
): ChangeStatus {
  const milestones = status.milestones.map(ms => {
    if (ms.id === milestoneId) {
      const completed = [...ms.completed_todos, completedTodo];
      return {
        ...ms,
        completed_todos: completed,
        status: (completed.length >= ms.total_todos ? 'done' : 'current') as MilestoneStatus['status'],
      };
    }
    return ms;
  });

  // Find next milestone if current is done
  const currentMs = milestones.find(ms => ms.id === milestoneId);
  let currentMilestone = status.current_milestone;

  if (currentMs && currentMs.status === 'done') {
    const nextPending = milestones.find(ms => ms.status === 'pending');
    if (nextPending) {
      nextPending.status = 'current';
      currentMilestone = nextPending.id;
    }
  }

  return {
    ...status,
    milestones,
    current_milestone: currentMilestone,
    updated_at: new Date().toISOString(),
  };
}

export function isStageComplete(status: ChangeStatus): boolean {
  return status.stage === 'done';
}

export function getNextStage(current: Stage): Stage | null {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx === -1 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

export type Stage = 'outlining' | 'executing' | 'verifying' | 'done';
export declare const STAGE_ORDER: Stage[];
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
export declare function createInitialStatus(branchName: string, options?: CreateInitialStatusOptions): ChangeStatus;
export declare function updateStage(status: ChangeStatus, newStage: Stage): ChangeStatus;
export declare function updateMilestoneProgress(status: ChangeStatus, milestoneId: string, completedTodo: string): ChangeStatus;
export declare function isStageComplete(status: ChangeStatus): boolean;
export declare function getNextStage(current: Stage): Stage | null;
//# sourceMappingURL=status.d.ts.map
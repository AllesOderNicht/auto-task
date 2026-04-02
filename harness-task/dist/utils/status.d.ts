export type Stage = 'init' | 'prompting' | 'refining' | 'proposing' | 'executing' | 'verifying';
export declare const STAGE_ORDER: Stage[];
export type PhaseStatus = 'pending' | 'in_progress' | 'completed';
export interface PhaseProgress {
    id: string;
    title: string;
    status: PhaseStatus;
    summary?: string;
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
export declare function createInitialStatus(branchName: string, changeDir: string): ChangeStatus;
export declare function updateStage(status: ChangeStatus, newStage: Stage): ChangeStatus;
export declare function getNextStage(current: Stage): Stage | null;
export declare function isComplete(status: ChangeStatus): boolean;
export declare function setPhases(status: ChangeStatus, phases: PhaseProgress[]): ChangeStatus;
export declare function advancePhase(status: ChangeStatus, completedPhaseId: string, summary: string): ChangeStatus;
export declare function startPhase(status: ChangeStatus, phaseId: string): ChangeStatus;
/**
 * Reset progress back to a specific phase for bugfix re-execution.
 * The target phase becomes `in_progress` with its summary cleared.
 * All subsequent phases become `pending` with summaries cleared.
 * Earlier phases remain `completed` and untouched.
 */
export declare function resetToPhase(status: ChangeStatus, phaseId: string): ChangeStatus;
//# sourceMappingURL=status.d.ts.map
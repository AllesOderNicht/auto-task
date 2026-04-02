import { getChangeDirName } from './change.js';
export const STAGE_ORDER = [
    'outlining',
    'executing',
    'verifying',
    'done',
];
export function createInitialStatus(branchName, options = {}) {
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
export function updateStage(status, newStage) {
    return {
        ...status,
        stage: newStage,
        updated_at: new Date().toISOString(),
    };
}
export function updateMilestoneProgress(status, milestoneId, completedTodo) {
    const milestones = status.milestones.map(ms => {
        if (ms.id === milestoneId) {
            const completed = [...ms.completed_todos, completedTodo];
            return {
                ...ms,
                completed_todos: completed,
                status: (completed.length >= ms.total_todos ? 'done' : 'current'),
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
export function isStageComplete(status) {
    return status.stage === 'done';
}
export function getNextStage(current) {
    const idx = STAGE_ORDER.indexOf(current);
    if (idx === -1 || idx >= STAGE_ORDER.length - 1)
        return null;
    return STAGE_ORDER[idx + 1];
}
//# sourceMappingURL=status.js.map
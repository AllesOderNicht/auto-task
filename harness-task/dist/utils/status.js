export const STAGE_ORDER = [
    'init',
    'prompting',
    'refining',
    'proposing',
    'executing',
    'verifying',
];
export function createInitialStatus(branchName, changeDir) {
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
export function updateStage(status, newStage) {
    return {
        ...status,
        stage: newStage,
        updated_at: new Date().toISOString(),
    };
}
export function getNextStage(current) {
    const idx = STAGE_ORDER.indexOf(current);
    if (idx === -1 || idx >= STAGE_ORDER.length - 1)
        return null;
    return STAGE_ORDER[idx + 1];
}
export function isComplete(status) {
    return status.stage === 'verifying' &&
        status.phases.length > 0 &&
        status.phases.every(p => p.status === 'completed');
}
export function setPhases(status, phases) {
    return {
        ...status,
        phases,
        current_phase: phases.length > 0 ? phases[0].id : null,
        updated_at: new Date().toISOString(),
    };
}
export function advancePhase(status, completedPhaseId, summary) {
    const phases = status.phases.map(p => {
        if (p.id === completedPhaseId) {
            return { ...p, status: 'completed', summary };
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
export function startPhase(status, phaseId) {
    const phases = status.phases.map(p => {
        if (p.id === phaseId) {
            return { ...p, status: 'in_progress' };
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
/**
 * Reset progress back to a specific phase for bugfix re-execution.
 * The target phase becomes `in_progress` with its summary cleared.
 * All subsequent phases become `pending` with summaries cleared.
 * Earlier phases remain `completed` and untouched.
 */
export function resetToPhase(status, phaseId) {
    let found = false;
    const phases = status.phases.map(p => {
        if (p.id === phaseId) {
            found = true;
            return { ...p, status: 'in_progress', summary: undefined };
        }
        if (found) {
            return { ...p, status: 'pending', summary: undefined };
        }
        return p;
    });
    return {
        ...status,
        stage: 'executing',
        phases,
        current_phase: phaseId,
        updated_at: new Date().toISOString(),
    };
}
//# sourceMappingURL=status.js.map
import type { PhaseProgress } from './status.js';
export interface ParsedPhase {
    id: string;
    title: string;
    tasks: string[];
}
/**
 * Parse phases from tasks.md content.
 * Expected format:
 *   ## Phase 1: Title Here
 *   - [ ] 1.1 Task description
 *   - [ ] 1.2 Another task
 *   ## Phase 2: Another Title
 *   - [ ] 2.1 Task description
 */
export declare function parsePhases(tasksContent: string): ParsedPhase[];
export declare function toPhaseProgress(parsed: ParsedPhase[]): PhaseProgress[];
export interface PhaseContext {
    proposal: string | null;
    design: string | null;
    currentPhase: ParsedPhase | null;
    completedSummaries: {
        phaseId: string;
        content: string;
    }[];
}
export declare function formatPhaseSummary(phaseId: string, phaseTitle: string, fileChanges: {
    file: string;
    description: string;
}[]): string;
//# sourceMappingURL=phase.d.ts.map
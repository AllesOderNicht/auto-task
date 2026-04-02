/**
 * Simplified spec parser for harness-task.
 * Handles both full specs (Purpose + Requirements) and delta specs (ADDED/MODIFIED/REMOVED).
 */
export interface Requirement {
    name: string;
    text: string;
    scenarios: string[];
}
export interface Spec {
    name: string;
    purpose: string;
    requirements: Requirement[];
}
export interface DeltaSpec {
    added: Requirement[];
    modified: Requirement[];
    removed: string[];
}
export interface MergeResult {
    created: string[];
    updated: string[];
    removed: string[];
}
/**
 * Parse a full spec file (Purpose + Requirements sections).
 */
export declare function parseSpec(name: string, content: string): Spec;
/**
 * Parse a delta spec file (ADDED/MODIFIED/REMOVED Requirements sections).
 */
export declare function parseDeltaSpec(content: string): DeltaSpec;
/**
 * Apply a delta spec to an existing spec, returning the updated spec.
 */
export declare function applyDelta(spec: Spec, delta: DeltaSpec): Spec;
/**
 * Serialize a spec back to markdown format.
 */
export declare function serializeSpec(spec: Spec): string;
//# sourceMappingURL=spec-parser.d.ts.map
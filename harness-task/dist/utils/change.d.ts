export type Artifact = 'prompt' | 'proposal' | 'status';
export declare function getChangeDirName(branchName: string): string;
export declare function getChangeDirPath(projectDir: string, branchName: string): string;
export declare function getArtifactPath(changeDir: string, artifact: Artifact): string;
export declare function getPhasePlanPath(changeDir: string, phaseId: string): string;
export declare function getPhasesDir(changeDir: string): string;
export declare function createPromptTemplate(branchName: string): string;
export declare function createPhasePlanTemplate(phaseId: string, phaseTitle: string): string;
//# sourceMappingURL=change.d.ts.map
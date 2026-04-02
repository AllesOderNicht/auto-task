export declare function getBaseBranch(projectDir: string): string;
export declare function createFeatureBranch(projectDir: string, branchName: string): string;
export declare function createWorktree(projectDir: string, branchName: string): {
    worktreePath: string;
    branch: string;
};
export declare function removeWorktree(projectDir: string, worktreePath: string, branchName?: string): void;
export declare function deleteFeatureBranch(projectDir: string, branchName: string): void;
export declare function getCurrentBranch(projectDir: string): string;
//# sourceMappingURL=git.d.ts.map
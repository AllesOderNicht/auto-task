import { execSync } from 'node:child_process';
import { join, dirname, basename } from 'node:path';
import { getChangeDirName } from './change.js';
function exec(cmd, cwd) {
    return execSync(cmd, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}
export function getBaseBranch(projectDir) {
    try {
        const ref = exec('git symbolic-ref refs/remotes/origin/HEAD', projectDir);
        return ref.replace('refs/remotes/origin/', '');
    }
    catch {
        // Fallback: check if main or master exists
        try {
            exec('git rev-parse --verify main', projectDir);
            return 'main';
        }
        catch {
            try {
                exec('git rev-parse --verify master', projectDir);
                return 'master';
            }
            catch {
                return 'main';
            }
        }
    }
}
function branchExists(projectDir, branchName) {
    try {
        exec(`git rev-parse --verify "${branchName}"`, projectDir);
        return true;
    }
    catch {
        return false;
    }
}
export function createFeatureBranch(projectDir, branchName) {
    const baseBranch = getBaseBranch(projectDir);
    if (branchExists(projectDir, branchName)) {
        exec(`git checkout "${branchName}"`, projectDir);
    }
    else {
        exec(`git checkout -b "${branchName}" "${baseBranch}"`, projectDir);
    }
    return branchName;
}
export function createWorktree(projectDir, branchName) {
    const projectName = basename(projectDir);
    const parentDir = dirname(projectDir);
    const worktreeBase = join(parentDir, `${projectName}-worktrees`);
    const worktreePath = join(worktreeBase, getChangeDirName(branchName));
    const baseBranch = getBaseBranch(projectDir);
    if (branchExists(projectDir, branchName)) {
        exec(`git worktree add "${worktreePath}" "${branchName}"`, projectDir);
    }
    else {
        exec(`git worktree add -b "${branchName}" "${worktreePath}" "${baseBranch}"`, projectDir);
    }
    return { worktreePath, branch: branchName };
}
export function removeWorktree(projectDir, worktreePath, branchName) {
    try {
        exec(`git worktree remove "${worktreePath}" --force`, projectDir);
    }
    catch {
        // If worktree removal fails, try prune
        exec('git worktree prune', projectDir);
    }
    if (branchName) {
        try {
            exec(`git branch -d "${branchName}"`, projectDir);
        }
        catch {
            // Branch may not exist or may have unmerged changes
        }
    }
}
export function deleteFeatureBranch(projectDir, branchName) {
    try {
        // Ensure we're not on the branch we're trying to delete
        const currentBranch = exec('git branch --show-current', projectDir);
        if (currentBranch === branchName) {
            const baseBranch = getBaseBranch(projectDir);
            exec(`git checkout "${baseBranch}"`, projectDir);
        }
        exec(`git branch -d "${branchName}"`, projectDir);
    }
    catch {
        // Branch may have unmerged changes, don't force delete
    }
}
export function getCurrentBranch(projectDir) {
    return exec('git branch --show-current', projectDir);
}
//# sourceMappingURL=git.js.map
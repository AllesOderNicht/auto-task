import { execSync } from 'node:child_process';

function exec(cmd: string, cwd: string): string {
  return execSync(cmd, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

export function getBaseBranch(projectDir: string): string {
  try {
    const ref = exec('git symbolic-ref refs/remotes/origin/HEAD', projectDir);
    return ref.replace('refs/remotes/origin/', '');
  } catch {
    try {
      exec('git rev-parse --verify main', projectDir);
      return 'main';
    } catch {
      try {
        exec('git rev-parse --verify master', projectDir);
        return 'master';
      } catch {
        return 'main';
      }
    }
  }
}

export function getCurrentBranch(projectDir: string): string {
  return exec('git branch --show-current', projectDir);
}

function branchExists(projectDir: string, branchName: string): boolean {
  try {
    exec(`git rev-parse --verify "${branchName}"`, projectDir);
    return true;
  } catch {
    return false;
  }
}

export function createFeatureBranch(projectDir: string, branchName: string): string {
  const baseBranch = getBaseBranch(projectDir);

  if (branchExists(projectDir, branchName)) {
    exec(`git checkout "${branchName}"`, projectDir);
  } else {
    const currentBranch = getCurrentBranch(projectDir);

    if (currentBranch !== baseBranch) {
      exec(`git checkout "${baseBranch}"`, projectDir);
    }

    exec(`git checkout -b "${branchName}"`, projectDir);
  }

  return branchName;
}

export function deleteFeatureBranch(projectDir: string, branchName: string): void {
  try {
    const currentBranch = getCurrentBranch(projectDir);
    if (currentBranch === branchName) {
      const baseBranch = getBaseBranch(projectDir);
      exec(`git checkout "${baseBranch}"`, projectDir);
    }
    exec(`git branch -d "${branchName}"`, projectDir);
  } catch {
    // Branch may have unmerged changes
  }
}

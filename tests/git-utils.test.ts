import { beforeEach, describe, expect, it, vi } from 'vitest';

const { execSyncMock } = vi.hoisted(() => ({
  execSyncMock: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  execSync: execSyncMock,
}));

import { createFeatureBranch } from '../src/utils/git.js';

const projectDir = '/repo';
const execOptions = { cwd: projectDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] };

describe('createFeatureBranch', () => {
  beforeEach(() => {
    execSyncMock.mockReset();
  });

  it('creates a missing branch without inheriting the base branch upstream', () => {
    execSyncMock.mockImplementation((cmd: string) => {
      if (cmd === 'git symbolic-ref refs/remotes/origin/HEAD') {
        return 'refs/remotes/origin/main\n';
      }

      if (cmd === 'git rev-parse --verify "feature/test"') {
        throw new Error('missing branch');
      }

      if (cmd === 'git branch --show-current') {
        return 'main\n';
      }

      if (cmd === 'git checkout -b "feature/test"') {
        return 'Switched to a new branch\n';
      }

      throw new Error(`Unexpected command: ${cmd}`);
    });

    createFeatureBranch(projectDir, 'feature/test');

    expect(execSyncMock).toHaveBeenNthCalledWith(1, 'git symbolic-ref refs/remotes/origin/HEAD', execOptions);
    expect(execSyncMock).toHaveBeenNthCalledWith(2, 'git rev-parse --verify "feature/test"', execOptions);
    expect(execSyncMock).toHaveBeenNthCalledWith(3, 'git branch --show-current', execOptions);
    expect(execSyncMock).toHaveBeenNthCalledWith(4, 'git checkout -b "feature/test"', execOptions);
  });

  it('switches back to the base branch before creating a new branch when needed', () => {
    execSyncMock.mockImplementation((cmd: string) => {
      if (cmd === 'git symbolic-ref refs/remotes/origin/HEAD') {
        return 'refs/remotes/origin/main\n';
      }

      if (cmd === 'git rev-parse --verify "feature/test"') {
        throw new Error('missing branch');
      }

      if (cmd === 'git branch --show-current') {
        return 'feature/other\n';
      }

      if (cmd === 'git checkout "main"') {
        return 'Switched to branch main\n';
      }

      if (cmd === 'git checkout -b "feature/test"') {
        return 'Switched to a new branch\n';
      }

      throw new Error(`Unexpected command: ${cmd}`);
    });

    createFeatureBranch(projectDir, 'feature/test');

    expect(execSyncMock).toHaveBeenNthCalledWith(3, 'git branch --show-current', execOptions);
    expect(execSyncMock).toHaveBeenNthCalledWith(4, 'git checkout "main"', execOptions);
    expect(execSyncMock).toHaveBeenNthCalledWith(5, 'git checkout -b "feature/test"', execOptions);
  });
});

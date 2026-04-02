import { describe, expect, it } from 'vitest';

import { createPromptTemplate, getChangeDirName } from '../src/utils/change.js';
import { createInitialStatus, getNextStage, STAGE_ORDER } from '../src/utils/status.js';

describe('getChangeDirName', () => {
  it('replaces branch separators with double underscores', () => {
    expect(getChangeDirName('feature/login-flow')).toBe('feature__login-flow');
  });

  it('replaces unsafe filesystem characters', () => {
    expect(getChangeDirName('fix prompt:*?')).toBe('fix_prompt');
  });

  it('falls back to a default name when normalization is empty', () => {
    expect(getChangeDirName('///')).toBe('change');
  });
});

describe('createInitialStatus', () => {
  it('stores the original branch and the safe directory name', () => {
    const status = createInitialStatus('feature/login-flow', {
      useWorktree: true,
      worktreePath: '/tmp/worktree',
      promptReady: true,
    });

    expect(status.change).toBe('feature/login-flow');
    expect(status.change_dir).toBe('feature__login-flow');
    expect(status.branch).toBe('feature/login-flow');
    expect(status.use_worktree).toBe(true);
    expect(status.worktree_path).toBe('/tmp/worktree');
    expect(status.prompt_ready).toBe(true);
    expect(status.stage).toBe('outlining');
  });
});

describe('workflow stages', () => {
  it('uses outlining as the only planning stage', () => {
    expect(STAGE_ORDER).toEqual(['outlining', 'executing', 'verifying', 'done']);
  });

  it('advances directly from outlining to executing', () => {
    expect(getNextStage('outlining')).toBe('executing');
    expect(getNextStage('executing')).toBe('verifying');
    expect(getNextStage('verifying')).toBe('done');
    expect(getNextStage('done')).toBeNull();
  });
});

describe('createPromptTemplate', () => {
  it('includes the branch name and requirement placeholder', () => {
    const template = createPromptTemplate('feature/login-flow');

    expect(template).toContain('# Prompt');
    expect(template).toContain('- Branch: `feature/login-flow`');
    expect(template).toContain('## Requirement');
    expect(template).toContain('Fill this file manually');
  });
});

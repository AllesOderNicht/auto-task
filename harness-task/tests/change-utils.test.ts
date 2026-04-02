import { describe, expect, it } from 'vitest';

import {
  getChangeDirName,
  getArtifactPath,
  getPhaseSummaryPath,
  createPromptTemplate,
  createPhaseSummaryTemplate,
} from '../src/utils/change.js';

describe('getChangeDirName', () => {
  it('replaces branch separators with hyphens', () => {
    expect(getChangeDirName('feature/login-flow')).toBe('feature-login-flow');
  });

  it('replaces unsafe filesystem characters', () => {
    expect(getChangeDirName('fix prompt:*?')).toBe('fix_prompt');
  });

  it('falls back to a default name when normalization is empty', () => {
    expect(getChangeDirName('///')).toBe('change');
  });

  it('handles whitespace-only input', () => {
    expect(getChangeDirName('   ')).toBe('change');
  });

  it('handles complex branch names', () => {
    expect(getChangeDirName('feat/add-auth/v2')).toBe('feat-add-auth-v2');
  });
});

describe('getArtifactPath', () => {
  it('returns correct path for each artifact type', () => {
    const dir = '/project/.dev-changes/my-branch';
    expect(getArtifactPath(dir, 'prompt')).toBe(`${dir}/prompt.md`);
    expect(getArtifactPath(dir, 'refined-prompt')).toBe(`${dir}/refined-prompt.md`);
    expect(getArtifactPath(dir, 'proposal')).toBe(`${dir}/proposal.md`);
    expect(getArtifactPath(dir, 'design')).toBe(`${dir}/design.md`);
    expect(getArtifactPath(dir, 'tasks')).toBe(`${dir}/tasks.md`);
    expect(getArtifactPath(dir, 'status')).toBe(`${dir}/status.json`);
  });
});

describe('getPhaseSummaryPath', () => {
  it('returns path under phases/ directory', () => {
    const dir = '/project/.dev-changes/my-branch';
    expect(getPhaseSummaryPath(dir, 'PH-1')).toBe(`${dir}/phases/PH-1-summary.md`);
    expect(getPhaseSummaryPath(dir, 'PH-3')).toBe(`${dir}/phases/PH-3-summary.md`);
  });
});

describe('createPromptTemplate', () => {
  it('includes branch name and requirement section', () => {
    const template = createPromptTemplate('feature/login-flow');
    expect(template).toContain('# Prompt');
    expect(template).toContain('- Branch: `feature/login-flow`');
    expect(template).toContain('## Requirement');
  });
});

describe('createPhaseSummaryTemplate', () => {
  it('generates a summary template with phase title', () => {
    const template = createPhaseSummaryTemplate('PH-1', 'Setup project structure');
    expect(template).toContain('# PH-1: Setup project structure');
    expect(template).toContain('## Files Changed');
    expect(template).toContain('| File | Change |');
  });
});

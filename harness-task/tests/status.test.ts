import { describe, expect, it } from 'vitest';

import {
  STAGE_ORDER,
  createInitialStatus,
  updateStage,
  getNextStage,
  isComplete,
  setPhases,
  advancePhase,
  startPhase,
} from '../src/utils/status.js';

describe('STAGE_ORDER', () => {
  it('defines the 6-stage workflow', () => {
    expect(STAGE_ORDER).toEqual([
      'init',
      'prompting',
      'refining',
      'proposing',
      'executing',
      'verifying',
    ]);
  });
});

describe('createInitialStatus', () => {
  it('creates status with init stage and empty phases', () => {
    const status = createInitialStatus('feature/auth', 'feature-auth');
    expect(status.branch).toBe('feature/auth');
    expect(status.change_dir).toBe('feature-auth');
    expect(status.stage).toBe('init');
    expect(status.phases).toEqual([]);
    expect(status.current_phase).toBeNull();
    expect(status.created_at).toBeTruthy();
    expect(status.updated_at).toBeTruthy();
  });
});

describe('updateStage', () => {
  it('advances to a new stage', () => {
    const status = createInitialStatus('feat/x', 'feat-x');
    const updated = updateStage(status, 'refining');
    expect(updated.stage).toBe('refining');
    expect(updated.branch).toBe('feat/x');
  });
});

describe('getNextStage', () => {
  it('advances through all stages in order', () => {
    expect(getNextStage('init')).toBe('prompting');
    expect(getNextStage('prompting')).toBe('refining');
    expect(getNextStage('refining')).toBe('proposing');
    expect(getNextStage('proposing')).toBe('executing');
    expect(getNextStage('executing')).toBe('verifying');
    expect(getNextStage('verifying')).toBeNull();
  });
});

describe('isComplete', () => {
  it('returns false when not in verifying stage', () => {
    const status = createInitialStatus('b', 'd');
    expect(isComplete(status)).toBe(false);
  });

  it('returns false when in verifying but phases not all completed', () => {
    let status = createInitialStatus('b', 'd');
    status = updateStage(status, 'verifying');
    status = setPhases(status, [
      { id: 'PH-1', title: 'Setup', status: 'completed' },
      { id: 'PH-2', title: 'Core', status: 'in_progress' },
    ]);
    expect(isComplete(status)).toBe(false);
  });

  it('returns true when verifying and all phases completed', () => {
    let status = createInitialStatus('b', 'd');
    status = updateStage(status, 'verifying');
    status = setPhases(status, [
      { id: 'PH-1', title: 'Setup', status: 'completed', summary_file: 'phases/PH-1-summary.md' },
      { id: 'PH-2', title: 'Core', status: 'completed', summary_file: 'phases/PH-2-summary.md' },
    ]);
    expect(isComplete(status)).toBe(true);
  });
});

describe('setPhases', () => {
  it('sets phases and picks first as current', () => {
    const status = createInitialStatus('b', 'd');
    const updated = setPhases(status, [
      { id: 'PH-1', title: 'A', status: 'pending' },
      { id: 'PH-2', title: 'B', status: 'pending' },
    ]);
    expect(updated.phases).toHaveLength(2);
    expect(updated.current_phase).toBe('PH-1');
  });

  it('handles empty phases', () => {
    const status = createInitialStatus('b', 'd');
    const updated = setPhases(status, []);
    expect(updated.phases).toHaveLength(0);
    expect(updated.current_phase).toBeNull();
  });
});

describe('advancePhase', () => {
  it('marks phase completed and moves to next', () => {
    let status = createInitialStatus('b', 'd');
    status = setPhases(status, [
      { id: 'PH-1', title: 'A', status: 'in_progress' },
      { id: 'PH-2', title: 'B', status: 'pending' },
      { id: 'PH-3', title: 'C', status: 'pending' },
    ]);

    const updated = advancePhase(status, 'PH-1', 'phases/PH-1-summary.md');
    expect(updated.phases[0].status).toBe('completed');
    expect(updated.phases[0].summary_file).toBe('phases/PH-1-summary.md');
    expect(updated.phases[1].status).toBe('in_progress');
    expect(updated.current_phase).toBe('PH-2');
  });

  it('sets current_phase to null when no more pending', () => {
    let status = createInitialStatus('b', 'd');
    status = setPhases(status, [
      { id: 'PH-1', title: 'A', status: 'in_progress' },
    ]);

    const updated = advancePhase(status, 'PH-1', 'phases/PH-1-summary.md');
    expect(updated.phases[0].status).toBe('completed');
    expect(updated.current_phase).toBeNull();
  });
});

describe('startPhase', () => {
  it('marks a specific phase as in_progress', () => {
    let status = createInitialStatus('b', 'd');
    status = setPhases(status, [
      { id: 'PH-1', title: 'A', status: 'pending' },
      { id: 'PH-2', title: 'B', status: 'pending' },
    ]);

    const updated = startPhase(status, 'PH-1');
    expect(updated.phases[0].status).toBe('in_progress');
    expect(updated.current_phase).toBe('PH-1');
  });
});

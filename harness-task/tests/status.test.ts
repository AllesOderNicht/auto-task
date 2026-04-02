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
  resetToPhase,
  updatePhaseReview,
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
      { id: 'PH-1', title: 'Setup', status: 'completed', summary: 'src/index.ts: added entry point' },
      { id: 'PH-2', title: 'Core', status: 'completed', summary: 'src/core.ts: added core logic' },
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

    const updated = advancePhase(status, 'PH-1', 'src/index.ts: added entry point');
    expect(updated.phases[0].status).toBe('completed');
    expect(updated.phases[0].summary).toBe('src/index.ts: added entry point');
    expect(updated.phases[1].status).toBe('in_progress');
    expect(updated.current_phase).toBe('PH-2');
  });

  it('sets current_phase to null when no more pending', () => {
    let status = createInitialStatus('b', 'd');
    status = setPhases(status, [
      { id: 'PH-1', title: 'A', status: 'in_progress' },
    ]);

    const updated = advancePhase(status, 'PH-1', 'src/setup.ts: initial setup');
    expect(updated.phases[0].status).toBe('completed');
    expect(updated.current_phase).toBeNull();
  });

  it('records review_score and review_round when provided', () => {
    let status = createInitialStatus('b', 'd');
    status = setPhases(status, [
      { id: 'PH-1', title: 'A', status: 'in_progress' },
      { id: 'PH-2', title: 'B', status: 'pending' },
    ]);

    const updated = advancePhase(status, 'PH-1', 'done', 7.36, 2);
    expect(updated.phases[0].review_score).toBe(7.36);
    expect(updated.phases[0].review_round).toBe(2);
    expect(updated.phases[0].status).toBe('completed');
  });

  it('omits review fields when not provided', () => {
    let status = createInitialStatus('b', 'd');
    status = setPhases(status, [
      { id: 'PH-1', title: 'A', status: 'in_progress' },
    ]);

    const updated = advancePhase(status, 'PH-1', 'done');
    expect(updated.phases[0].review_score).toBeUndefined();
    expect(updated.phases[0].review_round).toBeUndefined();
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

describe('resetToPhase', () => {
  it('resets from a middle phase, keeping earlier phases completed', () => {
    let status = createInitialStatus('b', 'd');
    status = updateStage(status, 'verifying');
    status = setPhases(status, [
      { id: 'PH-1', title: 'Setup', status: 'completed', summary: 'src/setup.ts: init' },
      { id: 'PH-2', title: 'Core', status: 'completed', summary: 'src/core.ts: logic' },
      { id: 'PH-3', title: 'API', status: 'completed', summary: 'src/api.ts: endpoints' },
      { id: 'PH-4', title: 'Polish', status: 'completed', summary: 'src/ui.ts: styles' },
    ]);

    const updated = resetToPhase(status, 'PH-2');

    expect(updated.stage).toBe('executing');
    expect(updated.current_phase).toBe('PH-2');
    expect(updated.phases[0].status).toBe('completed');
    expect(updated.phases[0].summary).toBe('src/setup.ts: init');
    expect(updated.phases[1].status).toBe('in_progress');
    expect(updated.phases[1].summary).toBeUndefined();
    expect(updated.phases[2].status).toBe('pending');
    expect(updated.phases[2].summary).toBeUndefined();
    expect(updated.phases[3].status).toBe('pending');
    expect(updated.phases[3].summary).toBeUndefined();
  });

  it('resets to the first phase', () => {
    let status = createInitialStatus('b', 'd');
    status = updateStage(status, 'executing');
    status = setPhases(status, [
      { id: 'PH-1', title: 'A', status: 'completed', summary: 'done' },
      { id: 'PH-2', title: 'B', status: 'completed', summary: 'done' },
    ]);

    const updated = resetToPhase(status, 'PH-1');

    expect(updated.current_phase).toBe('PH-1');
    expect(updated.phases[0].status).toBe('in_progress');
    expect(updated.phases[0].summary).toBeUndefined();
    expect(updated.phases[1].status).toBe('pending');
    expect(updated.phases[1].summary).toBeUndefined();
  });

  it('resets to the last phase', () => {
    let status = createInitialStatus('b', 'd');
    status = updateStage(status, 'verifying');
    status = setPhases(status, [
      { id: 'PH-1', title: 'A', status: 'completed', summary: 's1' },
      { id: 'PH-2', title: 'B', status: 'completed', summary: 's2' },
      { id: 'PH-3', title: 'C', status: 'completed', summary: 's3' },
    ]);

    const updated = resetToPhase(status, 'PH-3');

    expect(updated.stage).toBe('executing');
    expect(updated.current_phase).toBe('PH-3');
    expect(updated.phases[0].status).toBe('completed');
    expect(updated.phases[0].summary).toBe('s1');
    expect(updated.phases[1].status).toBe('completed');
    expect(updated.phases[1].summary).toBe('s2');
    expect(updated.phases[2].status).toBe('in_progress');
    expect(updated.phases[2].summary).toBeUndefined();
  });

  it('forces stage back to executing even from verifying', () => {
    let status = createInitialStatus('b', 'd');
    status = updateStage(status, 'verifying');
    status = setPhases(status, [
      { id: 'PH-1', title: 'A', status: 'completed', summary: 's1' },
    ]);

    const updated = resetToPhase(status, 'PH-1');
    expect(updated.stage).toBe('executing');
  });
});

describe('updatePhaseReview', () => {
  it('records review score and round on a phase', () => {
    let status = createInitialStatus('b', 'd');
    status = setPhases(status, [
      { id: 'PH-1', title: 'A', status: 'in_progress' },
      { id: 'PH-2', title: 'B', status: 'pending' },
    ]);

    const updated = updatePhaseReview(status, 'PH-1', 7.5, 1);
    expect(updated.phases[0].review_score).toBe(7.5);
    expect(updated.phases[0].review_round).toBe(1);
    expect(updated.phases[0].status).toBe('in_progress');
  });

  it('does not alter other phases', () => {
    let status = createInitialStatus('b', 'd');
    status = setPhases(status, [
      { id: 'PH-1', title: 'A', status: 'completed', summary: 's1' },
      { id: 'PH-2', title: 'B', status: 'in_progress' },
    ]);

    const updated = updatePhaseReview(status, 'PH-2', 6.0, 2);
    expect(updated.phases[0].review_score).toBeUndefined();
    expect(updated.phases[1].review_score).toBe(6.0);
    expect(updated.phases[1].review_round).toBe(2);
  });

  it('overwrites previous review data', () => {
    let status = createInitialStatus('b', 'd');
    status = setPhases(status, [
      { id: 'PH-1', title: 'A', status: 'in_progress' },
    ]);

    let updated = updatePhaseReview(status, 'PH-1', 5.0, 1);
    updated = updatePhaseReview(updated, 'PH-1', 7.5, 2);
    expect(updated.phases[0].review_score).toBe(7.5);
    expect(updated.phases[0].review_round).toBe(2);
  });
});

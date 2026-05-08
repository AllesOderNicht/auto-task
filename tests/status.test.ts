import { describe, expect, it } from 'vitest';

import {
  STAGE_ORDER,
  QUESTION_CHECKPOINT_TOTAL,
  CODE_READS_LOG_MAX,
  CODE_READS_LOG_KEEP,
  createInitialStatus,
  updateStage,
  getNextStage,
  isComplete,
  setPhases,
  advancePhase,
  startPhase,
  resetToPhase,
  updatePhaseReview,
  advanceQuestionCheckpoint,
  hasCompletedQuestionCheckpoints,
  resetCategoryState,
  appendCodeReadLog,
} from '../src/utils/status.js';
import type { CodeReadLogEntry } from '../src/utils/status.js';

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

describe('advanceQuestionCheckpoint', () => {
  it('increments from 0 to 1 after the first question checkpoint', () => {
    let status = createInitialStatus('b', 'd');
    status = updateStage(status, 'refining');
    const updated = advanceQuestionCheckpoint(status);
    expect(updated.question_checkpoint).toBe(1);
  });

  it('increments through all 4 question checkpoints', () => {
    let status = createInitialStatus('b', 'd');
    status = updateStage(status, 'refining');
    status = advanceQuestionCheckpoint(status);
    expect(status.question_checkpoint).toBe(1);
    status = advanceQuestionCheckpoint(status);
    expect(status.question_checkpoint).toBe(2);
    status = advanceQuestionCheckpoint(status);
    expect(status.question_checkpoint).toBe(3);
    status = advanceQuestionCheckpoint(status);
    expect(status.question_checkpoint).toBe(4);
  });

  it('does not increment beyond the total checkpoint count', () => {
    let status = createInitialStatus('b', 'd');
    status = updateStage(status, 'refining');
    status = advanceQuestionCheckpoint(status);
    status = advanceQuestionCheckpoint(status);
    status = advanceQuestionCheckpoint(status);
    status = advanceQuestionCheckpoint(status);
    const updated = advanceQuestionCheckpoint(status);
    expect(updated.question_checkpoint).toBe(QUESTION_CHECKPOINT_TOTAL);
  });

  it('treats undefined question_checkpoint as 0', () => {
    let status = createInitialStatus('b', 'd');
    expect(status.question_checkpoint).toBeUndefined();
    const updated = advanceQuestionCheckpoint(status);
    expect(updated.question_checkpoint).toBe(1);
  });

  it('migrates from legacy brainstorming_round when present', () => {
    const status = {
      ...createInitialStatus('b', 'd'),
      stage: 'refining' as const,
      brainstorming_round: 2,
    };

    const updated = advanceQuestionCheckpoint(status);

    expect(updated.question_checkpoint).toBe(3);
    expect('brainstorming_round' in updated).toBe(false);
  });

  it('clears per-category scratch fields when checkpoint advances', () => {
    let status = createInitialStatus('b', 'd');
    status = updateStage(status, 'refining');
    status = {
      ...status,
      current_question_category: 1,
      round_in_category: 4,
    };

    const updated = advanceQuestionCheckpoint(status);

    expect(updated.question_checkpoint).toBe(1);
    expect(updated.current_question_category).toBeUndefined();
    expect(updated.round_in_category).toBeUndefined();
  });

  it('preserves code_reads_log across checkpoint advances', () => {
    const entry: CodeReadLogEntry = {
      category: 1,
      round: 1,
      count: 6,
      over_budget: true,
      at: new Date().toISOString(),
    };
    let status = createInitialStatus('b', 'd');
    status = updateStage(status, 'refining');
    status = { ...status, code_reads_log: [entry] };

    const updated = advanceQuestionCheckpoint(status);

    expect(updated.code_reads_log).toEqual([entry]);
  });
});

describe('hasCompletedQuestionCheckpoints', () => {
  it('returns false when question_checkpoint is undefined', () => {
    const status = createInitialStatus('b', 'd');
    expect(hasCompletedQuestionCheckpoints(status)).toBe(false);
  });

  it('returns false when question_checkpoint is less than 4', () => {
    let status = createInitialStatus('b', 'd');
    status = advanceQuestionCheckpoint(status);
    expect(hasCompletedQuestionCheckpoints(status)).toBe(false);
    status = advanceQuestionCheckpoint(status);
    expect(hasCompletedQuestionCheckpoints(status)).toBe(false);
    status = advanceQuestionCheckpoint(status);
    expect(hasCompletedQuestionCheckpoints(status)).toBe(false);
  });

  it('returns true when question_checkpoint equals 4', () => {
    let status = createInitialStatus('b', 'd');
    status = advanceQuestionCheckpoint(status);
    status = advanceQuestionCheckpoint(status);
    status = advanceQuestionCheckpoint(status);
    status = advanceQuestionCheckpoint(status);
    expect(hasCompletedQuestionCheckpoints(status)).toBe(true);
  });

  it('treats legacy brainstorming_round as checkpoint progress', () => {
    const status = {
      ...createInitialStatus('b', 'd'),
      brainstorming_round: 4,
    };

    expect(hasCompletedQuestionCheckpoints(status)).toBe(true);
  });
});

describe('updateStage with question checkpoint gate', () => {
  it('throws when advancing from refining to proposing without completing all question checkpoints', () => {
    let status = createInitialStatus('b', 'd');
    status = updateStage(status, 'refining');
    expect(() => updateStage(status, 'proposing')).toThrow(
      /Cannot advance from refining to proposing/,
    );
  });

  it('throws when question_checkpoint is only 3', () => {
    let status = createInitialStatus('b', 'd');
    status = updateStage(status, 'refining');
    status = advanceQuestionCheckpoint(status);
    status = advanceQuestionCheckpoint(status);
    status = advanceQuestionCheckpoint(status);
    expect(() => updateStage(status, 'proposing')).toThrow(
      /question_checkpoint is 3, must be 4/,
    );
  });

  it('allows advancing from refining to proposing when all 4 question checkpoints complete', () => {
    let status = createInitialStatus('b', 'd');
    status = updateStage(status, 'refining');
    status = advanceQuestionCheckpoint(status);
    status = advanceQuestionCheckpoint(status);
    status = advanceQuestionCheckpoint(status);
    status = advanceQuestionCheckpoint(status);
    const updated = updateStage(status, 'proposing');
    expect(updated.stage).toBe('proposing');
  });

  it('does not gate other stage transitions', () => {
    let status = createInitialStatus('b', 'd');
    status = updateStage(status, 'prompting');
    expect(status.stage).toBe('prompting');
    status = updateStage(status, 'refining');
    expect(status.stage).toBe('refining');
  });
});

describe('resetCategoryState', () => {
  it('clears current_question_category and round_in_category', () => {
    let status = createInitialStatus('b', 'd');
    status = updateStage(status, 'refining');
    status = {
      ...status,
      current_question_category: 2,
      round_in_category: 3,
    };

    const updated = resetCategoryState(status);

    expect(updated.current_question_category).toBeUndefined();
    expect(updated.round_in_category).toBeUndefined();
  });

  it('preserves question_checkpoint and code_reads_log', () => {
    const entry: CodeReadLogEntry = {
      category: 2,
      round: 1,
      count: 3,
      over_budget: false,
      at: new Date().toISOString(),
    };
    let status = createInitialStatus('b', 'd');
    status = updateStage(status, 'refining');
    status = advanceQuestionCheckpoint(status);
    status = {
      ...status,
      current_question_category: 2,
      round_in_category: 1,
      code_reads_log: [entry],
    };

    const updated = resetCategoryState(status);

    expect(updated.question_checkpoint).toBe(1);
    expect(updated.code_reads_log).toEqual([entry]);
  });

  it('strips legacy brainstorming_round if present', () => {
    const status = {
      ...createInitialStatus('b', 'd'),
      brainstorming_round: 1,
      current_question_category: 1 as const,
      round_in_category: 2,
    };

    const updated = resetCategoryState(status);

    expect('brainstorming_round' in updated).toBe(false);
    expect(updated.current_question_category).toBeUndefined();
  });
});

describe('appendCodeReadLog', () => {
  const makeEntry = (round: number): CodeReadLogEntry => ({
    category: 1,
    round,
    count: 4,
    over_budget: false,
    at: new Date(2026, 0, round).toISOString(),
  });

  it('appends an entry to an empty log', () => {
    const status = createInitialStatus('b', 'd');
    const entry = makeEntry(1);

    const updated = appendCodeReadLog(status, entry);

    expect(updated.code_reads_log).toEqual([entry]);
  });

  it('appends to an existing log without truncation when under cap', () => {
    let status = createInitialStatus('b', 'd');
    status = appendCodeReadLog(status, makeEntry(1));
    status = appendCodeReadLog(status, makeEntry(2));

    expect(status.code_reads_log).toHaveLength(2);
    expect(status.code_reads_log?.[0].round).toBe(1);
    expect(status.code_reads_log?.[1].round).toBe(2);
  });

  it('truncates to the most recent CODE_READS_LOG_KEEP entries when exceeding CODE_READS_LOG_MAX', () => {
    let status = createInitialStatus('b', 'd');
    // pre-populate at exactly the cap
    const seed: CodeReadLogEntry[] = [];
    for (let i = 1; i <= CODE_READS_LOG_MAX; i++) {
      seed.push(makeEntry(i));
    }
    status = { ...status, code_reads_log: seed };

    // appending one more should trigger truncation to KEEP entries
    status = appendCodeReadLog(status, makeEntry(CODE_READS_LOG_MAX + 1));

    expect(status.code_reads_log).toHaveLength(CODE_READS_LOG_KEEP);
    // most-recent semantics: last entry must be the just-appended one
    expect(status.code_reads_log?.[CODE_READS_LOG_KEEP - 1].round).toBe(
      CODE_READS_LOG_MAX + 1,
    );
    // first entry after truncation is at index (MAX + 1) - KEEP + 1
    expect(status.code_reads_log?.[0].round).toBe(
      CODE_READS_LOG_MAX + 1 - CODE_READS_LOG_KEEP + 1,
    );
  });

  it('marks over_budget entries as over_budget', () => {
    const status = createInitialStatus('b', 'd');
    const entry: CodeReadLogEntry = {
      category: 1,
      round: 1,
      count: 8,
      over_budget: true,
      at: new Date().toISOString(),
    };

    const updated = appendCodeReadLog(status, entry);

    expect(updated.code_reads_log?.[0].over_budget).toBe(true);
  });
});

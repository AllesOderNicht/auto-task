import { describe, expect, it } from 'vitest';

import { parsePhases, toPhaseProgress, formatPhaseSummary } from '../src/utils/phase.js';

describe('parsePhases', () => {
  it('parses phases and tasks from tasks.md content', () => {
    const content = `# Tasks

## Phase 1: Project Setup
- [ ] 1.1 Initialize project structure
- [ ] 1.2 Configure build tools

## Phase 2: Core Implementation
- [ ] 2.1 Create data models
- [ ] 2.2 Implement business logic
- [ ] 2.3 Add error handling
`;

    const phases = parsePhases(content);
    expect(phases).toHaveLength(2);

    expect(phases[0].id).toBe('PH-1');
    expect(phases[0].title).toBe('Project Setup');
    expect(phases[0].tasks).toEqual([
      '1.1 Initialize project structure',
      '1.2 Configure build tools',
    ]);

    expect(phases[1].id).toBe('PH-2');
    expect(phases[1].title).toBe('Core Implementation');
    expect(phases[1].tasks).toHaveLength(3);
  });

  it('handles already-checked tasks', () => {
    const content = `## Phase 1: Done Phase
- [x] 1.1 Already completed task
- [ ] 1.2 Pending task
`;

    const phases = parsePhases(content);
    expect(phases[0].tasks).toHaveLength(2);
    expect(phases[0].tasks[0]).toBe('1.1 Already completed task');
  });

  it('returns empty array for content without phases', () => {
    expect(parsePhases('No phases here')).toEqual([]);
    expect(parsePhases('')).toEqual([]);
  });

  it('ignores non-task lines within phases', () => {
    const content = `## Phase 1: Setup
Some description text.

- [ ] 1.1 Real task
Not a task line.
- [ ] 1.2 Another real task
`;

    const phases = parsePhases(content);
    expect(phases[0].tasks).toEqual([
      '1.1 Real task',
      '1.2 Another real task',
    ]);
  });
});

describe('toPhaseProgress', () => {
  it('converts parsed phases to PhaseProgress with pending status', () => {
    const parsed = [
      { id: 'PH-1', title: 'Setup', tasks: ['1.1 Init'] },
      { id: 'PH-2', title: 'Core', tasks: ['2.1 Build'] },
    ];

    const progress = toPhaseProgress(parsed);
    expect(progress).toEqual([
      { id: 'PH-1', title: 'Setup', status: 'pending' },
      { id: 'PH-2', title: 'Core', status: 'pending' },
    ]);
  });
});

describe('formatPhaseSummary', () => {
  it('formats a minimal phase summary', () => {
    const summary = formatPhaseSummary('PH-1', 'Project Setup', [
      { file: 'src/index.ts', description: 'Added entry point' },
      { file: 'package.json', description: 'Updated dependencies' },
    ]);

    expect(summary).toContain('# PH-1: Project Setup');
    expect(summary).toContain('## Files Changed');
    expect(summary).toContain('| src/index.ts | Added entry point |');
    expect(summary).toContain('| package.json | Updated dependencies |');
  });

  it('handles empty file changes', () => {
    const summary = formatPhaseSummary('PH-1', 'Setup', []);
    expect(summary).toContain('# PH-1: Setup');
    expect(summary).toContain('| File | Change |');
  });
});

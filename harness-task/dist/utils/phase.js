/**
 * Parse phases from tasks.md content.
 * Expected format:
 *   ## Phase 1: Title Here
 *   - [ ] 1.1 Task description
 *   - [ ] 1.2 Another task
 *   ## Phase 2: Another Title
 *   - [ ] 2.1 Task description
 */
export function parsePhases(tasksContent) {
    const lines = tasksContent.split('\n');
    const phases = [];
    let current = null;
    for (const line of lines) {
        const phaseMatch = line.match(/^##\s+Phase\s+(\d+):\s*(.+)$/i);
        if (phaseMatch) {
            if (current)
                phases.push(current);
            current = {
                id: `PH-${phaseMatch[1]}`,
                title: phaseMatch[2].trim(),
                tasks: [],
            };
            continue;
        }
        if (current) {
            const taskMatch = line.match(/^\s*-\s+\[[ x]\]\s+(.+)$/i);
            if (taskMatch) {
                current.tasks.push(taskMatch[1].trim());
            }
        }
    }
    if (current)
        phases.push(current);
    return phases;
}
export function toPhaseProgress(parsed) {
    return parsed.map(p => ({
        id: p.id,
        title: p.title,
        status: 'pending',
    }));
}
export function formatPhaseSummary(phaseId, phaseTitle, fileChanges) {
    const lines = [
        `# ${phaseId}: ${phaseTitle}`,
        '',
        '## Files Changed',
        '',
        '| File | Change |',
        '|------|--------|',
    ];
    for (const change of fileChanges) {
        lines.push(`| ${change.file} | ${change.description} |`);
    }
    lines.push('');
    return lines.join('\n');
}
//# sourceMappingURL=phase.js.map
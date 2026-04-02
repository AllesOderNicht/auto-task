import { join } from 'node:path';
const SAFE_SEGMENT_PATTERN = /[^A-Za-z0-9._-]+/g;
const EDGE_SEPARATOR_PATTERN = /^[_\-.]+|[_\-.]+$/g;
const ARTIFACT_FILES = {
    'prompt': 'prompt.md',
    'refined-prompt': 'refined-prompt.md',
    'proposal': 'proposal.md',
    'design': 'design.md',
    'tasks': 'tasks.md',
    'status': 'status.json',
};
export function getChangeDirName(branchName) {
    const normalized = branchName
        .trim()
        .replace(/[\\/]+/g, '-')
        .replace(SAFE_SEGMENT_PATTERN, '_')
        .replace(EDGE_SEPARATOR_PATTERN, '');
    return normalized || 'change';
}
export function getChangeDirPath(projectDir, branchName) {
    return join(projectDir, '.dev-changes', getChangeDirName(branchName));
}
export function getArtifactPath(changeDir, artifact) {
    return join(changeDir, ARTIFACT_FILES[artifact]);
}
export function getPhaseSummaryPath(changeDir, phaseId) {
    return join(changeDir, 'phases', `${phaseId}-summary.md`);
}
export function getPhasesDir(changeDir) {
    return join(changeDir, 'phases');
}
export function createPromptTemplate(branchName) {
    return [
        '# Prompt',
        '',
        `- Branch: \`${branchName}\``,
        '',
        '## Requirement',
        '',
        '<!-- Describe what you want to build or change. -->',
        '',
    ].join('\n');
}
export function createPhaseSummaryTemplate(phaseId, phaseTitle) {
    return [
        `# ${phaseId}: ${phaseTitle}`,
        '',
        '## Files Changed',
        '',
        '| File | Change |',
        '|------|--------|',
        '<!-- | path/to/file.ts | One-line description | -->',
        '',
    ].join('\n');
}
//# sourceMappingURL=change.js.map
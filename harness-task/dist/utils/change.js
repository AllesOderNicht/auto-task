import { join } from 'node:path';
const SAFE_SEGMENT_PATTERN = /[^A-Za-z0-9._-]+/g;
const EDGE_SEPARATOR_PATTERN = /^[_\-.]+|[_\-.]+$/g;
const ARTIFACT_FILES = {
    'prompt': 'prompt.md',
    'proposal': 'proposal.md',
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
export function getPhasePlanPath(changeDir, phaseId) {
    return join(changeDir, 'phases', `${phaseId}.md`);
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
export function createPhasePlanTemplate(phaseId, phaseTitle) {
    return [
        `# ${phaseId}: ${phaseTitle}`,
        '',
        '## Tasks',
        '',
        `<!-- - [ ] ${phaseId.replace('PH-', '')}.1 Specific task with file paths -->`,
        '',
    ].join('\n');
}
//# sourceMappingURL=change.js.map
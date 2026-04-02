import { readFile, writeFile, mkdir, rename, access } from 'node:fs/promises';
import { dirname } from 'node:path';
export async function ensureDir(dirPath) {
    await mkdir(dirPath, { recursive: true });
}
export async function fileExists(path) {
    try {
        await access(path);
        return true;
    }
    catch {
        return false;
    }
}
export async function readJsonSafe(path) {
    try {
        const content = await readFile(path, 'utf-8');
        return JSON.parse(content);
    }
    catch {
        return null;
    }
}
export async function writeJson(path, data, indent = 2) {
    await ensureDir(dirname(path));
    await writeFile(path, JSON.stringify(data, null, indent) + '\n', 'utf-8');
}
export async function readTextSafe(path) {
    try {
        return await readFile(path, 'utf-8');
    }
    catch {
        return null;
    }
}
export async function writeText(path, content) {
    await ensureDir(dirname(path));
    await writeFile(path, content, 'utf-8');
}
export async function moveDirectory(src, dest) {
    await ensureDir(dirname(dest));
    await rename(src, dest);
}
/**
 * Smart merge for .claude/settings.local.json.
 * Preserves existing permissions and hooks, only adds harness-task specific entries.
 */
export async function mergeSettingsJson(settingsPath, additions) {
    const existing = await readJsonSafe(settingsPath) || {};
    // Merge permissions
    if (additions.permissions) {
        if (!existing.permissions)
            existing.permissions = {};
        if (additions.permissions.allow) {
            if (!existing.permissions.allow)
                existing.permissions.allow = [];
            const existingSet = new Set(existing.permissions.allow);
            for (const entry of additions.permissions.allow) {
                if (!existingSet.has(entry)) {
                    existing.permissions.allow.push(entry);
                }
            }
        }
        if (additions.permissions.deny) {
            if (!existing.permissions.deny)
                existing.permissions.deny = [];
            const existingSet = new Set(existing.permissions.deny);
            for (const entry of additions.permissions.deny) {
                if (!existingSet.has(entry)) {
                    existing.permissions.deny.push(entry);
                }
            }
        }
    }
    // Merge hooks
    if (additions.hooks) {
        if (!existing.hooks)
            existing.hooks = {};
        for (const [eventName, hookList] of Object.entries(additions.hooks)) {
            if (!existing.hooks[eventName]) {
                existing.hooks[eventName] = hookList;
            }
            else {
                // Append new hook entries that don't already exist (by command string match)
                const existingCommands = new Set(existing.hooks[eventName].flatMap((h) => (h.hooks || [h]).map((hk) => hk.command || '')));
                for (const hook of hookList) {
                    const cmds = (hook.hooks || [hook]).map((hk) => hk.command || '');
                    if (!cmds.some((c) => existingCommands.has(c))) {
                        existing.hooks[eventName].push(hook);
                    }
                }
            }
        }
    }
    await writeJson(settingsPath, existing);
}
//# sourceMappingURL=fs.js.map
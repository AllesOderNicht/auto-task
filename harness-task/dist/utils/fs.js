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
//# sourceMappingURL=fs.js.map
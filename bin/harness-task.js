#!/usr/bin/env node
// harness-task CLI — install workflow assets into any AI IDE
import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import os from "os";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, "..");

// ─── helpers ────────────────────────────────────────────────────────────────

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeJson(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function copyFile(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      copyFile(s, d);
    }
  }
}

function transformText(text, mode, opts = {}) {
  const SKILL_IDS = [
    "archive", "bugfix", "dev", "executing", "list-changes",
    "phase-review", "project-details", "refining-orchestrator",
    "review", "tdd", "using-harness-task",
  ];
  const AGENT_IDS = [
    "analysis-agent", "proposal-agent", "phase-reviewer", "bug-investigator",
  ];

  // Replace skill/agent references
  for (const id of SKILL_IDS) {
    text = text.replaceAll(`harness-task:${id}`, `harness-task-${id}`);
  }
  for (const id of AGENT_IDS) {
    text = text.replaceAll(id, `harness-task-${id}`);
  }

  function splitFrontmatter(raw) {
    if (!raw.startsWith("---\n")) return [null, raw];
    const end = raw.indexOf("\n---\n", 4);
    if (end === -1) return [null, raw];
    return [raw.slice(4, end), raw.slice(end + 5)];
  }

  function dumpFrontmatter(lines) {
    return "---\n" + lines.join("\n") + "\n---\n";
  }

  function quoteYaml(value) {
    return '"' + value.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
  }

  if (mode === "skill") {
    const [fm, body] = splitFrontmatter(text);
    const lines = fm ? fm.split("\n") : [];
    let replaced = false;
    const updated = lines.map((l) => {
      if (l.startsWith("name:")) { replaced = true; return `name: ${opts.name}`; }
      return l;
    });
    if (!replaced) updated.unshift(`name: ${opts.name}`);
    return dumpFrontmatter(updated) + body.replace(/^\n+/, "");
  }

  if (mode === "agent") {
    const [fm, body] = splitFrontmatter(text);
    const lines = fm ? fm.split("\n") : [];
    let replaced = false;
    const updated = lines.map((l) => {
      if (l.startsWith("name:")) { replaced = true; return `name: ${opts.name}`; }
      return l;
    });
    if (!replaced) updated.unshift(`name: ${opts.name}`);
    return dumpFrontmatter(updated) + body.replace(/^\n+/, "");
  }

  if (mode === "command") {
    const fmLines = [
      `description: ${quoteYaml(opts.description)}`,
      "disable-model-invocation: true",
    ];
    if (opts.argumentHint) fmLines.push(`argument-hint: ${quoteYaml(opts.argumentHint)}`);
    return dumpFrontmatter(fmLines) + "\n" + text.trimEnd() + "\n";
  }

  return text;
}

// ─── platform installers ─────────────────────────────────────────────────────

const SKILL_IDS = [
  "archive", "bugfix", "dev", "executing", "list-changes",
  "phase-review", "project-details", "refining-orchestrator",
  "review", "tdd", "using-harness-task",
];

const AGENT_IDS = [
  "analysis-agent", "proposal-agent", "phase-reviewer", "bug-investigator",
];

const COMMAND_IDS = [
  "alles-dev", "alles-bugfix", "alles-list-changes",
  "alles-archive", "alles-details", "review",
];

const COMMAND_META = {
  "alles-dev":          { description: "启动或恢复一个开发变更",           argumentHint: "[branch-name]" },
  "alles-bugfix":       { description: "对当前开发变更执行 bugfix 流程",    argumentHint: "[bug symptoms]" },
  "alles-list-changes": { description: "查看所有开发变更及其状态",           argumentHint: "" },
  "alles-archive":      { description: "归档已完成的开发变更",              argumentHint: "" },
  "alles-details":      { description: "从归档变更生成项目级注意事项",       argumentHint: "" },
  "review":             { description: "对开发变更执行结构化代码审查",       argumentHint: "[branch-name]" },
};

// ── Claude Code / claude-internal ───────────────────────────────────────────
function installClaudeInternal(claudeDir) {
  const commandsDir = path.join(claudeDir, "commands");
  const skillsDir = path.join(claudeDir, "skills");
  fs.mkdirSync(commandsDir, { recursive: true });
  fs.mkdirSync(skillsDir, { recursive: true });

  // Create symlink for main plugin root
  const pluginLink = path.join(claudeDir, "harness-task");
  try {
    if (fs.existsSync(pluginLink)) fs.rmSync(pluginLink, { recursive: true, force: true });
    fs.symlinkSync(PACKAGE_ROOT, pluginLink);
    console.log(`  + main link: ${pluginLink} → ${PACKAGE_ROOT}`);
  } catch {
    // fallback: copy if symlink fails (Windows restricted)
    copyDir(PACKAGE_ROOT, pluginLink);
    console.log(`  + main copy: ${pluginLink}`);
  }

  // Commands — symlink to plugin link
  for (const id of COMMAND_IDS) {
    const target = path.join(pluginLink, "commands", `${id}.md`);
    const link = path.join(commandsDir, `${id}.md`);
    if (fs.existsSync(link)) fs.rmSync(link, { force: true });
    try {
      fs.symlinkSync(target, link);
    } catch {
      copyFile(path.join(PACKAGE_ROOT, "commands", `${id}.md`), link);
    }
    console.log(`  + command: /${id}`);
  }

  // Skills — symlink to plugin link
  for (const id of SKILL_IDS) {
    const target = path.join(pluginLink, "skills", id);
    const link = path.join(skillsDir, `harness-task:${id}`);
    if (fs.existsSync(link)) fs.rmSync(link, { recursive: true, force: true });
    try {
      fs.symlinkSync(target, link);
    } catch {
      copyDir(path.join(PACKAGE_ROOT, "skills", id), link);
    }
    console.log(`  + skill: harness-task:${id}`);
  }
}

// ── CodeBuddy ────────────────────────────────────────────────────────────────
function installCodebuddy(targetRoot) {
  const commandsDst = path.join(targetRoot, "commands");
  const skillsDst = path.join(targetRoot, "skills");
  const agentsDst = path.join(targetRoot, "agents");
  fs.mkdirSync(commandsDst, { recursive: true });
  fs.mkdirSync(skillsDst, { recursive: true });
  fs.mkdirSync(agentsDst, { recursive: true });

  // Remove old artifacts
  for (const id of SKILL_IDS)   fs.rmSync(path.join(skillsDst, `harness-task-${id}`), { recursive: true, force: true });
  for (const id of AGENT_IDS)   fs.rmSync(path.join(agentsDst, `harness-task-${id}.md`), { force: true });
  for (const id of COMMAND_IDS) fs.rmSync(path.join(commandsDst, `${id}.md`), { force: true });

  // Skills
  for (const id of SKILL_IDS) {
    const src = path.join(PACKAGE_ROOT, "skills", id, "SKILL.md");
    const dst = path.join(skillsDst, `harness-task-${id}`, "SKILL.md");
    const text = transformText(fs.readFileSync(src, "utf8"), "skill", { name: `harness-task-${id}` });
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, text, "utf8");
    console.log(`  + skill: harness-task-${id}`);
  }

  // Agents
  for (const id of AGENT_IDS) {
    const src = path.join(PACKAGE_ROOT, "agents", `${id}.md`);
    const dst = path.join(agentsDst, `harness-task-${id}.md`);
    const text = transformText(fs.readFileSync(src, "utf8"), "agent", { name: `harness-task-${id}` });
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, text, "utf8");
    console.log(`  + agent: harness-task-${id}`);
  }

  // Commands
  for (const id of COMMAND_IDS) {
    const src = path.join(PACKAGE_ROOT, "commands", `${id}.md`);
    const dst = path.join(commandsDst, `${id}.md`);
    const meta = COMMAND_META[id];
    const text = transformText(fs.readFileSync(src, "utf8"), "command", {
      description: meta.description,
      argumentHint: meta.argumentHint,
    });
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, text, "utf8");
    console.log(`  + command: /${id}`);
  }
}

// ── Cursor ──────────────────────────────────────────────────────────────────
function installCursor() {
  const claudeDir = path.join(os.homedir(), ".claude");
  const installedJson = path.join(claudeDir, "plugins", "installed_plugins.json");
  const pluginName = "harness-task";
  const marketplaceKey = "local-harness-task";
  const pluginKey = `${pluginName}@${marketplaceKey}`;

  // Read version from .cursor-plugin/plugin.json (preferred) or .claude-plugin/plugin.json
  const cursorPluginJson = path.join(PACKAGE_ROOT, ".cursor-plugin", "plugin.json");
  const claudePluginJson = path.join(PACKAGE_ROOT, ".claude-plugin", "plugin.json");
  let pluginJsonPath;
  if (fs.existsSync(cursorPluginJson)) {
    pluginJsonPath = cursorPluginJson;
  } else if (fs.existsSync(claudePluginJson)) {
    pluginJsonPath = claudePluginJson;
  } else {
    console.error("错误: 未找到 .cursor-plugin/plugin.json 或 .claude-plugin/plugin.json");
    process.exit(1);
  }
  const pluginJson = readJson(pluginJsonPath);
  const newVersion = pluginJson.version;

  const cacheBase = path.join(claudeDir, "plugins", "cache", marketplaceKey, pluginName);
  const cacheDir = path.join(cacheBase, newVersion);

  console.log(`  源码版本: ${newVersion}`);
  console.log(`  缓存路径: ${cacheDir}`);

  // 1. Sync files to cache
  console.log("  >>> 同步文件到缓存...");
  fs.mkdirSync(cacheDir, { recursive: true });
  copyDir(PACKAGE_ROOT, cacheDir);
  console.log("    完成");

  // 2. Clean old versions
  if (fs.existsSync(cacheBase)) {
    for (const dir of fs.readdirSync(cacheBase)) {
      if (dir !== newVersion) {
        const oldDir = path.join(cacheBase, dir);
        if (fs.statSync(oldDir).isDirectory()) {
          console.log(`  >>> 清理旧版本缓存: ${dir}`);
          fs.rmSync(oldDir, { recursive: true, force: true });
        }
      }
    }
  }

  // 3. Update installed_plugins.json
  if (!fs.existsSync(installedJson)) {
    console.error(`错误: 未找到 ${installedJson}`);
    console.error("  请确保 Cursor 已安装并运行过。");
    process.exit(1);
  }

  console.log("  >>> 更新 installed_plugins.json...");
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, ".000Z");
  const data = readJson(installedJson);

  if (data.plugins && data.plugins[pluginKey]) {
    const entry = data.plugins[pluginKey][0];
    entry.installPath = cacheDir;
    entry.version = newVersion;
    entry.lastUpdated = timestamp;
    writeJson(installedJson, data);
    console.log(`    版本更新为 ${newVersion}`);
  } else {
    console.log(`    警告: 插件 ${pluginKey} 未在 installed_plugins.json 中找到，跳过更新`);
    console.log(`    请先在 Cursor 中手动安装一次 harness-task，或使用 Cursor 插件市场安装。`);
  }
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

const USAGE = `
harness-task — install the harness-task workflow into your AI IDE

Usage:
  harness-task install [options]
  harness-task install --codebuddy [--project <dir>] [--target <dir>]
  harness-task install --claude [--dir <dir>]
  harness-task install --cursor

Options:
  --codebuddy          Install into CodeBuddy (~/.codebuddy by default)
  --claude             Install into Claude Code / claude-internal (~/.claude-internal by default)
  --cursor             Install into Cursor (~/.claude/plugins/)
  --project <dir>      Project root — installs into <dir>/.codebuddy (CodeBuddy only)
  --target <dir>       Exact target .codebuddy directory (CodeBuddy only)
  --dir <dir>          Exact target ~/.claude-internal directory (Claude only)
  -h, --help           Show this help

When no platform flag is given, the command auto-detects based on which
directories already exist (~/.codebuddy, ~/.claude-internal, ~/.claude/plugins).
`.trim();

function parseArgs(argv) {
  const args = argv.slice(2);
  const result = { command: null, codebuddy: false, claude: false, cursor: false, project: null, target: null, dir: null };

  if (args[0] === "install") {
    result.command = "install";
    for (let i = 1; i < args.length; i++) {
      switch (args[i]) {
        case "--codebuddy":   result.codebuddy = true; break;
        case "--claude":      result.claude = true; break;
        case "--cursor":      result.cursor = true; break;
        case "--project":     result.project = args[++i]; break;
        case "--target":      result.target = args[++i]; break;
        case "--dir":         result.dir = args[++i]; break;
        case "-h":
        case "--help":        console.log(USAGE); process.exit(0); break;
        default:
          console.error(`Unknown option: ${args[i]}\n`);
          console.log(USAGE);
          process.exit(1);
      }
    }
  } else if (!args[0] || args[0] === "-h" || args[0] === "--help") {
    console.log(USAGE);
    process.exit(0);
  } else {
    console.error(`Unknown command: ${args[0]}\n`);
    console.log(USAGE);
    process.exit(1);
  }

  return result;
}

function detectPlatforms() {
  const home = os.homedir();
  const detected = [];
  if (fs.existsSync(path.join(home, ".codebuddy")))           detected.push("codebuddy");
  if (fs.existsSync(path.join(home, ".claude-internal")))     detected.push("claude");
  if (fs.existsSync(path.join(home, ".claude", "plugins")))  detected.push("cursor");
  return detected;
}

function runInstall(args) {
  const home = os.homedir();
  let installed = 0;

  const doCodebuddy = () => {
    let targetRoot;
    if (args.target) {
      targetRoot = path.resolve(args.target);
    } else if (args.project) {
      targetRoot = path.join(path.resolve(args.project), ".codebuddy");
    } else {
      targetRoot = path.join(home, ".codebuddy");
    }
    console.log(`\n[CodeBuddy] → ${targetRoot}`);
    installCodebuddy(targetRoot);
    console.log(`\nDone. Reload plugins in CodeBuddy (/reload-plugins or restart session).`);
    installed++;
  };

  const doClaude = () => {
    const claudeDir = args.dir
      ? path.resolve(args.dir)
      : path.join(home, ".claude-internal");
    console.log(`\n[Claude Code / claude-internal] → ${claudeDir}`);
    installClaudeInternal(claudeDir);
    console.log(`\nDone. Restart Claude Code to load the new skills.`);
    installed++;
  };

  const doCursor = () => {
    console.log(`\n[Cursor] → ~/.claude/plugins/`);
    installCursor();
    console.log(`\nDone. Restart Cursor to load the new plugin.`);
    installed++;
  };

  if (args.codebuddy)      { doCodebuddy(); }
  else if (args.claude)    { doClaude(); }
  else if (args.cursor)    { doCursor(); }
  else {
    // auto-detect
    const platforms = detectPlatforms();
    if (platforms.length === 0) {
      console.error("Nothing installed. Use --codebuddy, --claude, or --cursor to specify the target.");
      process.exit(1);
    } else {
      if (platforms.includes("codebuddy")) doCodebuddy();
      if (platforms.includes("claude"))    doClaude();
      if (platforms.includes("cursor"))    doCursor();
    }
  }
}

// ─── entry ────────────────────────────────────────────────────────────────────

const args = parseArgs(process.argv);
if (args.command === "install") {
  runInstall(args);
}

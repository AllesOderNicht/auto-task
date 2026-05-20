#!/usr/bin/env node
/**
 * harness-task — install the harness-task workflow into your AI IDE
 *
 * QUICK START
 * -----------
 *   npx @tencent/harness-task install          # auto-detect installed IDEs and install into all of them
 *   npx @tencent/harness-task install --codebuddy
 *   npx @tencent/harness-task install --claude
 *   npx @tencent/harness-task install --cursor
 *
 * PLATFORMS & DEFAULT PATHS
 * --------------------------
 *   --codebuddy   ~/.codebuddy/            skills + agents + commands
 *   --claude      ~/.claude/               skills (symlink) + commands (symlink)
 *   --cursor      ~/.cursor/               skills + commands
 *
 * OPTIONS
 * -------
 *   --project <dir>   CodeBuddy: install into <dir>/.codebuddy instead of ~/.codebuddy
 *   --target  <dir>   CodeBuddy: install into an exact directory path
 *   --dir     <dir>   Claude / Cursor: override the default ~/.claude or ~/.cursor path
 *   -h, --help        Show the built-in help message and exit
 *
 * EXAMPLES
 * --------
 *   # Install into all detected IDEs
 *   npx @tencent/harness-task install
 *
 *   # CodeBuddy only (global)
 *   npx @tencent/harness-task install --codebuddy
 *
 *   # CodeBuddy for the current project
 *   npx @tencent/harness-task install --codebuddy --project .
 *
 *   # Claude Code only
 *   npx @tencent/harness-task install --claude
 *
 *   # Cursor only
 *   npx @tencent/harness-task install --cursor
 *
 *   # All three at once (explicit)
 *   npx @tencent/harness-task install --codebuddy && \
 *   npx @tencent/harness-task install --claude    && \
 *   npx @tencent/harness-task install --cursor
 *
 * AFTER INSTALL
 * -------------
 *   CodeBuddy   — run /reload-plugins or restart the session
 *   Claude Code — restart Claude Code
 *   Cursor      — restart Cursor
 *
 * PUBLISH (internal npm registry)
 * --------------------------------
 *   npm publish   # uses publishConfig.registry in package.json → http://mirrors.tencent.com/npm/
 */
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import os from "os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, "..");

// ─── helpers ────────────────────────────────────────────────────────────────

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
    "archive", "architecture-deepening", "bugfix", "check", "dev", "diagnose", "domain-docs",
    "executing", "list-changes", "phase-review", "project-details", "refining-orchestrator",
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
  "archive", "architecture-deepening", "bugfix", "check", "dev", "diagnose", "domain-docs",
  "executing", "list-changes", "phase-review", "project-details", "refining-orchestrator",
  "review", "tdd", "using-harness-task",
];

const AGENT_IDS = [
  "analysis-agent", "proposal-agent", "phase-reviewer", "bug-investigator",
];

const COMMAND_IDS = [
  "alles-dev", "alles-bugfix", "alles-check", "alles-list-changes",
  "alles-archive", "alles-details", "review",
];

const COMMAND_META = {
  "alles-dev":          { description: "启动或恢复一个开发变更",           argumentHint: "[branch-name]" },
  "alles-bugfix":       { description: "对当前开发变更执行 bugfix 流程",    argumentHint: "[bug symptoms]" },
  "alles-check":        { description: "执行规划前三视角评审（产品、QA、架构）", argumentHint: "[branch-name]" },
  "alles-list-changes": { description: "查看所有开发变更及其状态",           argumentHint: "" },
  "alles-archive":      { description: "归档已完成的开发变更",              argumentHint: "" },
  "alles-details":      { description: "从归档变更生成项目级注意事项",       argumentHint: "" },
  "review":             { description: "对开发变更执行结构化代码审查",       argumentHint: "[branch-name]" },
};

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
    if (!fs.existsSync(src)) { console.warn(`  ! skill ${id}: SKILL.md not found, skipping`); continue; }
    const dst = path.join(skillsDst, `harness-task-${id}`, "SKILL.md");
    const text = transformText(fs.readFileSync(src, "utf8"), "skill", { name: `harness-task-${id}` });
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, text, "utf8");
    console.log(`  + skill: harness-task-${id}`);
  }

  // Agents
  for (const id of AGENT_IDS) {
    const src = path.join(PACKAGE_ROOT, "agents", `${id}.md`);
    if (!fs.existsSync(src)) { console.warn(`  ! agent ${id}: .md not found, skipping`); continue; }
    const dst = path.join(agentsDst, `harness-task-${id}.md`);
    const text = transformText(fs.readFileSync(src, "utf8"), "agent", { name: `harness-task-${id}` });
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, text, "utf8");
    console.log(`  + agent: harness-task-${id}`);
  }

  // Commands
  for (const id of COMMAND_IDS) {
    const src = path.join(PACKAGE_ROOT, "commands", `${id}.md`);
    if (!fs.existsSync(src)) { console.warn(`  ! command ${id}: .md not found, skipping`); continue; }
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

// ── Claude Code (~/.claude) ──────────────────────────────────────────────────
// Claude Code stores skills in ~/.claude/skills/<name>/SKILL.md
// and commands in ~/.claude/commands/<name>.md
function installClaude(claudeDir) {
  const commandsDir = path.join(claudeDir, "commands");
  const skillsDir = path.join(claudeDir, "skills");
  fs.mkdirSync(commandsDir, { recursive: true });
  fs.mkdirSync(skillsDir, { recursive: true });

  // Create a symlink for the main plugin root so files are always up to date
  // when harness-task is installed globally or via npx cache.
  const pluginLink = path.join(claudeDir, "harness-task");
  try {
    if (fs.existsSync(pluginLink)) fs.rmSync(pluginLink, { recursive: true, force: true });
    fs.symlinkSync(PACKAGE_ROOT, pluginLink, "dir");
    console.log(`  + main link: ${pluginLink} → ${PACKAGE_ROOT}`);
  } catch {
    // Windows or permission fallback: copy instead of symlink
    if (fs.existsSync(pluginLink)) fs.rmSync(pluginLink, { recursive: true, force: true });
    copyDir(PACKAGE_ROOT, pluginLink);
    console.log(`  + main copy: ${pluginLink}`);
  }

  // Commands — symlink each .md into ~/.claude/commands/
  for (const id of COMMAND_IDS) {
    const target = path.join(pluginLink, "commands", `${id}.md`);
    const link = path.join(commandsDir, `${id}.md`);
    const ls = lstatSafe(link);
    if (ls) fs.rmSync(link, { force: true });
    try {
      fs.symlinkSync(target, link);
    } catch {
      copyFile(path.join(PACKAGE_ROOT, "commands", `${id}.md`), link);
    }
    console.log(`  + command: /${id}`);
  }

  // Skills — symlink each skill dir into ~/.claude/skills/harness-task:<id>
  for (const id of SKILL_IDS) {
    const target = path.join(pluginLink, "skills", id);
    const link = path.join(skillsDir, `harness-task:${id}`);
    const ls = lstatSafe(link);
    if (ls) fs.rmSync(link, { recursive: true, force: true });
    try {
      fs.symlinkSync(target, link, "dir");
    } catch {
      copyDir(path.join(PACKAGE_ROOT, "skills", id), link);
    }
    console.log(`  + skill: harness-task:${id}`);
  }
}

// ── Cursor (~/.cursor) ───────────────────────────────────────────────────────
// Cursor stores skills in ~/.cursor/skills/<name>/SKILL.md
// and commands in ~/.cursor/commands/<name>.md
// Same layout as CodeBuddy — copy transformed files directly (no plugin cache).
function installCursor(cursorDir) {
  const commandsDst = path.join(cursorDir, "commands");
  const skillsDst = path.join(cursorDir, "skills");
  fs.mkdirSync(commandsDst, { recursive: true });
  fs.mkdirSync(skillsDst, { recursive: true });

  // Remove old artifacts
  for (const id of SKILL_IDS)   fs.rmSync(path.join(skillsDst, `harness-task-${id}`), { recursive: true, force: true });
  for (const id of COMMAND_IDS) fs.rmSync(path.join(commandsDst, `${id}.md`), { force: true });

  // Skills
  for (const id of SKILL_IDS) {
    const src = path.join(PACKAGE_ROOT, "skills", id, "SKILL.md");
    if (!fs.existsSync(src)) { console.warn(`  ! skill ${id}: SKILL.md not found, skipping`); continue; }
    const dst = path.join(skillsDst, `harness-task-${id}`, "SKILL.md");
    const text = transformText(fs.readFileSync(src, "utf8"), "skill", { name: `harness-task-${id}` });
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, text, "utf8");
    console.log(`  + skill: harness-task-${id}`);
  }

  // Commands
  for (const id of COMMAND_IDS) {
    const src = path.join(PACKAGE_ROOT, "commands", `${id}.md`);
    if (!fs.existsSync(src)) { console.warn(`  ! command ${id}: .md not found, skipping`); continue; }
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

// ─── CLI ─────────────────────────────────────────────────────────────────────

const USAGE = `
harness-task — install the harness-task workflow into your AI IDE

Usage:
  npx @tencent/harness-task install
  npx @tencent/harness-task install --codebuddy [--project <dir>] [--target <dir>]
  npx @tencent/harness-task install --claude [--dir <dir>]
  npx @tencent/harness-task install --cursor [--dir <dir>]

Options:
  --codebuddy          Install into CodeBuddy (~/.codebuddy by default)
  --claude             Install into Claude Code (~/.claude by default)
  --cursor             Install into Cursor (~/.cursor by default)
  --project <dir>      Project root — installs into <dir>/.codebuddy (CodeBuddy only)
  --target <dir>       Exact target .codebuddy directory (CodeBuddy only)
  --dir <dir>          Exact target directory (Claude: ~/.claude / Cursor: ~/.cursor)
  -h, --help           Show this help

When no platform flag is given, auto-detects based on which directories exist:
  ~/.codebuddy   → CodeBuddy
  ~/.claude      → Claude Code
  ~/.cursor      → Cursor
`.trim();

function parseArgs(argv) {
  const args = argv.slice(2);
  const result = {
    command: null,
    codebuddy: false,
    claude: false,
    cursor: false,
    project: null,
    target: null,
    dir: null,
  };

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
  if (fs.existsSync(path.join(home, ".codebuddy"))) detected.push("codebuddy");
  if (fs.existsSync(path.join(home, ".claude")))    detected.push("claude");
  if (fs.existsSync(path.join(home, ".cursor")))    detected.push("cursor");
  return detected;
}

function lstatSafe(p) {
  try { return fs.lstatSync(p); } catch { return null; }
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
    const claudeDir = args.dir ? path.resolve(args.dir) : path.join(home, ".claude");
    console.log(`\n[Claude Code] → ${claudeDir}`);
    installClaude(claudeDir);
    console.log(`\nDone. Restart Claude Code to load the new skills and commands.`);
    installed++;
  };

  const doCursor = () => {
    const cursorDir = args.dir ? path.resolve(args.dir) : path.join(home, ".cursor");
    console.log(`\n[Cursor] → ${cursorDir}`);
    installCursor(cursorDir);
    console.log(`\nDone. Restart Cursor to load the new skills and commands.`);
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
    }
    if (platforms.includes("codebuddy")) doCodebuddy();
    // Install Claude skills+commands AND Cursor plugin cache when ~/.claude/plugins exists
    if (platforms.includes("claude")) doClaude();
    if (platforms.includes("cursor")) doCursor();
  }

  if (installed === 0) {
    console.error("No platforms were installed. Use --codebuddy, --claude, or --cursor.");
    process.exit(1);
  }
}

// ─── entry ────────────────────────────────────────────────────────────────────

const args = parseArgs(process.argv);
if (args.command === "install") {
  runInstall(args);
}

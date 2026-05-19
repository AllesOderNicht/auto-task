#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_TARGET="$HOME/.codebuddy"
TARGET_ROOT="$DEFAULT_TARGET"

usage() {
  cat <<'EOF'
用法:
  ./sync-to-codebuddy.sh
  ./sync-to-codebuddy.sh --project /path/to/project
  ./sync-to-codebuddy.sh --target /path/to/.codebuddy

说明:
  - 默认同步到 ~/.codebuddy
  - --project 会同步到 <project>/.codebuddy
  - --target 用于指定精确的 .codebuddy 目录
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)
      [[ $# -ge 2 ]] || { echo "错误: --project 需要一个目录参数"; exit 1; }
      TARGET_ROOT="$2/.codebuddy"
      shift 2
      ;;
    --target)
      [[ $# -ge 2 ]] || { echo "错误: --target 需要一个目录参数"; exit 1; }
      TARGET_ROOT="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "错误: 未知参数 $1"
      echo ""
      usage
      exit 1
      ;;
  esac
done

COMMANDS_SRC="$SOURCE_DIR/commands"
SKILLS_SRC="$SOURCE_DIR/skills"
AGENTS_SRC="$SOURCE_DIR/agents"

COMMANDS_DST="$TARGET_ROOT/commands"
SKILLS_DST="$TARGET_ROOT/skills"
AGENTS_DST="$TARGET_ROOT/agents"

if [[ ! -d "$COMMANDS_SRC" || ! -d "$SKILLS_SRC" || ! -d "$AGENTS_SRC" ]]; then
  echo "错误: harness-task 源目录不完整，未找到 commands/skills/agents"
  exit 1
fi

mkdir -p "$COMMANDS_DST" "$SKILLS_DST" "$AGENTS_DST"

COMMAND_IDS=(
  "alles-dev"
  "alles-bugfix"
  "alles-list-changes"
  "alles-archive"
  "alles-details"
  "alles-check"
  "review"
)

SKILL_IDS=(
  "archive"
  "bugfix"
  "check"
  "dev"
  "executing"
  "list-changes"
  "phase-review"
  "project-details"
  "refining-orchestrator"
  "review"
  "tdd"
  "using-harness-task"
)

AGENT_IDS=(
  "analysis-agent"
  "proposal-agent"
  "phase-reviewer"
  "bug-investigator"
)

command_description() {
  case "$1" in
    "alles-dev") echo "启动或恢复一个开发变更" ;;
    "alles-bugfix") echo "对当前开发变更执行 bugfix 流程" ;;
    "alles-list-changes") echo "查看所有开发变更及其状态" ;;
    "alles-archive") echo "归档已完成的开发变更" ;;
    "alles-details") echo "从归档变更生成项目级注意事项" ;;
    "alles-check") echo "执行预执行规划评审，从三个维度检查方案" ;;
    "review") echo "对开发变更执行结构化代码审查" ;;
    *) echo "执行 harness-task 工作流命令" ;;
  esac
}

command_argument_hint() {
  case "$1" in
    "alles-dev") echo "[branch-name]" ;;
    "alles-bugfix") echo "[bug symptoms]" ;;
    "alles-check") echo "[branch-name]" ;;
    "review") echo "[branch-name]" ;;
    *) echo "" ;;
  esac
}

python_transform() {
  python3 - "$@" <<'PY'
from pathlib import Path
import sys

mode = sys.argv[1]
src = Path(sys.argv[2])
dest = Path(sys.argv[3])
text = src.read_text(encoding="utf-8")

skill_ids = [
    "archive",
    "bugfix",
    "check",
    "dev",
    "executing",
    "list-changes",
    "phase-review",
    "project-details",
    "refining-orchestrator",
    "review",
    "tdd",
    "using-harness-task",
]

agent_ids = [
    "analysis-agent",
    "proposal-agent",
    "phase-reviewer",
    "bug-investigator",
]

for skill_id in skill_ids:
    text = text.replace(f"harness-task:{skill_id}", f"harness-task-{skill_id}")

for agent_id in agent_ids:
    text = text.replace(agent_id, f"harness-task-{agent_id}")

def split_frontmatter(raw: str):
    if not raw.startswith("---\n"):
        return None, raw
    end = raw.find("\n---\n", 4)
    if end == -1:
        return None, raw
    return raw[4:end], raw[end + 5:]

def dump_frontmatter(lines):
    return "---\n" + "\n".join(lines) + "\n---\n"

def quote_yaml(value: str) -> str:
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'

if mode == "skill":
    new_name = sys.argv[4]
    frontmatter, body = split_frontmatter(text)
    lines = [] if frontmatter is None else frontmatter.splitlines()
    updated = []
    replaced = False
    for line in lines:
        if line.startswith("name:"):
            updated.append(f"name: {new_name}")
            replaced = True
        else:
            updated.append(line)
    if not replaced:
      updated.insert(0, f"name: {new_name}")
    text = dump_frontmatter(updated) + body.lstrip("\n")

elif mode == "agent":
    new_name = sys.argv[4]
    frontmatter, body = split_frontmatter(text)
    lines = [] if frontmatter is None else frontmatter.splitlines()
    updated = []
    replaced = False
    for line in lines:
        if line.startswith("name:"):
            updated.append(f"name: {new_name}")
            replaced = True
        else:
            updated.append(line)
    if not replaced:
        updated.insert(0, f"name: {new_name}")
    text = dump_frontmatter(updated) + body.lstrip("\n")

elif mode == "command":
    description = sys.argv[4]
    argument_hint = sys.argv[5]
    frontmatter_lines = [
        f"description: {quote_yaml(description)}",
        "disable-model-invocation: true",
    ]
    if argument_hint:
        frontmatter_lines.append(f"argument-hint: {quote_yaml(argument_hint)}")
    text = dump_frontmatter(frontmatter_lines) + "\n" + text.rstrip() + "\n"

else:
    raise SystemExit(f"Unknown transform mode: {mode}")

dest.parent.mkdir(parents=True, exist_ok=True)
dest.write_text(text, encoding="utf-8")
PY
}

echo "同步源目录: $SOURCE_DIR"
echo "目标目录:   $TARGET_ROOT"
echo ""

echo ">>> 清理旧的 harness-task CodeBuddy 产物..."
for skill_id in "${SKILL_IDS[@]}"; do
  rm -rf "$SKILLS_DST/harness-task-$skill_id"
done

for agent_id in "${AGENT_IDS[@]}"; do
  rm -f "$AGENTS_DST/harness-task-$agent_id.md"
done

for command_id in "${COMMAND_IDS[@]}"; do
  rm -f "$COMMANDS_DST/$command_id.md"
done
echo "    完成"

echo ">>> 同步 skills..."
for skill_id in "${SKILL_IDS[@]}"; do
  src="$SKILLS_SRC/$skill_id/SKILL.md"
  dst="$SKILLS_DST/harness-task-$skill_id/SKILL.md"
  if [[ ! -f "$src" ]]; then
    echo "错误: 未找到 $src"
    exit 1
  fi
  python_transform skill "$src" "$dst" "harness-task-$skill_id"
  echo "    harness-task-$skill_id"
done

echo ">>> 同步 agents..."
for agent_id in "${AGENT_IDS[@]}"; do
  src="$AGENTS_SRC/$agent_id.md"
  dst="$AGENTS_DST/harness-task-$agent_id.md"
  if [[ ! -f "$src" ]]; then
    echo "错误: 未找到 $src"
    exit 1
  fi
  python_transform agent "$src" "$dst" "harness-task-$agent_id"
  echo "    harness-task-$agent_id"
done

echo ">>> 生成 CodeBuddy slash commands..."
for command_id in "${COMMAND_IDS[@]}"; do
  src="$COMMANDS_SRC/$command_id.md"
  dst="$COMMANDS_DST/$command_id.md"
  if [[ ! -f "$src" ]]; then
    echo "错误: 未找到 $src"
    exit 1
  fi
  python_transform command \
    "$src" \
    "$dst" \
    "$(command_description "$command_id")" \
    "$(command_argument_hint "$command_id")"
  echo "    /$command_id"
done

echo ""
echo "同步完成。"
echo "现在可以在 CodeBuddy 中使用这些命令："
for command_id in "${COMMAND_IDS[@]}"; do
  echo "  /$command_id"
done
echo ""
echo "如果 CodeBuddy 已经在运行，执行 /reload-plugins 或重开一个会话后再试。"

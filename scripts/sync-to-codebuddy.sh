#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ── 默认值 ────────────────────────────────────────────────────────
TARGET_ROOT=""              # 由 --target 或 --project 显式指定；不自动追加子目录
TARGET_KIND=""              # 空时根据 TARGET_ROOT 自动推导；兼容旧 --client 覆盖
PLUGIN_NAME="harness-task"
MARKETPLACE_KEY="local-harness-task"
PLUGIN_KEY="${PLUGIN_NAME}@${MARKETPLACE_KEY}"

usage() {
  cat <<'EOF'
用法:
  ./sync-to-codebuddy.sh [--target DIR] [--project DIR]

参数:
  --target   直接指定目标根目录（精确路径，不自动追加 .codebuddy/.claude）
  --project  兼容旧参数；等同于 --target DIR
  -h|--help  显示此帮助

示例:
  # 同步到 ~/.codebuddy（默认）
  ./sync-to-codebuddy.sh

  # 同步到指定的 CodeBuddy 目录
  ./sync-to-codebuddy.sh --target /path/to/.codebuddy

  # 同步到指定的 Claude/Cursor 插件目录
  ./sync-to-codebuddy.sh --target /path/to/.claude
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --client)
      # 兼容旧调用；新用法不再需要 --client。
      [[ $# -ge 2 ]] || { echo "错误: --client 需要一个参数 (codebuddy|cursor|claude)"; exit 1; }
      case "$2" in
        codebuddy) TARGET_KIND="codebuddy" ;;
        cursor|claude) TARGET_KIND="claude" ;;
        *) echo "错误: --client 的值必须是 codebuddy、cursor 或 claude，当前: $2"; exit 1 ;;
      esac
      shift 2
      ;;
    --project)
      [[ $# -ge 2 ]] || { echo "错误: --project 需要一个目录参数"; exit 1; }
      TARGET_ROOT="$2"
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

# ── 使用精确目标目录，不再根据 client 追加 .codebuddy/.claude ───────
if [[ -z "$TARGET_ROOT" ]]; then
  TARGET_ROOT="$HOME/.codebuddy"
fi

case "$TARGET_ROOT" in
  "~") TARGET_ROOT="$HOME" ;;
  "~/"*) TARGET_ROOT="$HOME/${TARGET_ROOT#~/}" ;;
esac

if [[ "$TARGET_ROOT" != /* ]]; then
  TARGET_ROOT="$(pwd)/$TARGET_ROOT"
fi

if [[ -z "$TARGET_KIND" ]]; then
  target_base="$(basename "$TARGET_ROOT")"
  if [[ "$target_base" == ".claude" || -f "$TARGET_ROOT/plugins/installed_plugins.json" ]]; then
    TARGET_KIND="claude"
  else
    TARGET_KIND="codebuddy"
  fi
fi

# ════════════════════════════════════════════════════════════════════
#  CODEBUDDY 模式：转换 skills / agents / commands 到目标目录
# ════════════════════════════════════════════════════════════════════
if [[ "$TARGET_KIND" == "codebuddy" ]]; then

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

  echo "客户端:     CodeBuddy"
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

# ════════════════════════════════════════════════════════════════════
#  CURSOR / CLAUDE 模式：rsync 整个项目到插件缓存，更新 installed_plugins.json
# ════════════════════════════════════════════════════════════════════
else

  INSTALLED_JSON="$TARGET_ROOT/plugins/installed_plugins.json"
  CACHE_BASE="$TARGET_ROOT/plugins/cache/$MARKETPLACE_KEY/$PLUGIN_NAME"

  # 选取 plugin.json 并校验版本一致性
  CURSOR_PLUGIN_JSON="$SOURCE_DIR/.cursor-plugin/plugin.json"
  CLAUDE_PLUGIN_JSON="$SOURCE_DIR/.claude-plugin/plugin.json"

  if [[ ! -f "$CURSOR_PLUGIN_JSON" && ! -f "$CLAUDE_PLUGIN_JSON" ]]; then
    echo "错误: 未找到 .cursor-plugin/plugin.json 或 .claude-plugin/plugin.json"
    exit 1
  fi

  if [[ -f "$CURSOR_PLUGIN_JSON" ]]; then
    PLUGIN_JSON="$CURSOR_PLUGIN_JSON"
  else
    PLUGIN_JSON="$CLAUDE_PLUGIN_JSON"
  fi

  NEW_VERSION=$(python3 -c "import json; print(json.load(open('$PLUGIN_JSON'))['version'])")

  if [[ -f "$CURSOR_PLUGIN_JSON" && -f "$CLAUDE_PLUGIN_JSON" ]]; then
    CLAUDE_VERSION=$(python3 -c "import json; print(json.load(open('$CLAUDE_PLUGIN_JSON'))['version'])")
    CURSOR_VERSION=$(python3 -c "import json; print(json.load(open('$CURSOR_PLUGIN_JSON'))['version'])")
    if [[ "$CLAUDE_VERSION" != "$CURSOR_VERSION" ]]; then
      echo "错误: .claude-plugin/plugin.json 和 .cursor-plugin/plugin.json 的 version 不一致"
      echo "  Claude: $CLAUDE_VERSION"
      echo "  Cursor: $CURSOR_VERSION"
      exit 1
    fi
  fi

  echo "目标类型: $TARGET_KIND"
  echo "源码版本: $NEW_VERSION"
  echo "源码路径: $SOURCE_DIR"
  echo "目标目录: $TARGET_ROOT"
  echo "缓存路径: $CACHE_BASE/$NEW_VERSION"
  echo ""

  # 1. 同步文件到缓存
  echo ">>> 同步文件到缓存..."
  mkdir -p "$CACHE_BASE/$NEW_VERSION"
  rsync -a --delete \
    --exclude='.git' \
    "$SOURCE_DIR/" "$CACHE_BASE/$NEW_VERSION/"
  echo "    完成"

  # 2. 清理其他版本的缓存
  for dir in "$CACHE_BASE"/*/; do
    dir_version=$(basename "$dir")
    if [[ "$dir_version" != "$NEW_VERSION" ]]; then
      echo ">>> 清理旧版本缓存: $dir_version"
      rm -rf "$dir"
    fi
  done

  # 3. 更新 installed_plugins.json
  if [[ ! -f "$INSTALLED_JSON" ]]; then
    echo "错误: 未找到 $INSTALLED_JSON"
    exit 1
  fi

  echo ">>> 更新 installed_plugins.json..."
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

  python3 -c "
import json, sys

path = '$INSTALLED_JSON'
key = '$PLUGIN_KEY'
new_version = '$NEW_VERSION'
install_path = '$CACHE_BASE/$NEW_VERSION'
timestamp = '$TIMESTAMP'

with open(path) as f:
    data = json.load(f)

if key not in data.get('plugins', {}):
    print(f'警告: 插件 {key} 未在 installed_plugins.json 中找到，跳过更新')
    sys.exit(0)

entry = data['plugins'][key][0]
entry['installPath'] = install_path
entry['version'] = new_version
entry['lastUpdated'] = timestamp

with open(path, 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')

print(f'    版本更新为 {new_version}')
"

  echo ""
  echo "同步完成! 请重新打开 Cursor/Claude 窗口，或至少新建一个对话以加载最新版本。"

fi

#!/bin/bash
# sync-to-claude-internal.sh — 一键同步 harness-task 到 ~/.claude-internal
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CLAUDE_DIR="$HOME/.claude-internal"
COMMANDS_DIR="$CLAUDE_DIR/commands"
SKILLS_DIR="$CLAUDE_DIR/skills"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

added=0
removed=0
skipped=0

log_add()  { echo -e "  ${GREEN}+ $1${NC}"; added=$((added + 1)); }
log_rm()   { echo -e "  ${RED}- $1${NC}"; removed=$((removed + 1)); }
log_skip() { echo -e "  ${YELLOW}~ $1${NC} (已存在)"; skipped=$((skipped + 1)); }

if [ ! -d "$SOURCE_DIR" ]; then
  echo -e "${RED}错误: 未找到 $SOURCE_DIR${NC}"
  exit 1
fi

mkdir -p "$COMMANDS_DIR" "$SKILLS_DIR"

echo -e "${CYAN}=== 同步 harness-task → ~/.claude-internal ===${NC}"
echo ""

# ── 1. 确保 harness-task 主链接存在 ─────────────────────────────
PLUGIN_LINK="$CLAUDE_DIR/harness-task"
if [ -L "$PLUGIN_LINK" ]; then
  current_target="$(readlink "$PLUGIN_LINK")"
  if [ "$current_target" != "$SOURCE_DIR" ]; then
    rm "$PLUGIN_LINK"
    ln -s "$SOURCE_DIR" "$PLUGIN_LINK"
    echo -e "${YELLOW}更新主链接: $current_target → $SOURCE_DIR${NC}"
  fi
elif [ ! -e "$PLUGIN_LINK" ]; then
  ln -s "$SOURCE_DIR" "$PLUGIN_LINK"
  echo -e "${GREEN}创建主链接: $PLUGIN_LINK → $SOURCE_DIR${NC}"
fi
echo ""

# ── 2. 同步 Commands ──────────────────────────────────────────
echo -e "${CYAN}[Commands]${NC}"

for cmd_file in "$SOURCE_DIR"/commands/*.md; do
  [ -f "$cmd_file" ] || continue
  name="$(basename "$cmd_file")"
  link="$COMMANDS_DIR/$name"
  target="$PLUGIN_LINK/commands/$name"

  if [ -L "$link" ]; then
    log_skip "$name"
  else
    [ -e "$link" ] && rm "$link"
    ln -s "$target" "$link"
    log_add "$name"
  fi
done

# 清理失效的 commands 链接（仅清理指向 harness-task 的）
for link in "$COMMANDS_DIR"/*; do
  [ -L "$link" ] || continue
  link_target="$(readlink "$link")"
  echo "$link_target" | grep -q "harness-task" || continue
  if [ ! -e "$link" ]; then
    name="$(basename "$link")"
    rm "$link"
    log_rm "$name (失效链接)"
  fi
done
echo ""

# ── 3. 同步 Skills ───────────────────────────────────────────
echo -e "${CYAN}[Skills]${NC}"

for skill_dir in "$SOURCE_DIR"/skills/*/; do
  [ -d "$skill_dir" ] || continue
  skill_name="$(basename "$skill_dir")"
  link="$SKILLS_DIR/harness-task:$skill_name"
  target="$PLUGIN_LINK/skills/$skill_name"

  if [ -L "$link" ]; then
    log_skip "harness-task:$skill_name"
  else
    [ -e "$link" ] && rm -rf "$link"
    ln -s "$target" "$link"
    log_add "harness-task:$skill_name"
  fi
done

# 清理失效的 skills 链接（仅清理 harness-task: 前缀的）
for link in "$SKILLS_DIR"/harness-task:*; do
  [ -L "$link" ] || continue
  if [ ! -e "$link" ]; then
    name="$(basename "$link")"
    rm "$link"
    log_rm "$name (失效链接)"
  fi
done
echo ""

# ── 4. 汇总 ─────────────────────────────────────────────────
echo -e "${CYAN}=== 完成 ===${NC}"
echo -e "  新增: ${GREEN}$added${NC}  移除: ${RED}$removed${NC}  已存在: ${YELLOW}$skipped${NC}"

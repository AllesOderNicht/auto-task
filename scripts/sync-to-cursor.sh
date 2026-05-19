#!/usr/bin/env bash
# 用法: bash scripts/sync-to-cursor.sh
# 在项目根目录执行，将插件源码同步到 Cursor/Claude 插件缓存目录，并更新 installed_plugins.json。
# 同步完成后，重新打开 Cursor/Claude 窗口（或新建对话）以加载最新版本。
set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PLUGIN_NAME="harness-task"
MARKETPLACE_KEY="local-harness-task"
PLUGIN_KEY="${PLUGIN_NAME}@${MARKETPLACE_KEY}"

CLAUDE_DIR="$HOME/.claude"
INSTALLED_JSON="$CLAUDE_DIR/plugins/installed_plugins.json"
CACHE_BASE="$CLAUDE_DIR/plugins/cache/$MARKETPLACE_KEY/$PLUGIN_NAME"

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
echo "源码版本: $NEW_VERSION"
echo "源码路径: $SOURCE_DIR"
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

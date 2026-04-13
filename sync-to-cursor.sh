#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_NAME="harness-task"
MARKETPLACE_KEY="local-harness-task"
PLUGIN_KEY="${PLUGIN_NAME}@${MARKETPLACE_KEY}"

CLAUDE_DIR="$HOME/.claude"
INSTALLED_JSON="$CLAUDE_DIR/plugins/installed_plugins.json"
CACHE_BASE="$CLAUDE_DIR/plugins/cache/$MARKETPLACE_KEY/$PLUGIN_NAME"

PLUGIN_JSON="$SOURCE_DIR/.claude-plugin/plugin.json"
if [[ ! -f "$PLUGIN_JSON" ]]; then
  echo "错误: 未找到 $PLUGIN_JSON"
  exit 1
fi

NEW_VERSION=$(python3 -c "import json; print(json.load(open('$PLUGIN_JSON'))['version'])")
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
echo "同步完成! 请重新打开 Cursor 窗口或新建对话以加载最新版本。"

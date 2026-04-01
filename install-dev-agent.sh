#!/bin/bash
# install-dev-agent.sh — 一键安装 Dev Agent 到 ~/.claude-internal
#
# 用法（任选一种）:
#   git clone https://git.woa.com/dragonyao/auto-agent.git /tmp/auto-agent && bash /tmp/auto-agent/install-dev-agent.sh
#   curl -sL https://git.woa.com/dragonyao/auto-agent/raw/master/install-dev-agent.sh | bash
#
set -e

CLAUDE_DIR="$HOME/.claude-internal"
HOOKS_DIR="$CLAUDE_DIR/hooks"
COMMANDS_DIR="$CLAUDE_DIR/commands"
SKILLS_DIR="$CLAUDE_DIR/skills"

echo "=== 安装 Dev Agent for Claude Code Internal ==="
echo ""

# 创建目录
mkdir -p "$HOOKS_DIR" "$COMMANDS_DIR" "$SKILLS_DIR/init-dev" "$SKILLS_DIR/dev" "$SKILLS_DIR/list-tasks" "$SKILLS_DIR/archive-task"

##############################################################################
# Hook: dev-inject-context.sh
##############################################################################
cat > "$HOOKS_DIR/dev-inject-context.sh" << 'HOOKEOF'
#!/bin/bash
# dev-inject-context.sh — 会话启动/恢复时注入 dev agent 上下文
# 全局 hook，自动适配任何项目
#
# L2 滑动窗口策略：
#   已完成 Milestone → 压缩为每 todo 一行的摘要
#   当前 Milestone   → 展开完整 detail-plan
#   未来 Milestone   → 只显示标题 + todo 数量

DEV_TASKS_DIR="$CLAUDE_PROJECT_DIR/.dev-tasks"

[ -d "$DEV_TASKS_DIR" ] || exit 0

found=0
for status_file in "$DEV_TASKS_DIR"/*/status.json; do
  [ -f "$status_file" ] || continue
  stage=$(jq -r '.stage' "$status_file")

  case "$stage" in
    done) continue ;;
  esac

  task_dir="$(dirname "$status_file")"
  task=$(jq -r '.task' "$status_file")
  current_ms=$(jq -r '.current_milestone' "$status_file")
  total_ms=$(jq -r '.total_milestones' "$status_file")
  worktree=$(jq -r '.worktree_path // empty' "$status_file")
  branch=$(jq -r '.branch // empty' "$status_file")
  use_worktree=$(jq -r '.use_worktree // false' "$status_file")
  block_reason=$(jq -r '.block_reason // empty' "$status_file")

  echo "=== Dev Agent 任务进度 ==="
  echo "任务: $task"
  echo "阶段: $stage"
  echo "Milestone 进度: $current_ms / $total_ms"
  if [ "$use_worktree" = "true" ] && [ -n "$worktree" ] && [ "$worktree" != "null" ]; then
    echo "模式: Worktree 隔离"
    echo "Worktree: $worktree"
    echo "分支: $branch"
  elif [ -n "$branch" ] && [ "$branch" != "null" ]; then
    echo "模式: Feature Branch"
    echo "分支: $branch"
  fi
  if [ -n "$block_reason" ]; then
    echo "阻塞原因: $block_reason"
  fi
  echo ""

  contract_file="$task_dir/contract.md"
  if [ -f "$contract_file" ]; then
    echo "--- 任务契约 ---"
    cat "$contract_file"
    echo ""
  fi

  ms_count=$(jq '.milestones | length' "$status_file")
  exec_log="$task_dir/execution-log.md"

  if [ "$ms_count" -gt 0 ]; then
    echo "--- 执行状态（滑动窗口） ---"
    echo ""

    for i in $(seq 0 $((ms_count - 1))); do
      ms_id=$(jq -r ".milestones[$i].id" "$status_file")
      ms_title=$(jq -r ".milestones[$i].title" "$status_file")
      ms_status=$(jq -r ".milestones[$i].status" "$status_file")
      ms_total_todos=$(jq -r ".milestones[$i].total_todos" "$status_file")
      ms_completed_count=$(jq ".milestones[$i].completed_todos | length" "$status_file")

      if [ "$ms_status" = "done" ]; then
        echo "### Milestone $ms_id: $ms_title [已完成]"
        if [ -f "$exec_log" ]; then
          grep -E "^## Milestone $ms_id - Todo [0-9]+:" "$exec_log" | sed 's/^## /  - /' || true
        fi
        if [ ! -f "$exec_log" ] || ! grep -qE "^## Milestone $ms_id - Todo" "$exec_log" 2>/dev/null; then
          echo "  完成 $ms_completed_count/$ms_total_todos 个 todo"
        fi
        echo ""

      elif [ "$ms_id" = "$current_ms" ]; then
        echo "### Milestone $ms_id: $ms_title [当前 — 进度 $ms_completed_count/$ms_total_todos]"
        echo ""
        detail_file="$task_dir/milestones/$ms_id/detail-plan.md"
        if [ -f "$detail_file" ]; then
          cat "$detail_file"
          echo ""
        fi
        if [ "$ms_completed_count" -gt 0 ] && [ -f "$exec_log" ]; then
          completed_lines=$(grep -E "^## Milestone $ms_id - Todo [0-9]+:" "$exec_log" 2>/dev/null || true)
          if [ -n "$completed_lines" ]; then
            echo "已完成的 todo 摘要："
            echo "$completed_lines" | sed 's/^## /  - /'
            echo ""
          fi
        fi

      else
        if [ "$ms_total_todos" -gt 0 ]; then
          echo "### Milestone $ms_id: $ms_title [待开始 — $ms_total_todos 个 todo]"
        else
          echo "### Milestone $ms_id: $ms_title [待开始 — 待规划]"
        fi
        echo ""
      fi
    done
  else
    outline_file="$task_dir/outline.md"
    if [ -f "$outline_file" ]; then
      echo "--- 大纲 ---"
      cat "$outline_file"
      echo ""
    fi
  fi

  found=1
done

if [ "$found" -eq 0 ]; then
  echo "当前无进行中的 Dev Agent 任务。"
fi

exit 0
HOOKEOF
chmod +x "$HOOKS_DIR/dev-inject-context.sh"

##############################################################################
# Hook: dev-guard-commit-msg.sh
##############################################################################
cat > "$HOOKS_DIR/dev-guard-commit-msg.sh" << 'HOOKEOF'
#!/bin/bash
# dev-guard-commit-msg.sh — commit message 规范校验

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
[ -z "$CMD" ] && exit 0

echo "$CMD" | grep -q 'git commit' || exit 0
echo "$CMD" | grep -q '\-\-amend' && exit 0

if ! echo "$CMD" | grep -qE '(feat|fix|refactor|chore|docs|style|perf|test)(\(.+\))?:\s'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "commit message 必须以 feat:/fix:/refactor:/chore:/docs:/style:/perf:/test: 开头。格式：feat(scope): {描述} [{task-name}] 或 fix: {描述} [TAPD-{bug_id}]"
    }
  }'
  exit 0
fi

if ! echo "$CMD" | grep -qE '\[.+\]'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "commit message 必须包含任务标识符 [{task-name}] 或 [TAPD-{bug_id}]。"
    }
  }'
  exit 0
fi

exit 0
HOOKEOF
chmod +x "$HOOKS_DIR/dev-guard-commit-msg.sh"

##############################################################################
# Hook: dev-guard-worktree.sh（可选，仅 --worktree 模式时由 init-dev 注册）
##############################################################################
cat > "$HOOKS_DIR/dev-guard-worktree.sh" << 'HOOKEOF'
#!/bin/bash
# dev-guard-worktree.sh — 强制 worktree 隔离（仅在启用 worktree 模式时生效）
# 注意：此 hook 默认不注册，仅当用户在 init-dev 时选择 worktree 模式才会启用

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
[ -z "$CMD" ] && exit 0

MAIN_REPO="$CLAUDE_PROJECT_DIR"
PROJECT_NAME=$(basename "$MAIN_REPO")
WORKTREE_DIR="$(dirname "$MAIN_REPO")/${PROJECT_NAME}-worktrees"

if echo "$CMD" | grep -q "$MAIN_REPO" && ! echo "$CMD" | grep -q "$WORKTREE_DIR"; then
  if echo "$CMD" | grep -qE 'git\s+(fetch|worktree|pull|branch|remote|log|status|diff)'; then
    exit 0
  fi
  if echo "$CMD" | grep -qE '^\s*(ls|cat|head|tail|find|grep|tree|wc|file)\s'; then
    exit 0
  fi
  if echo "$CMD" | grep -qE '^\s*(pnpm|npm|yarn)\s+(list|ls|why|outdated)'; then
    exit 0
  fi
  if echo "$CMD" | grep -qE '^\s*turbo\s+(ls|query)'; then
    exit 0
  fi
  if echo "$CMD" | grep -qE '\.dev-tasks/'; then
    exit 0
  fi
  if echo "$CMD" | grep -qE '\.history-tasks/'; then
    exit 0
  fi
  if echo "$CMD" | grep -qE 'personal-docs/'; then
    exit 0
  fi
  jq -n --arg repo "$MAIN_REPO" --arg wt "$WORKTREE_DIR" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: ("禁止在主仓库 " + $repo + " 修改代码。请在 worktree 目录 " + $wt + "/{task-name}/ 中操作。")
    }
  }'
  exit 0
fi

exit 0
HOOKEOF
chmod +x "$HOOKS_DIR/dev-guard-worktree.sh"

##############################################################################
# Skill: init-dev/SKILL.md
##############################################################################
cat > "$SKILLS_DIR/init-dev/SKILL.md" << 'SKILLEOF'
---
description: 在当前项目中初始化 Dev Agent 开发流程，创建 .dev-tasks 目录和 settings.local.json 配置。当用户想要初始化开发环境、设置 Dev Agent 时使用。
user-invocable: true
---

# 初始化 Dev Agent 工作流

在当前项目中初始化 Dev Agent 开发流程，创建必要的配置文件和目录。

## 执行流程

### 1. 检查是否已初始化

检查当前项目是否已有 `.claude/settings.local.json` 和 `.dev-tasks/` 目录。

如果已存在 `.dev-tasks/`，提示用户该项目已初始化过 Dev Agent，询问是否要重新生成配置。

### 2. 创建 .dev-tasks 目录

```bash
mkdir -p .dev-tasks
```

### 3. 添加 .gitignore 条目

检查项目根目录的 `.gitignore`，确保以下条目存在（如果不存在则追加）：

```
.dev-tasks/
.history-tasks/
```

### 4. 生成 .claude/settings.local.json

创建（或合并到） `.claude/settings.local.json`，内容如下。

**注意**：如果文件已存在，需要智能合并 — 保留已有的 permissions 和 hooks，只追加 Dev Agent 相关的配置，不要覆盖已有内容。

```json
{
  "permissions": {
    "allow": [
      "Bash(*)",
      "Read(*)",
      "Write(*)",
      "Edit(*)",
      "Glob(*)",
      "Grep(*)",
      "WebFetch(*)",
      "WebSearch(*)",
      "Skill(*)",
      "Task(*)",
      "mcp__*"
    ],
    "deny": [
      "Bash(git push --force:*)",
      "Bash(git push -f:*)",
      "Bash(git reset --hard:*)",
      "Bash(git clean -f:*)",
      "Bash(git checkout .:*)",
      "Bash(git restore .:*)",
      "Bash(git branch -D:*)",
      "Bash(rm -rf /:*)",
      "Bash(rm -rf ~:*)",
      "Bash(rm -rf /*:*)",
      "Bash(sudo:*)"
    ]
  },
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude-internal/hooks/dev-inject-context.sh",
            "statusMessage": "正在加载 Dev Agent 上下文..."
          }
        ]
      },
      {
        "matcher": "compact",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude-internal/hooks/dev-inject-context.sh",
            "statusMessage": "压缩后恢复 Dev Agent 进度..."
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude-internal/hooks/dev-guard-commit-msg.sh",
            "statusMessage": "检查 commit message 规范..."
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | grep -qE '\\.(ts|tsx|js|jsx)$' && echo '提醒：修改了代码文件，完成当前 todo 后请先运行编译验证再 commit' || exit 0"
          }
        ]
      }
    ]
  }
}
```

**如果用户在 init-dev 时指定了 `--worktree` 参数**，则额外在 `PreToolUse` 的 `Bash` hooks 数组中追加：

```json
{
  "type": "command",
  "command": "~/.claude-internal/hooks/dev-guard-worktree.sh",
  "statusMessage": "检查 worktree 隔离..."
}
```

### 5. 输出结果

告诉用户：
- Dev Agent 已在当前项目初始化
- 已创建 `.dev-tasks/` 目录
- 已生成 `.claude/settings.local.json`（含 commit 规范校验、上下文注入 hooks）
- 默认模式：直接在项目中使用 feature branch 开发
- 如需 worktree 隔离模式，可运行 `/init-dev --worktree` 启用
- 用法：在 `.dev-tasks/{task-name}/` 下创建 `README.md` 描述需求，然后运行 `/dev {task-name}`
SKILLEOF

##############################################################################
# Skill: dev/SKILL.md
##############################################################################
cat > "$SKILLS_DIR/dev/SKILL.md" << 'SKILLEOF'
---
description: AI 驱动的自主开发助手。读取 .dev-tasks 下的需求，与用户研讨、规划、自主开发直到任务完成。支持断点续跑。当用户想要启动或继续一个开发任务时使用。
user-invocable: true
---

# Dev Agent — AI 驱动的自主开发助手

你是一个自主开发助手。用户通过 `/dev {task-name}` 启动你，你需要读取需求、与用户研讨、规划、自主开发，直到任务完成。

## 环境变量

以下路径由环境自动推断，无需硬编码：

- **项目根目录**: `$CLAUDE_PROJECT_DIR`
- **Worktree 根目录**（仅 worktree 模式）: `$CLAUDE_PROJECT_DIR` 的同级目录，名为 `{项目文件夹名}-worktrees`
  - 例如 `~/code/my-app` 对应 `~/code/my-app-worktrees`

## 工作模式

Dev Agent 支持两种工作模式：

### 默认模式（Feature Branch）
- 直接在当前项目目录中创建 feature branch 进行开发
- 分支命名：`dev/{task-name}`
- 适合大多数场景，简单直接

### Worktree 模式（需用户指定）
- 仅当用户在 `/dev {task-name} --worktree` 中显式指定 `--worktree` 时启用
- 在项目同级目录创建独立的 git worktree 进行隔离开发
- 适合需要同时在主仓库工作、或多任务并行的场景

## 任务参数

- **task-name**: $ARGUMENTS（`.dev-tasks/` 下的文件夹名）
- **任务目录**: `.dev-tasks/$ARGUMENTS/`

## 启动流程

### 第一步：检查任务是否存在

读取 `.dev-tasks/$ARGUMENTS/` 目录。如果目录不存在或没有 `README.md`，提示用户先创建需求文件。

### 第二步：检查是否断点续跑

读取 `.dev-tasks/$ARGUMENTS/status.json`：
- 如果存在且 `stage` 不是 `done`，这是断点续跑，跳到对应阶段继续
- 如果不存在或 `stage` 是 `done`，这是新任务，从研讨环节开始

### 第三步：根据当前 stage 执行

根据 `status.json` 中的 `stage` 字段决定下一步操作，参照下方各阶段说明执行。

---

## 阶段说明

### 1. discussing（研讨环节）

**目标**：深入理解需求，产出任务契约。

**操作**：
1. 读取 `.dev-tasks/$ARGUMENTS/` 下所有文件（README.md、截图、参考材料等）
2. 认真分析需求，然后**主动向用户提问**，澄清以下方面：
   - 功能边界：哪些是必须做的，哪些是不做的
   - 交互细节：用户操作流程、边界情况处理
   - 技术约束：有无特定的实现要求或限制
   - 验收标准：怎样算做完了
3. 可以进行多轮对话，直到你和用户都认为需求足够清晰
4. 确认以下 Git 配置（如果无法从项目推断，询问用户）：
   - 基准分支（默认 `main`）
   - 编译验证命令（从 package.json scripts 或项目构建系统推断）
5. 将研讨结果写入 `.dev-tasks/$ARGUMENTS/contract.md`
6. 创建 `status.json`
7. 研讨完成后，告诉用户你将生成大纲，然后进入大纲生成。

### 2. outlined（生成并确认大纲）

**目标**：将需求拆分为 Milestone，获得用户确认。

**操作**：
1. 基于 contract.md 生成 Outline，每个 Milestone 包含：标题、目标、验证标准
2. Milestone 划分原则：可独立验证、低耦合、从基础到上层
3. 不要在大纲中包含具体的文件名或实现细节
4. 将大纲展示给用户，请用户确认或调整
5. 用户确认后写入 outline.md，更新 status.json
6. 根据工作模式：
   - **默认模式**：基于基准分支创建 `dev/{task-name}` 分支，切换到该分支
   - **Worktree 模式**（`--worktree`）：创建 Worktree、安装依赖、拷贝环境文件
7. 自动进入第一个 Milestone 的 detailing 阶段

### 3. detailing（生成 Detail Plan）

为当前 Milestone 生成具体的执行计划，写入 detail-plan.md。

### 4. confirming（等待用户确认 Detail Plan）

展示 Detail Plan，获得用户确认后进入执行。

### 5. executing（自主执行）

按 Detail Plan 逐个完成 todo，每个 todo 完成后编译验证并 commit。

**Commit 格式**：`feat: {简要描述} [$ARGUMENTS]`

### 6. verifying（等待用户验证）

展示修改摘要，等待用户验证通过。

### 7. 全部完成

置信度自评，>= 7 则推送远程分支，< 7 则阻塞等待人工介入。

---

## 关键规则

1. **默认模式下在项目目录的 feature branch 中操作；worktree 模式下在 worktree 目录内操作**
2. **每个 stage 变更必须立即写入 status.json**
3. **编译以 todo 为单位**
4. **不得自行修改大纲**
5. **execution-log.md 记录每步操作**
6. **Git 安全**：不得 force push、不得对基准分支 push

---

## 断点续跑指南

| stage | 恢复操作 |
|-------|----------|
| `discussing` | 读取已有的 contract.md，继续研讨 |
| `outlined` | 进入第一个未完成 Milestone 的 detailing |
| `detailing` | 读取 detail-plan.md，继续完善或展示给用户 |
| `confirming` | 展示 detail-plan.md，请用户确认 |
| `executing` | 从下一个未完成的 todo 继续执行 |
| `verifying` | 告诉用户当前 Milestone 已完成，请验证 |
| `blocked` | 告诉用户阻塞原因，请求协助 |
| `done` | 告诉用户任务已完成 |
SKILLEOF

##############################################################################
# Skill: list-tasks/SKILL.md
##############################################################################
cat > "$SKILLS_DIR/list-tasks/SKILL.md" << 'SKILLEOF'
---
description: 扫描 .dev-tasks 目录，列出所有开发任务及其状态。当用户想要查看当前开发任务列表、任务进度时使用。
user-invocable: true
---

# 列出当前 Dev Tasks

扫描 `.dev-tasks/` 目录，列出所有任务及其状态。

## 参数

- `$ARGUMENTS`：可选，指定筛选条件。支持按 stage 筛选。

## 执行流程

### 1. 扫描任务目录

读取 `.dev-tasks/` 下所有子目录的 `status.json`。

### 2. 输出任务列表

以表格形式输出：任务名、阶段、分支、里程碑进度、更新时间。

### 3. 补充信息

标注阻塞任务，提示可归档的已完成任务，显示总数统计。
SKILLEOF

##############################################################################
# Skill: archive-task/SKILL.md
##############################################################################
cat > "$SKILLS_DIR/archive-task/SKILL.md" << 'SKILLEOF'
---
description: 将 .dev-tasks 中已完成的任务归档到 .history-tasks，并清理关联的 git 分支或 worktree。当用户想要归档或清理已完成的开发任务时使用。
user-invocable: true
---

# 归档已完成的 Dev Task

将 `.dev-tasks/` 中已完成（`stage: "done"`）的任务归档到 `.history-tasks/`。

## 参数

- `$ARGUMENTS`：可选，指定要归档的任务名。留空则列出所有可归档的任务供用户选择。

## 执行流程

1. 扫描 `.dev-tasks/` 下 `stage === "done"` 的任务
2. 移动到 `.history-tasks/`
3. 根据任务的 `use_worktree` 字段：
   - 如果为 `true`：清理关联的 worktree
   - 如果为 `false` 或不存在：询问用户是否删除对应的 feature branch（`dev/{task-name}`）
4. 输出结果
SKILLEOF

##############################################################################
# Command: init-dev.md（/init-dev slash command 的入口）
##############################################################################
cat > "$COMMANDS_DIR/init-dev.md" << 'CMDEOF'
Invoke the `init-dev` skill to initialize Dev Agent workflow in the current project.
CMDEOF

##############################################################################
# Shell Aliases (cc / cca / ccw)
##############################################################################
ALIAS_BLOCK='# Claude Code Internal 快捷命令
alias cc='\''claude-internal --permission-mode acceptEdits'\''
alias cca='\''claude-internal --dangerously-skip-permissions'\''
alias ccw='\''claude-internal --permission-mode default'\'''

# 检测用户的 shell 配置文件
if [ -n "$ZSH_VERSION" ] || [ -f "$HOME/.zshrc" ]; then
  SHELL_RC="$HOME/.zshrc"
elif [ -f "$HOME/.bashrc" ]; then
  SHELL_RC="$HOME/.bashrc"
elif [ -f "$HOME/.bash_profile" ]; then
  SHELL_RC="$HOME/.bash_profile"
else
  SHELL_RC=""
fi

if [ -n "$SHELL_RC" ]; then
  if grep -q "alias cca=" "$SHELL_RC" 2>/dev/null; then
    echo "Shell aliases (cc/cca/ccw) 已存在于 $SHELL_RC，跳过"
  else
    echo "" >> "$SHELL_RC"
    echo "$ALIAS_BLOCK" >> "$SHELL_RC"
    echo "Shell aliases (cc/cca/ccw) 已写入 $SHELL_RC"
  fi
else
  echo "警告：未检测到 shell 配置文件，请手动添加以下别名："
  echo "$ALIAS_BLOCK"
fi

##############################################################################
# 完成
##############################################################################
echo ""
echo "安装完成! 已安装以下组件："
echo ""
echo "  Hooks (全局):"
echo "    $HOOKS_DIR/dev-inject-context.sh"
echo "    $HOOKS_DIR/dev-guard-commit-msg.sh"
echo "    $HOOKS_DIR/dev-guard-worktree.sh (可选，仅 --worktree 模式启用)"
echo ""
echo "  Skills:"
echo "    $SKILLS_DIR/init-dev/SKILL.md"
echo "    $SKILLS_DIR/dev/SKILL.md"
echo "    $SKILLS_DIR/list-tasks/SKILL.md"
echo "    $SKILLS_DIR/archive-task/SKILL.md"
echo ""
echo "  Commands:"
echo "    $COMMANDS_DIR/init-dev.md"
echo ""
echo "  Shell Aliases:"
echo "    cc   → claude-internal --permission-mode acceptEdits"
echo "    cca  → claude-internal --dangerously-skip-permissions"
echo "    ccw  → claude-internal --permission-mode default"
echo ""
echo "使用方法："
echo "  1. 运行 source $SHELL_RC（或重开终端）使别名生效"
echo "  2. 进入项目目录，运行 cc 或 cca 启动 claude-internal"
echo "  3. 运行 /init-dev 初始化 Dev Agent"
echo "  4. 在 .dev-tasks/{task-name}/ 下创建 README.md 描述需求"
echo "  5. 运行 /dev {task-name} 启动开发"
echo ""
echo "=== Done ==="

# harness-task

适用于 **Claude Code** 和 **Cursor** 的结构化开发工作流插件。它以 git 分支为主键追踪开发变更，把需求先写入 `prompt.md`，再通过单一 `outlining` 阶段进入计划、TDD、审查和验证流程。

## 概览

harness-task 的主流程是：

```text
prompt.md -> 头脑风暴 -> proposal.md + 增量规格 + phase 计划 -> 按 phase 执行 TDD + 交接 -> 验证 -> 归档
```

从 `/alles-dev` 直接开始。

## 安装

### Claude Code

```bash
claude plugin add /path/to/harness-task
```

### Cursor

在 Cursor 插件设置中添加插件路径，或把插件目录复制到 Cursor 插件目录。

## 快速开始

### 使用当前分支启动

```text
/alles-dev
```

如果不传分支名，默认使用当前 git 分支。

### 使用指定分支启动

```text
/alles-dev feature/login-flow
```

如果分支已存在，则恢复该变更；如果不存在，则会在启动时从配置的基线分支创建它。

### 使用 worktree 启动

```text
/alles-dev feature/login-flow -w
```

支持的参数：
- `-w`
- `-worktree`
- `--worktree`

Worktree 目录位于：`../{project-name}-worktrees/{safe-branch-dir}/`，并且会在启动时创建或复用。

## 先创建 `prompt.md`

每次执行 `/alles-dev`，都会确保变更目录下存在 `prompt.md`。

在进入 prompt 填写前，`/alles-dev` 还会先执行一个 startup hook：
- 解析本次生效的目标分支
- 在默认模式下，如果显式传了分支名且当前不在该分支，就立即切过去；如果该分支不存在，就从 base branch 创建并切换过去
- 如果请求了 worktree 模式，就立即创建或复用 worktree，并绑定到目标分支
- 如果 `.dev-changes/{safe-branch-dir}/` 不存在，就先创建
- 如果 `prompt.md` 不存在，就先创建

支持两种输入方式：
- 对话填充：用户直接在聊天里描述需求，助手写入 `prompt.md`
- 手动填充：用户自己编辑 `prompt.md`，然后回复“已填写”，助手读取后继续

当 prompt 被确认后，助手需要回复：`已经填写`

## 目录结构

```text
your-project/
├── .dev-changes/
│   ├── feature__login-flow/
│   │   ├── prompt.md
│   │   ├── proposal.md
│   │   ├── status.json
│   │   ├── specs/
│   │   ├── phases/
│   │   │   └── PH-1.md
│   │   └── execution-log.md
│   └── archive/
└── .harness-task/
    ├── context.md            # 可选，项目约定
    ├── config.yaml           # 可选，构建/测试/基线分支/阶段钩子
    ├── specs/                # 可选，主规格目录
    └── templates/            # 可选，自定义模板
```

分支名会作为变更身份保留在 `status.json` 中；如果分支名包含 `/`，目录会使用安全转换后的名字，例如 `feature/login-flow -> feature__login-flow`。

## 阶段说明

| 阶段 | 说明 |
|------|------|
| `outlining` | 读取 `prompt.md`，完成需求讨论，写入合并后的 `proposal.md`，并生成增量规格与每个 phase 的独立计划 |
| `executing` | 一次只实现一个 phase，严格执行 TDD；完成后写压缩摘要，并用新的执行上下文继续下一个 phase |
| `verifying` | 执行最终检查并请求用户验证 |
| `done` | 标记完成，准备归档 |

## Phase 交接

每个完成的 phase 都需要留下：
- 一次提交
- 一段写入 `execution-log.md` 和 `status.json` 的短压缩摘要
- 足够让父代理以新的执行上下文或 `dev-executor` 子代理启动下一个 phase 的交接信息

下一个 phase 应主要依赖自己的 phase 计划和已完成 phase 的压缩摘要，而不是继续沿用上一个 phase 的完整对话上下文。

## 可选项目文件

零配置也能使用 harness-task，但以下文件会让它更智能：

- `.harness-task/context.md`：规划和审查时参考的项目约定
- `.harness-task/config.yaml`：构建、测试、lint、基线分支、阶段钩子
- `.harness-task/specs/`：主规格目录，归档或同步时会合并增量规格
- `.harness-task/templates/`：合并提案与详细计划的自定义模板

`config.yaml` 示例：

```yaml
project:
  name: my-app

commands:
  build: npm run build
  test: npm run test
  lint: npm run lint

git:
  base_branch: main

stage_hooks:
  pre_executing: npm run lint
  post_executing: npm run build && npm run test
```

如果没有该配置文件，harness-task 会根据项目内容自动推断常用命令。

## 命令一览

| 命令 | 说明 |
|------|------|
| `/alles-dev [branch-name]` | 启动或恢复一个按分支追踪的开发变更 |
| `/alles-list-changes` | 列出活跃和已归档的变更 |
| `/alles-archive [branch-name]` | 归档已完成变更并合并增量规格 |
| `/sync-specs [branch-name]` | 将增量规格合并到 `.harness-task/specs`，但不归档 |
| `/review [branch-name]` | 对指定变更执行结构化代码审查 |
| `/templates` | 管理可选的提案/计划模板 |

## 提交规范

执行阶段的提交格式必须是：

```text
{type}({scope}): 描述 [{branch-name}]
```

类型：
- `feat`
- `fix`
- `refactor`
- `chore`
- `docs`
- `style`
- `perf`
- `test`

示例：
- `feat(auth): 添加 JWT 令牌验证 [feature/login-flow]`
- `test(api): 添加接口集成测试 [feature/login-flow]`
- `fix(ui): 修复按钮对齐问题 [fix/prompt-entry]`

## 插件结构

```text
harness-task/
├── skills/                          # 工作流技能
│   ├── using-harness-task/SKILL.md
│   ├── dev/SKILL.md
│   ├── brainstorming/SKILL.md
│   ├── planning/SKILL.md
│   ├── tdd/SKILL.md
│   ├── review/SKILL.md
│   ├── templates/SKILL.md
│   ├── list-changes/SKILL.md
│   ├── archive/SKILL.md
│   └── sync-specs/SKILL.md
├── hooks/                           # 会话上下文与保护钩子
├── commands/                        # 斜杠命令入口
├── agents/                          # 执行子代理
├── src/                             # TypeScript 工具与辅助函数
├── tests/                           # 最小回归测试
├── README.md
└── README.zh-CN.md
```

## 许可证

MIT

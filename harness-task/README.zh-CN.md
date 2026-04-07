# Harness Task

面向 Claude Code 和 Cursor 的结构化 6 阶段开发工作流插件。

## 工作流

```
init → prompting → refining → proposing → executing → verifying
```

| 阶段 | 说明 |
|------|------|
| **init** | 创建分支 + 目录 + 空的 prompt.md |
| **prompting** | 用户填写 prompt.md，描述需求 |
| **refining** | 这里会执行 3 个提问检查点：先问至少 3 个 prompt 输入后的问题，再问至少 3 个跟进问题，最后在 refine 转 proposal 前再问至少 3 个过渡问题，然后才生成产物 |
| **proposing** | 向用户展示 proposal.md 和分阶段计划文件，等待确认 |
| **executing** | 按 phase 执行，每个 phase 内 TDD，完成后生成摘要，压缩上下文 |
| **verifying** | 最终 TDD 验证 + 交接 |

## 快速开始

1. 启动一个新的开发变更：
   ```
   /alles-dev feature/my-change
   ```

2. 在 `prompt.md` 中填写你的需求。

3. 工作流会自动引导你完成头脑风暴、规划和执行。

## 命令

| 命令 | 说明 |
|------|------|
| `/alles-dev [分支名]` | 启动或恢复一个开发变更 |
| `/alles-list-changes` | 查看所有变更及其状态 |
| `/alles-archive` | 归档已完成的变更 |
| `/review [分支名]` | 结构化代码审查 |

## 任务目录结构

```
.dev-changes/{分支名}/
  prompt.md              # 用户需求（在多个提问检查点中持续精炼）
  proposal.md            # 提案（做什么、为什么、怎么做）
  status.json            # 阶段状态 + question_checkpoint + phase 进度 + 完成摘要
  phases/
    PH-1.md              # Phase 1 计划（任务清单）
    PH-2.md              # Phase 2 计划（任务清单）
```

## 核心特性

- **三个提问检查点**：分别发生在 prompt 输入后、第一批回答之后，以及 refine 转 proposal 的交接点。每个检查点都至少提出 3 个问题，之后流程才能继续推进。
- **分阶段执行**：任务被拆分为独立的 phase。每个 phase 使用 TDD 执行，完成后生成最小化摘要。
- **上下文压缩**：phase 之间只携带提案和已完成 phase 的摘要。避免上下文窗口膨胀。
- **断点续跑**：任何中断都可以恢复。每次阶段/phase 变更后状态会立即持久化到 `status.json`，包括 `question_checkpoint`。
- **TDD 强制执行**：每个任务都遵循红-绿-重构循环。没有失败的测试就不能写生产代码。

## 配置

在项目根目录创建 `.harness-task/config.yaml` 自定义设置：

```yaml
# 构建和测试命令
build_command: npm run build
test_command: npm test

# 新功能分支的基础分支
base_branch: main
```

创建 `.harness-task/context.md` 添加会话开始时注入的项目特定上下文。

## 提交格式

```
{type}({scope}): description [{分支名}]
```

示例：
- `feat(auth): add login endpoint [feature/auth]`
- `test(auth): add unit tests for login [feature/auth]`
- `fix(api): handle null response [fix/null-response]`

## 许可证

MIT

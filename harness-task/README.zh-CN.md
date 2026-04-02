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
| **refining** | 第一轮头脑风暴：阅读代码，提出至少5个问题，生成 refined-prompt.md（不使用子代理） |
| **proposing** | 第二轮头脑风暴：子代理并行探索代码库，生成 proposal.md + design.md + tasks.md |
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
  prompt.md              # 原始用户需求
  refined-prompt.md      # 第一轮头脑风暴后的精炼需求
  proposal.md            # 提案（做什么、为什么）
  design.md              # 技术设计（怎么做）
  tasks.md               # 分阶段任务清单
  status.json            # 阶段状态 + phase 进度
  phases/
    PH-1-summary.md      # Phase 1 完成摘要
    PH-2-summary.md      # Phase 2 完成摘要
```

## 核心特性

- **两轮头脑风暴**：第一轮通过结构化问题深入理解需求。第二轮使用子代理并行探索代码库，生成具体的提案。
- **分阶段执行**：任务被拆分为独立的 phase。每个 phase 使用 TDD 执行，完成后生成最小化摘要。
- **上下文压缩**：phase 之间只携带提案和已完成 phase 的摘要。避免上下文窗口膨胀。
- **断点续跑**：任何中断都可以恢复。每次阶段/phase 变更后状态会立即持久化到 `status.json`。
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

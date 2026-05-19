# Harness Task

面向 Cursor、Claude Code 等 AI IDE 的团队化开发工作流插件。

## 安装

### npx（无需预安装）

```bash
# 自动检测已安装的 AI IDE，安装工作流资源
npx harness-task install

# 仅安装到 CodeBuddy
npx harness-task install --codebuddy

# 仅安装到 Claude Code / claude-internal
npx harness-task install --claude

# 安装到指定项目的 .codebuddy
npx harness-task install --codebuddy --project /path/to/your/project

# 安装到自定义目录
npx harness-task install --codebuddy --target /custom/.codebuddy
npx harness-task install --claude --dir /custom/.claude-internal
```

### npm 全局安装

```bash
npm install -g harness-task
harness-task install
```

### npm 本地安装（按项目）

```bash
npm install --save-dev harness-task
npx harness-task install --codebuddy --project .
```

### 安装内容

| 平台 | Skills | Agents | Commands |
|------|--------|--------|----------|
| **CodeBuddy** | `harness-task-*`（11 个） | `harness-task-*`（4 个） | `/alles-dev`、`/alles-bugfix`、`/alles-archive`、`/alles-details`、`/alles-list-changes`、`/review` |
| **Claude Code** | `harness-task:*`（11 个，符号链接） | — | 所有命令（符号链接） |

安装完成后，在 CodeBuddy 中执行 `/reload-plugins` 或重启 Claude Code 来加载新插件。

---

它不是再造一个更强的单人 skill，而是为团队提供一套可追踪、可回退、可协作、可持续演进的 AI coding 框架。

## 为什么要做这个

现在大多数 AI IDE 的 `skill`、`rule`、`spec` 都是围绕“个人”或“单个项目”设计的。个人用起来很灵活，但一旦进入多人协作、长期维护的大团队项目，就会暴露出几个明显问题：

1. 团队内没有统一的 AI coding 规范。你用了 design skill，他用了 open spec，另一个人用了 super power，虽然都能产出代码，但行为方式、分析深度、交付质量和边界控制往往并不一致。
2. vibe coding 放大了 code review 的不平衡。几分钟生成几千行代码很容易，但 review 成本会显著上升，审查者往往不知道这些代码是如何被设计、拆分和验证出来的。
3. 团队很难稳定维护一套共享的 base skill。今天你更新了一版最佳实践，明天别人可能又覆盖掉，最终知识无法沉淀为可持续迭代的团队资产。

`dev-task` 就是为了解决这三个问题而设计的。

## 核心思想

- **基于状态机驱动流程**：每一步都有状态记录，支持随时中断、恢复、回退和重新生成，保证流程不会跑偏。
- **约定大于配置**：通过 `/alles-dev 分支名` 强制一个分支只处理一件事，并把产物统一沉淀到 `.dev-changes/{branch}`。
- **sub-agent 负责分析与守卫**：代码分析、提问澄清、proposal 生成、code review、状态管理由固定职责的 agent 完成，降低不同使用者之间的“vibe 偏差”。
- **项目友好且团队友好**：项目可以定义主 agent 与 sub-agent 的公共规则，也可以保留个人差异化 skill，在统一规范下灵活扩展。
- **最小化边界**：内置的 skill 保持尽量少，只覆盖必要流程。即使项目没有额外配置，也能得到稳定、可解释的结果。

## 工作流

```
init → prompting → refining → proposing → executing → verifying
```

| 阶段 | 说明 |
|------|------|
| **init** | 创建或切换到目标分支，初始化 `.dev-changes/{branch}`、`prompt.md`、`status.json` |
| **prompting** | 用户编写 `prompt.md`，也可以结合 PRD、技术文档、截图等输入原始需求 |
| **refining** | 通过 4 个问题检查点（前 3 个由 analysis-agent 按第一性原理分类多轮提问，第 4 个由 proposal-agent 完成 proposal 过渡）逐步澄清边界、补齐遗漏、校验需求真实性 |
| **proposing** | 深读代码并产出 `proposal.md` 与 `phases/PH-*.md`，等待确认 |
| **executing** | 主 agent 按 phase 执行代码实现，调用团队 skill / base skill，并在每个 phase 结束后进行审查与上下文压缩 |
| **verifying** | 最终验证结果、确认交付边界、准备归档或进入 bugfix 流程 |

## 它如何解决团队问题

### 1. 统一 AI coding 规范

`dev-task` 不强行要求所有人使用同一种个人 skill，而是把真正需要统一的部分收敛到统一工作流上：

- 如何启动任务
- 如何定义边界
- 如何澄清需求
- 如何生成 proposal
- 如何拆 phase
- 如何执行与 review
- 如何记录状态和恢复现场

这样团队成员可以保留各自的习惯，但最终都在同一条结构化流水线上工作。

### 2. 降低大规模 vibe coding 的 review 成本

review 困难的根本原因，通常不是“代码多”，而是“没有过程上下文”。`dev-task` 通过以下方式补足审查信息：

- 每个需求先进入 `prompt.md`，而不是直接开始写代码
- 每个任务必须经过多轮问题澄清，而不是一次性拍脑袋执行
- 每个实现前先生成 `proposal.md` 和 phase 计划
- 每个 phase 都有独立状态、摘要和可回溯记录
- 每次实现后都由专门的 review agent 进行一致性检查

这使得 reviewer 看到的不再只是“突然多出来的几千行代码”，而是一条完整、可解释的决策链路。

### 3. 让团队基础能力可持续演进

团队维护共享 AI 能力最怕互相覆盖。`dev-task` 把“流程控制”和“能力扩展”分开：

- 流程本身由状态机和固定命令负责，保持稳定
- 团队能力通过项目级 skill / rule 配置注入，持续演进
- 个人能力通过个人 skill 保留，不与团队框架直接冲突

这意味着你可以稳定维护一套团队 base skill，而不用担心每个人的使用方式把整套流程带偏。

## 完整使用流程

### 1. `/alles-dev 分支名`

启动一个新的开发变更，或者恢复一个已有变更。

这个命令会先执行 startup hook，完成以下动作：

- 解析有效分支名
- 切换到该分支，或从基础分支创建该分支
- 创建 `.dev-changes/{branch}/`
- 创建 `prompt.md`
- 创建 `status.json`

随后进入 prompt 输入阶段。你可以直接手写需求，也可以结合 PRD、技术文档等材料补充上下文。

### 2. 第一轮 prompt 优化

启动 sub-agent 快速阅读代码，并根据你的初始 prompt 做两件事：

- 核实执行边界是否真实可落地
- 对 prompt 中描述不清楚、缺少约束、可能引发误解的部分提问

目标不是直接做方案，而是先把“需求说清楚”。

### 3. 第二轮 prompt 优化

再次启动 sub-agent，基于第一轮回答继续提问和收敛，把模糊描述进一步变成可执行约束，最终持续更新 `prompt.md`。

这一步的重点是减少“我以为你是这个意思”的情况。

### 4. proposal 生成

启动更深度的 sub-agent，再次阅读代码，这一轮会重点确认：

- 真正需要修改的模块边界
- 适合采用的设计模式
- 哪些内容应该做，哪些不应该做
- 如何拆分为多个 phase 执行

然后生成：

- `proposal.md`
- `phases/PH-*.md`

也就是说，真正编码之前，需求、边界、实现路径和拆分计划都已经被明确记录下来。

### 5. 主 agent 按 phase 编写代码

代码实现由主 agent 完成，而不是继续交给 sub-agent。这样做的原因是很多 AI IDE 中 sub-agent 无法再继续调用 sub-agent，难以完成更复杂的编排。

在每个 phase 中，主 agent 会：

- 读取当前 phase 计划
- 灵活调用 base skill 和 team skill
- 按 phase 进行实现与验证
- 在实现完成后调用 code review agent 检查结果
- 清空或压缩上下文，尽量把上下文占用控制在安全范围内

这样既能保持实现能力，又能控制长上下文失真问题。

### 6. `/alles-bugfix`

当执行阶段或验证阶段发现问题时，使用该命令进入 bugfix 流程。

它会：

- 识别问题最可能对应的 phase
- 回到正确的状态节点
- 更新 proposal / phase 计划
- 修复后续代码
- 保证修复不会破坏原有正确性

bugfix 不再是一次随意补丁，而是一次受状态机约束的正式回放。

### 7. `/alles-archive`

当变更完成后，使用归档命令将任务沉淀下来。

归档后可以按功能维度整理历史开发记录，并保留：

- 关键设计决策
- bugfix 记录
- 重要注意事项
- 可复用经验

这一步的目标不是“清理文件”，而是把一次 AI 协作开发沉淀为团队资产。

### 8. `/alles-details`

从 `.dev-changes/archive/` 中汇总所有已归档变更，生成 `project-details/NOTES.md`。

它会沉淀：

- 关键设计决策
- 已知限制与注意事项
- 后续可复用的经验
- 按时间倒序排列的变更历史摘要

这一步的目标不是重复归档内容，而是把历史变更整理成更适合团队长期参考的项目级知识笔记。

## 命令

| 命令 | 说明 |
|------|------|
| `/alles-dev [分支名]` | 启动或恢复一个开发变更 |
| `/alles-bugfix` | 在 `executing` 或 `verifying` 阶段进入 bugfix 流程 |
| `/alles-list-changes` | 查看所有变更及其状态 |
| `/alles-archive` | 归档已完成的变更 |
| `/alles-details` | 从所有归档变更生成 `project-details/NOTES.md` |
| `/review [分支名]` | 对指定变更执行结构化代码审查 |

## 任务目录结构

```
.dev-changes/{branch-name}/
  prompt.md              # 用户需求，经过多轮提问持续精炼
  proposal.md            # 产品级提案：做什么、为什么做、边界是什么
  status.json            # 当前阶段、question_checkpoint、phase 进度、摘要
  phases/
    PH-1.md              # Phase 1 计划
    PH-2.md              # Phase 2 计划
```

## 关键机制

### 四个提问检查点

在 `refining` 阶段，流程不会直接从 prompt 跳到 proposal，而是必须经过 4 个检查点。前 3 个由 `analysis-agent` 驱动（每个对应一个问题类别，类别内允许不限轮数的多轮提问），第 4 个由 `proposal-agent` 驱动：

1. **类别 1 — 总体需求梳理**：新功能 vs. 修改判别、复用点探索、子项目拆分、历史兼容性。
2. **类别 2 — 功能点划分 + 代码修改边界**：功能点列表、每个功能点的模块/文件级修改边界。
3. **类别 3 — 连贯性 + 开放设计**：跨功能点耦合、业界最优方案对照、未决问题；同时按新模板重写 `prompt.md`，新增 `Feature Breakdown` 章节。
4. **Proposal 过渡**：基于代码的 gap 分析，随后生成 `proposal.md` 与各 phase 计划。

每轮提问 3–5 题；同一类别内的轮数不设上限——agent 会一直追问直到该类别的收口判定通过。

### 断点续跑

所有关键状态都会写入 `status.json`。无论是 IDE 中断、上下文丢失还是人工暂停，都可以重新恢复到最近一次确定状态。

### 分阶段执行

任务不是一次性生成到底，而是拆成多个 phase。每个 phase 都有独立计划、独立执行、独立摘要，更适合大任务和多人协作。

### 上下文压缩

phase 完成后会清空或压缩上下文，只保留必要提案和摘要，避免模型在超长上下文中逐渐偏离。

### 项目级配置

项目可以通过公共配置注入团队约束，而不是依赖每个开发者手动同步本地规则。

## 配置

在项目根目录创建 `.harness-task/config.yaml`：

```yaml
# 构建和测试命令
build_command: npm run build
test_command: npm test

# 新功能分支的基础分支
base_branch: main
```

你也可以创建 `.harness-task/context.md`，注入项目级上下文，例如架构约束、代码规范、交付边界、团队约定等。

## 提交格式

```
{type}({scope}): description [{branch-name}]
```

示例：

- `feat(auth): add login endpoint [feature/auth]`
- `test(auth): add unit tests for login [feature/auth]`
- `fix(api): handle null response [fix/null-response]`

## 适合谁

- 希望把 AI coding 从“个人技巧”升级为“团队流程”的团队
- 希望降低 vibe coding 带来的 review 和维护成本的项目
- 希望把 skill、rule、review、bugfix 和归档串成一条完整链路的组织
- 希望在保留个体灵活性的同时，建立统一交付标准的研发团队

## 许可证

MIT

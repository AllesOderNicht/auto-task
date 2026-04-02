## Why

当前 `harness-task` 把需求澄清和计划产出拆成 `proposing` 与 `outlining` 两个阶段，导致一次 change 需要经历两次阶段切换、两轮产物维护和分散的确认节奏。将两者完全合并到单一 `outlining` 阶段，可以缩短 `/alles-dev` 的前置流程，减少状态机复杂度，并让用户一次性确认完整的规划结果。

## What Changes

### New Capabilities

- `single outlining stage`: `/alles-dev` 在进入规划流程后只使用 `outlining` 阶段承载需求澄清、方案整理、规格增量和 phase 计划生成。
- `immediate branch setup`: `/alles-dev` 启动时立即创建或切换到目标分支，而不是延后到原 outlining 确认之后。
- `single planning confirmation`: 用户只在规划完成后确认一次，确认对象包含合并后的 `proposal.md`、delta specs 和 phase plans。

### Modified Capabilities

- `proposal artifact`: `proposal.md` 由“仅 proposal 内容”升级为合并文档，既承载动机/范围/验收标准，也承载原 outline 的 phase 概览。
- `workflow state machine`: 阶段枚举、恢复逻辑、阶段顺序、阶段钩子和相关说明改为 `outlining -> executing -> verifying -> done`。
- `planning handoff`: `planning`、`review`、README 和技能文档都改为以 `proposal.md` 作为唯一高层规划文档，不再引用 `outline.md` 或 `proposing`。

### Removed Capabilities

- `proposing stage`: 删除独立的 `proposing` 阶段和所有对应文案、状态枚举、恢复逻辑及文档说明。
- `outline.md artifact`: 删除独立 `outline.md` 产物及其引用。
- `legacy compatibility`: 不为旧 `status.json`、旧阶段名或旧恢复路径保留兼容行为。

## Scope

### Included

- 更新 `dev` 主技能流程定义
- 更新 `brainstorming`、`planning`、`review`、`using-harness-task` 等相关技能文档
- 更新 `README.md` 与 `README.zh-CN.md`
- 更新 `src/utils/status.ts` 和相关测试
- 删除或替换所有对 `proposing` / `outline.md` 的显式引用

### Excluded

- 不改变执行阶段的 TDD、review、verify 核心机制
- 不新增额外阶段或兼容迁移脚本
- 不处理 `dist/` 以外的发布流程自动化策略变更

## Acceptance Criteria

- [ ] `harness-task` 工作流只保留 `outlining`、`executing`、`verifying`、`done` 四个阶段
- [ ] `/alles-dev` 文档与技能说明明确要求在启动时立即创建或切换目标分支
- [ ] `proposal.md` 成为唯一的高层规划文档，仓库中不再要求生成或读取 `outline.md`
- [ ] 用户只需要在规划完成后进行一次确认，即可进入 `executing`
- [ ] 代码、测试、README、中英文文档和技能说明保持一致，不保留旧流程兼容逻辑

## Approaches

### Recommended: Hard switch to merged outlining

直接删除 `proposing`，将需求讨论、合并文档、delta specs 和 phase plans 统一放入 `outlining`。优点是心智模型最简单，状态机和文档都最干净；缺点是这是一次不兼容变更，但你已经明确接受不兼容。

### Alternative: Keep `outlining`, but keep two documents

仍然只保留 `outlining` 阶段，但继续保留 `proposal.md` 与 `outline.md` 两个文件。这样实现改动更小，但会继续保留重复产物，不符合你对“完全合并”的要求。

### Alternative: Keep `proposing` name and absorb outlining

保留 `proposing` 名称，把原 outlining 职责并进去。实现复杂度相近，但与你指定“只保留 outlining”相冲突，因此不采用。

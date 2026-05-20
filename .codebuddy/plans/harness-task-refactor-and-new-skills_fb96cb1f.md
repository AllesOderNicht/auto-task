---
name: harness-task-refactor-and-new-skills
overview: 重构 harness-task 项目以符合开源规范，同时新增 domain-docs、grill-with-docs 增强、diagnose、architecture-deepening 四项能力——全部集成进现有工作流，不新增用户命令。
todos:
  - id: fix-installer-drift
    content: 修复 bin/harness-task.js 两处 SKILL_IDS 和 COMMAND_IDS/COMMAND_META 漂移，新建 tests/installer.test.ts 一致性断言，更新 README.md 安装表格
    status: completed
  - id: add-domain-docs-skill
    content: 新增 skills/domain-docs/（SKILL.md、CONTEXT-FORMAT.md、ADR-FORMAT.md），在 bin/harness-task.js 注册，修改 skills/dev/SKILL.md init 阶段增加 CONTEXT.md 软性检测提示
    status: completed
    dependencies:
      - fix-installer-drift
  - id: enhance-analysis-agent-grill
    content: 修改 agents/analysis-agent.md Phase B/C/D 融入 grill-with-docs 思想（CONTEXT.md 读取、术语冲突检查、closure 后 ADR 建议），同步修改 agents/proposal-agent.md Risks 节 ADR 候选标注
    status: completed
    dependencies:
      - add-domain-docs-skill
  - id: add-diagnose-skill
    content: 新增 skills/diagnose/SKILL.md 六阶段流程，在 bin/harness-task.js 注册，修改 skills/bugfix/SKILL.md 增加分流判断，修改 agents/bug-investigator.md 增加 Phase 0，更新 skills/using-harness-task/SKILL.md
    status: completed
    dependencies:
      - fix-installer-drift
  - id: add-architecture-deepening-skill
    content: 用 [subagent:code-explorer] 读取 tmp/skills 参考词汇，新增 skills/architecture-deepening/（SKILL.md + LANGUAGE.md），在 bin/harness-task.js 注册，修改 executing/SKILL.md Step 3.5、dev/SKILL.md verifying、check/SKILL.md P3、tdd/SKILL.md 深模块原则，更新 README.zh-CN.md
    status: completed
    dependencies:
      - add-domain-docs-skill
---

## 用户需求

对 `harness-task` 项目进行系统性重构，满足以下三个方向：

### 1. 修复现有缺陷 + 开源规范优化

- 修复 `bin/harness-task.js` 安装链路漂移：`check` skill 和 `alles-check` 命令未被 npm 安装（sync 脚本有，bin 没有）
- 补充安装一致性测试，防止再次漂移
- 增强现有 skill 质量（tdd 深模块原则、check P3 架构词汇、bug-investigator 反馈循环前置）

### 2. 新增四个能力，无新增命令

**关键约束：不新增任何命令，将新能力融入 `/alles-dev` 工作流各阶段。**

- **`domain-docs` skill**：维护领域词汇表（`CONTEXT.md`）和架构决策记录（`docs/adr/`）的格式规范与懒创建机制，由工作流内部引用，`dev` skill `init` 阶段软性提示
- **`grill-with-docs` 增强**：不作为独立 skill，完全融入 `analysis-agent`，在 refining 阶段提问时自动检查术语与 `CONTEXT.md` 的一致性，closure 后建议更新领域文档
- **`diagnose` skill**：六阶段结构化 bug 诊断，通过 `bugfix` skill 的分流判断触发，与 `bug-investigator` 并存：phase 回滚型走现有流程，通用调试型走 diagnose
- **`architecture-deepening` skill**：深模块架构扫描，融入 executing 阶段 phase review 后的触发点和 verifying 阶段的可选子步骤

### 3. 安装器同步

所有新增 skill 同步注册到 `bin/harness-task.js`，无新增命令注册。

## 核心功能与视觉效果

- 安装后 `/alles-check` 真正可用（修复漂移）
- refining 阶段提问更智能：读 `CONTEXT.md` 避免重复解释术语，术语冲突立即指出，能读代码回答的问题不问用户
- 遇到 bug 时有两条路径选择：结构化诊断（建立反馈循环 → 假设 → instrument）或工作流内回滚
- phase review 通过后若发现架构 concern，自动提示可进行深模块扫描
- 领域词汇与 ADR 可被懒性创建，不强制要求项目前置配置

## 技术栈

现有项目维持不变：Node.js (ESM) + TypeScript，Vitest 测试框架，文档驱动 skill 体系（Markdown + YAML frontmatter）。新增内容全部为 Markdown skill 文件 + `bin/harness-task.js` 列表更新，无新增 TypeScript 业务逻辑（仅新增测试文件用 Vitest）。

## 实现策略

### 架构约束（不可打破）

1. `analysis-agent` 的 4 个 checkpoint 结构和 `question_checkpoint` 计数器保持不变
2. `refining-orchestrator` dispatch table 权威不变，不引入新 agent 中断 checkpoint 推进
3. `bin/harness-task.js` 中 `transformText` 函数内的 `SKILL_IDS` 和顶层 `SKILL_IDS` 必须同步
4. 新 skill 的 frontmatter 必须包含 `name`、`description`；用户可调用的 skill 加 `user-invocable: true`
5. **不新增任何命令文件**，不修改 `COMMAND_IDS`、`COMMAND_META`

### 各改动点策略

**修复安装链路漂移**

在 `bin/harness-task.js` 第 43-47 行（`transformText` 内部 `SKILL_IDS`）和第 113-117 行（顶层 `SKILL_IDS`）两处同步加入 `"check"`，`COMMAND_IDS` 和 `COMMAND_META` 加入 `"alles-check"`。新建 `tests/installer.test.ts` 读取 `bin/harness-task.js` 源码并断言两处 SKILL_IDS 完全一致，防止再次漂移。

**`domain-docs` skill（仅供内部引用）**

`skills/domain-docs/SKILL.md`：定义 CONTEXT.md 格式（纯词汇表，不含实现）、懒创建规则（首次解析出新术语时才创建）、ADR 三条件（难逆转 + 不问会困惑 + 有真实取舍）。配套 `CONTEXT-FORMAT.md` 和 `ADR-FORMAT.md`。`dev/SKILL.md` `init` 阶段增加软性检测：若项目根无 `CONTEXT.md` 也无 `CONTEXT-MAP.md`，提示用户"可通过 `harness-task:domain-docs` 创建领域词汇表"，不阻塞流程。

**`analysis-agent` 增强（grill-with-docs 思想融入）**

在不打破 4 checkpoint 结构的前提下，精确插入三处规则：

- **Phase B**（探索代码时）：若 `.harness-task/context.md` 或项目根 `CONTEXT.md` 存在，软性读取并记录已有术语作为参照
- **Phase C**（组织问题时）：① 若某个问题能通过读代码回答，直接探索代码而不询问用户；② 若用户回答中出现与 `CONTEXT.md` 冲突的术语，立即以单独段落指出，不与其他问题混合
- **Phase D**（closure 后、写 checkpoint decisions 之前）：建议性地（不强制）更新 `CONTEXT.md` 新术语；若某个决策满足 ADR 三条件，建议（不强制）创建 `docs/adr/`，用户可拒绝

**`diagnose` skill（通过 `bugfix` 分流触发）**

`skills/bugfix/SKILL.md` 在 `When to Invoke` 之后增加分流判断段落：

- **phase 回滚型**：bug 在当前工作流产生的代码内、需重置 status.json 重跑 phase → 走现有 bug-investigator 流程
- **通用调试型**：bug 来源不明、性能问题、已有代码问题、或用户主动说"诊断一下" → 调用 `harness-task:diagnose`

`agents/bug-investigator.md` Step 3（注入日志）之前，增加 **Phase 0：建立反馈循环**——必须先构造一个 agent 可独立运行的 pass/fail 信号（failing test / CLI 脚本 / diff 脚本等），才能进入注入日志阶段；若无法建立则停止并向用户说明原因。

`skills/diagnose/SKILL.md`：完整六阶段（Phase 1 建立反馈循环为核心、Phase 2 复现、Phase 3 假设、Phase 4 Instrument、Phase 5 Fix+regression test、Phase 6 Cleanup+post-mortem），参照 `tmp/skills/skills/engineering/diagnose/SKILL.md`，适配 harness-task 命名规范和 bin 注册要求。

**`architecture-deepening` skill（融入 executing + verifying）**

`skills/executing/SKILL.md` Step 3.5（phase review 通过后）：若 phase review 的 `critical_issues` 包含架构相关 concern 或 P3 评分 <= 6，在继续前提示用户"是否调用 `harness-task:architecture-deepening` 进行深模块分析"，用户可跳过。

`skills/dev/SKILL.md` verifying 阶段：最终验证报告生成后，增加可选步骤："若项目近期有大量新增模块，建议调用 `harness-task:architecture-deepening` 做一次深模块扫描。"

`skills/check/SKILL.md` P3 增加深模块词汇检查问题，引入 Module/Interface/Seam/Adapter/Depth/deletion test 等概念，作为 P3 的补充评审维度。

## 实现注意事项

- `domain-docs` 中 `CONTEXT.md` 与现有 `.harness-task/context.md` 定位不同：前者是领域词汇表（DDD 风格），后者是工程配置注入（编码规范、架构约束）；两者共存，互不覆盖
- `analysis-agent` 改动必须加"软可选"限定（若 CONTEXT.md 不存在则跳过），避免无文档项目报错
- `diagnose` skill 的 `user-invocable: true`，但不注册命令，用户通过 bugfix 分流或手动调用 skill
- `bin/harness-task.js` 的 `transformText` 函数内部 SKILL_IDS（第 43 行区域）和顶层 SKILL_IDS（第 113 行区域）必须同时修改，否则 CodeBuddy 安装时 skill 引用替换会失败
- `tests/installer.test.ts` 使用 Vitest 与现有测试保持一致，通过 `fs.readFileSync` 解析 bin 文件源码进行白盒一致性检查

## 目录结构

```
harness-task/
├── agents/
│   ├── analysis-agent.md          # [MODIFY] Phase B/C/D 增加 CONTEXT.md 感知和术语一致性规则
│   ├── bug-investigator.md        # [MODIFY] Step 3 前增加 Phase 0 反馈循环建立要求
│   └── proposal-agent.md          # [MODIFY] Risks 节增加 ADR 候选标注规则
├── bin/
│   └── harness-task.js            # [MODIFY] 修复漂移（两处 SKILL_IDS + COMMAND_IDS + COMMAND_META），注册新 skill
├── skills/
│   ├── architecture-deepening/
│   │   ├── SKILL.md               # [NEW] 深模块扫描主 skill，三步流程：探索→候选列表→grilling loop
│   │   └── LANGUAGE.md            # [NEW] Module/Interface/Seam/Adapter/Depth/Leverage/Locality 词汇表
│   ├── bugfix/SKILL.md            # [MODIFY] 增加 bug 类型分流判断段落
│   ├── check/SKILL.md             # [MODIFY] P3 增加深模块词汇检查问题（deletion test、Seam、Depth）
│   ├── dev/SKILL.md               # [MODIFY] init 阶段增加 CONTEXT.md 软性检测提示；verifying 阶段增加架构检查可选提示
│   ├── diagnose/SKILL.md          # [NEW] 六阶段 bug 诊断 skill，user-invocable: true
│   ├── domain-docs/
│   │   ├── SKILL.md               # [NEW] 领域文档管理 skill（CONTEXT.md + ADR），user-invocable: true
│   │   ├── CONTEXT-FORMAT.md      # [NEW] CONTEXT.md 格式规范（术语条目格式、禁止实现细节）
│   │   └── ADR-FORMAT.md          # [NEW] ADR 格式规范（标题/状态/背景/决策/后果）
│   ├── executing/SKILL.md         # [MODIFY] Step 3.5 review 通过后增加架构 concern 触发点
│   ├── tdd/SKILL.md               # [MODIFY] 增加深模块原则和 mock 边界建议（仅通过 public interface 测试）
│   └── using-harness-task/SKILL.md # [MODIFY] Available Skills 表增加 domain-docs、diagnose、architecture-deepening
├── tests/
│   └── installer.test.ts          # [NEW] 验证 bin/harness-task.js 两处 SKILL_IDS 完全一致，COMMAND_IDS 与 COMMAND_META key 完全一致
├── README.md                       # [MODIFY] What gets installed 表格更新（skill 数量、补充 /alles-check）
└── README.zh-CN.md                 # [MODIFY] 同步中文文档
```

## Agent 扩展

### SubAgent

- **code-explorer**
- 用途：在实施 `architecture-deepening/SKILL.md` 和 `LANGUAGE.md` 时，读取 `tmp/skills/skills/engineering/improve-codebase-architecture/` 下的词汇定义和 deletion test 原则，确保新 skill 与参考设计完全对齐
- 预期结果：输出精确的词汇定义和流程描述，避免内容漂移
# AI 产品开发团队 vNext 路线图

> 状态：active
> Roadmap ID：RM-VNEXT-001
> Product Brief ID：PB-VNEXT-001
> Product Model ID：PM-VNEXT-001
> Architecture ID：ARCH-VNEXT-001
> 产品定义：帮助用户把模糊想法转化为清晰产品、可演进架构、开发指挥，以及能够安全上线和持续运行的软件。
> Product Brief：`product-brief.md`
> 核心用户：依靠 AI 共同完成产品与技术判断的独立开发者和项目 Owner。
> 核心价值：共同思考，并保持从需求到实现的整体一致性。
> 本期范围：重建产品探索、架构规划、开发交接、变更影响、安全发布和运行保障链路，并闭合项目专属 preset 与 Owner Decision 验证。
> 明确不做：扩展 Workbench、metrics、通用 preset 目录和重复的编码执行层。
> 验收标准：三个真实场景能够跑通完整、可追踪的项目主干，project-preset 被真实加载，完全访问权限不绕过 Owner 决策。
> 更新于：2026-07-12

## 项目主干

```text
Product Brief
  -> Product Model
    -> Architecture
      -> Roadmap Module
        -> Feature Spec
          -> Tasks
            -> Code / Tests / Security / Release / Operations Evidence
```

- roadmap 只维护产品模块、阶段顺序和模块状态。
- spec 只维护单个功能的范围、行为、架构影响和验收契约。
- tasks 只维护当前 spec 的执行拆解和进度。
- 安全与运维是每层都必须考虑的横切约束，不是上线前临时增加的独立检查。
- 下层必须引用上层 ID；同一事实不得在多层重复维护。

## MVP 最小集

完成 N1-N7 后，能够跑通核心流程：用户提出模糊想法，AI 共同探索并建立产品与架构，再生成可执行规划、完成开发、安全上线、持续运行，并在变化发生时维护整体一致性。

## 当前执行包

| 模块 | 执行包 | 说明 |
|---|---|---|
| N1 | `.claude/workspace/features/n1-co-discovery/` | 本模块的 spec、tasks 和 review；通用命令读取规则由 N4 统一迁移 |
| N2 | `.claude/workspace/features/n2-product-model/` | 本模块的 Product Model、spec、tasks 和 review；结构化存储与自动校验由 N4 统一设计 |
| N3 | `.claude/workspace/features/n3-architecture-backbone/` | 本模块的 Architecture、ADR、spec、tasks 和 review；artifact schema 与状态读取由 N4 统一设计 |
| N4 | `.claude/workspace/features/n4-planning-artifact-system/` | 规划产物层级、状态与追溯契约 |
| N5 | `.claude/workspace/features/n5-controlled-delivery-loop/` | 受控开工、迭代、验证与持续审查 |
| N6 | `.claude/workspace/features/n6-change-impact-integrity/` | 变更归属、影响范围与完整性验证 |
| N7 | `.claude/workspace/features/n7-operational-readiness/` | 安全、发布、运行、恢复与回滚证据 |
| N8 | `.claude/workspace/features/n8-*/` | N8.2-N8.5 已完成；N8.1 重开一个 feedback 闭环子任务 |

## 功能模块

| 模块 ID | 状态 | 模块 | Capability ID | Architecture Component ID | 用户价值 | MVP | 描述 | 优先级 | 复杂度 | 依赖 | 验收标准 | 主要风险 | 最近更新 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| N1 | done | 共同探索与决策 | C1 | A2 | 用户不必预先知道正确答案 | 是 | AI 先综合已知信息并区分事实与推断，再提出候选路线、推荐和必要决策 | P0 | L | 无 | Codex A1-A4 通过；Claude 生成契约一致；默认简洁、有明确推荐、每轮只问 0-2 个高价值问题 | 可能退化成固定问卷或冗长咨询报告；Claude 实机体验延后验证 | 2026-07-11 |
| N2 | done | 产品模型 | C2 | A2 | 全局始终知道为谁解决什么问题 | 是 | 定义用户、价值、能力、边界、用户旅程和成功标准 | P0 | L | N1 | 产品能力与核心体验有唯一、可理解的事实源 | 模型过重或与 roadmap 重复 | 2026-07-11 |
| N3 | done | 架构主干 | C3 | A3 | 局部功能不会各自形成孤立设计 | 是 | 把产品能力映射为模块、职责、接口、依赖、数据流和安全边界，并定义架构演进规则 | P0 | XL | N2 | 功能和架构变更都能定位影响、迁移路径及兼容风险 | 过早固化实现或抽象过度 | 2026-07-11 |
| N4 | done | 规划产物体系 | C4 | A4 | roadmap、spec、tasks 能共同指挥开发 | 是 | 定义层级、ID、引用、事实源、状态归属和读取优先级，并让 spec 声明架构、安全和运行影响 | P0 | XL | N2,N3 | task 可追溯到产品目标；AI、status 和 Workbench 读取同一当前主干 | 文档关系复杂，或旧状态读取器继续压过新事实源 | 2026-07-11 |
| N5 | done | 受控开发循环 | C5 | A5 | AI 不再拿到局部需求就闷头实现 | 是 | 开工前检查上游契约，按小迭代开发、测试、安全检查并同步状态 | P0 | XL | N4 | 缺少关键产品、架构或安全信息时能够停下并给出建议 | 门禁过多降低开发效率 | 2026-07-11 |
| N6 | done | 变更影响与完整性 | C6 | A4,A5 | 用户体验问题可以精准修改且不破坏整体 | 是 | 定位问题归属，生成影响范围、同步项和完整性验证 | P0 | XL | N3,N4,N5 | 体验变化能追踪到相关规划、代码、测试和文档 | 影响关系依赖 AI 自觉维护 | 2026-07-11 |
| N7 | done | 安全、发布与运行保障 | C7 | A6 | 用户不必独自承担上线后的安全和运维风险 | 是 | 建立风险分级、威胁分析、部署、监控、告警、备份、恢复、回滚和事故处理契约 | P0 | XL | N3,N4,N5,N6 | 高风险功能有安全证据，软件可部署、可观察、可恢复和可回滚 | 不同项目运行环境差异较大 | 2026-07-11 |
| N8 | in_progress | Project Preset、决策门禁与真实验证 | C8 | A2,A4,A5,A7 | 新体系先证明会理解项目、遵守项目规则并在高影响决策前停下 | 是 | 闭合 project-preset 生命周期，建立不受工具权限影响的 Owner Decision Gate，用三类真实项目 dogfood 后完成治理层切换 | P0 | XL | N1-N7 | 已完成生成/审查/校验/加载、Owner Gate、三类场景和治理层切换；待 N8.1.5 证明真实反馈能形成可审查候选修改，且未经 Owner 确认不会自动升级为项目规则 | feedback 目前只有更新原则、没有行为闭环；有限 Dogfood 仍可能产生假阳性；Claude gateway 恢复后需补实机验证 | 2026-07-12 |

> 状态：planned / in_progress / blocked / done / shipped

## 建议顺序

```text
N1 -> N2 -> N3 -> N4 -> N5 -> N6 -> N7 -> N8
```

N1-N4 建立思考和指挥体系；N5-N6 让开发与修改遵守主线；N7 补齐安全上线和持续运行；N8 不再只是迁移收尾，而是先验证 project-preset 激活、Owner Decision 行为和真实项目价值，再决定正式切换或收敛。

## N8 验证阶段

| 阶段 | 状态 | 目标 | 最小验收 |
|---|---|---|---|
| N8.1 Project Preset Lifecycle | in_progress | 闭合 generate -> review -> validate -> activate -> feedback | 已完成前四步；N8.1.5 需用一条真实反馈证明“证据 -> 候选修改 -> Owner 确认 -> curate/validate -> 重新加载”，未确认推断不能升级为规则 |
| N8.2 Owner Decision Gate | done | 将产品决策与工具权限分离 | 完全访问权限下，产品范围、长期架构、安全隐私、不可逆操作和正式发布仍必须等待 Owner 确认 |
| N8.3 Real Project Dogfood | done_with_limitations | 在非本仓库场景验证真实价值 | 三类场景已完成；D21 为回放、仅 PetCare 完成真实 preset 激活，作为可信度限制保留，不伪装成普遍验证 |
| N8.4 Ecosystem Boundary | done | 明确与成熟执行层的分工 | 通用 TDD、调试、子代理、worktree、review 优先复用；本项目只保留有可观察增益的治理能力 |
| N8.5 Cutover Or Converge | done | 根据证据决定正式产品形态 | 已选择治理层切换；状态读取已迁移，legacy 仅作 reference，不扩建第二套通用执行层 |

## N1-N8 给 Owner 的实际结果

| 模块 | 你真正得到的东西 | 它不代表什么 |
|---|---|---|
| N1 | 你可以从模糊想法开始；AI 应先给方向、推荐和关键取舍，只让你决定高价值问题 | 不是一份固定问卷，也不保证 AI 每次都有好创意 |
| N2 | 项目有一个稳定的“为谁、解决什么、不做什么”事实源 | 不是更多产品文档就自动等于好产品 |
| N3 | 每个功能知道它属于哪个模块，大改动能说明接口、数据、迁移和回滚影响 | 不是提前设计所有实现细节 |
| N4 | roadmap、spec、tasks 有明确分工和唯一状态来源，不应再各说各话 | 不是用编号和文件数量制造“在管理”的假象 |
| N5 | AI 开工前要检查上游目标、范围和风险，信息缺失时应停下并告诉你缺什么 | 不是任何小修改都走重流程 |
| N6 | 你说“这里不好用”时，AI 应定位该改产品、架构、规划还是代码，并检查连带影响 | 不是自动猜对你没有说出的产品意图 |
| N7 | “做完”不再只是代码能跑，还要有与风险匹配的安全、部署、监控、备份、恢复和回滚证据 | 不是 base 会替每个项目自动配好云服务和运维 |
| N8 | 不同项目可以形成自己的 preset；完全权限不等于你已同意高影响决策；MY2 正式收敛为治理层而不是第二个 Superpowers | 不代表 preset feedback 已闭环，也不代表三个项目都已生成并激活 preset |

N1-N8 合起来交付的不是“更会写代码的模型”，而是一条让 AI 与 Owner 共同做产品、在长期开发中不容易跑偏的治理主干：它管“写什么、为什么写、什么时候必须停下、改完如何证明没破坏整体”，通用编码执行能力优先交给成熟生态。

## 风险与未决

| 项 | 状态 | 当前处理 | 处理时点 |
|---|---|---|---|
| project-preset feedback 闭环 | 未完成，P0 | 执行 N8.1.5：反馈只能形成有证据的候选修改，Owner 确认并通过 curate/validate 后才能重新加载 | N8 关单前 |
| Dogfood 样本覆盖 | 已接受限制，P1 | D21 是回放，仅 PetCare 有激活 preset；后续补无 PRD 实时探索和第二个异构项目激活，不阻塞 N8.1.5 | 后续 Dogfood |
| Claude/Codex 实机一致性 | 环境阻塞，已接受 | 保留静态同步证据；Claude gateway 502 恢复后补跑 A1-A4，不把 Codex 结果伪装成 Claude 实机证据 | 环境恢复后 |
| 项目具体部署/恢复适配 | 持续责任 | base 只保留平台无关合同；由每个 project-preset 和 `/ship` 落地真实环境证据 | 每个项目发布时 |
| 公共 preset 孵化 | 暂停 | 至少三个已激活项目出现稳定、重复、可验证的共同模式后再评估 | 达到样本门槛后 |

## 进度

- [x] N1 共同探索与决策 - done - 最近更新：2026-07-11
- [x] N2 产品模型 - done - 最近更新：2026-07-11
- [x] N3 架构主干 - done - 最近更新：2026-07-11
- [x] N4 规划产物体系 - done - 最近更新：2026-07-11
- [x] N5 受控开发循环 - done - 最近更新：2026-07-11
- [x] N6 变更影响与完整性 - done - 最近更新：2026-07-11
- [x] N7 安全、发布与运行保障 - done - 最近更新：2026-07-11
- [ ] N8 Project Preset、决策门禁与真实验证 - in_progress（仅剩 N8.1.5 feedback 闭环） - 最近更新：2026-07-12

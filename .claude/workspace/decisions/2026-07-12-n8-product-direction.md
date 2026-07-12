# N8 Product Direction Decision

> 状态：accepted
> Decision ID：OD-N8-001
> 模块：N8
> 决策日期：2026-07-12

## Owner Decision Brief

- Decision: 项目下一阶段采用“通用执行层复用 + base/project-preset 项目治理层 + N8 真实验证”路线，冻结新增通用 preset 和重复的编码执行工作流。
- Context: 当前通用需求澄清、TDD、调试、子代理和代码审查能力与成熟生态存在明显重叠；项目专属 preset 的生成、校验、激活和反馈闭环尚未完成，Owner Decision 也尚未在完全访问权限下通过真实交互验证。
- Recommendation: 选择 A，优先完成 project-preset 生命周期、Owner Decision Gate、三类真实项目 dogfood 和验证后的主线切换。
- Options:
  - A: 项目治理层路线 - base 提供通用底座，project-preset 承载项目差异，执行能力优先复用现有 agent/runtime/第三方生态。
  - B: preset 平台路线 - 继续新增大量技术栈 preset，覆盖面更广，但重复建设和长期维护成本更高。
  - C: 维持现状继续扩命令 - 短期变更较少，但无法证明项目独特价值，也不能解决 Owner 决策未触发的问题。
- If no reply: 只规划 A 的 N8 验证，不进行高影响迁移、删除或公共 preset 扩张。

## Owner Confirmation

- Confirmed option: A
- Confirmed by: Owner
- Confirmation date: 2026-07-12

## Consequences

- 不再以增加通用技术栈 preset、通用编码 skill 或大型 agent swarm 作为近期产品增长方向。
- `base -> project-profile -> project-preset -> validate -> activate -> feedback` 成为 N8 的首要验证链路。
- 完全访问权限、自动批准模式或文件系统权限不得绕过产品范围、长期架构、安全隐私、不可逆操作和正式发布等 Owner Decision。
- 新公共 preset 只有在至少三个独立项目的 project-preset 中出现稳定、重复、可验证的共同模式后才进入孵化评估。
- N8 验证不通过时，保留项目治理和交付证据能力，通用执行层优先收敛为与成熟生态集成，而不是继续独立重建。

## Rollback

该决策先冻结扩张并增加验证，不删除现有 preset、命令或历史 artifact。若真实 dogfood 证明 project-preset 和治理层没有产生可观察价值，可通过新的 Owner Decision 将项目收敛为轻量模板或成熟执行框架的补充插件。

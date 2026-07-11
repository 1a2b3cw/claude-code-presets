# ADR-001: vNext 分层 Artifact 架构

> 状态：accepted
> 日期：2026-07-11
> 决策范围：N3 架构主干

## Context

旧流程中产品理解、规划、实现、状态展示和报告容易交叉写入，导致局部工作完成后仍无法判断它是否服务产品主线。N2 已建立 Product Model，需要一个不依赖具体技术栈的架构把它接到规划、交付和运行证据。

## Decision

采用 A1-A7 分层 artifact 架构：A2 拥有产品上下文，A3 拥有架构上下文，A4 拥有规划，A5 执行交付，A6 保存证据与运行保障，A7 只读展示和兼容迁移。主链单向向下；A6 只能以已验证反馈触发上游分析，不能自动改写事实。

## Alternatives

- 单一万能 Project Model：暂不采用。它会过早把产品、架构、执行和证据耦合成一个难以演进的文档或数据结构。
- 继续沿用独立命令文档：拒绝。无法表达事实归属和跨层依赖，不能防止局部修改偏航。

## Consequences

- 后续 roadmap/spec 必须携带 Capability、Journey 和 Architecture Component 引用。
- N4 需要把引用和读取优先级落成具体 artifact 机制。
- N7/N8 必须把 A6/A7 的运行保障和 legacy 退出条件补齐。

## Rollback

本决策只新增 Markdown 架构合同和角色读取约束，没有数据迁移。若真实项目验证表明层次过重，可保留 Product Brief/Product Model，并在 N8 用新的 ADR 收敛或合并 A3-A4；不得直接删除现有证据。

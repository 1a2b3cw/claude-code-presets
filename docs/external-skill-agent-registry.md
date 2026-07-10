# 外部 Skill / Agent 采纳 Registry

## 目标

外部 skill / agent 采纳 registry 用来管理“值得观察、评估、采纳或拒绝”的外部能力，避免看到一个有趣仓库就直接复制进项目。它回答四个问题：

1. 这个外部能力解决什么重复问题。
2. 它当前处于 watching、candidate、adopted、rejected 哪个阶段。
3. 采纳它需要满足哪些质量、安全和维护条件。
4. 如果采纳，应该变成 skill、agent、rule、template 还是命令文档。

T7.1 只定义文档和模板，不实现自动安装、不拉取远程代码、不改变现有 skill 加载机制。

## Registry 路径建议

| 路径 | 用途 |
|------|------|
| `workspace/ecosystem/registry.md` | 当前项目的人类可读 registry |
| `workspace/ecosystem/candidates/<slug>.md` | 单个候选项评估记录 |
| `docs/templates/external-skill-agent-entry.md` | 可复制的候选项模板 |

第一版可以只维护 Markdown；未来需要机器读取时，再增加 JSONL 或 frontmatter。

## 状态机

| 状态 | 含义 | 进入条件 | 退出条件 |
|------|------|----------|----------|
| `watching` | 值得观察，但价值或质量还没证明 | 发现外部 skill/agent/rule，有潜在价值 | 升为 `candidate` 或降为 `rejected` |
| `candidate` | 准备做正式评估 | 有明确用例、来源可信、维护状态可接受 | 升为 `adopted` 或降为 `rejected` |
| `adopted` | 已采纳为项目能力 | 通过质量、安全、许可、维护和适配检查 | 后续可标记为 replaced/deprecated，但 T7 不新增状态 |
| `rejected` | 不采纳 | 价值不足、质量不达标、安全/许可/维护风险不可接受 | 后续出现新证据可重新建候选项 |

状态只能单向推进，不回写历史记录；如果重新评估 rejected 项，创建新评估记录并引用旧记录。

## 候选来源

| 来源 | 示例 | 风险提示 |
|------|------|----------|
| GitHub repo | 外部 Claude/Codex skills、agents、commands | 代码质量、许可、维护状态不稳定 |
| 内部项目 | 其他项目沉淀的规则或 agent | 可能过度贴合原项目 |
| 社区文章 | prompt、workflow、review checklist | 可能缺少测试和真实使用证据 |
| 工具文档 | 官方 best practices | 可能不是可直接落地的 skill |
| 本项目 metrics | repeated failures 触发的新规则需求 | 需要确认不是偶发噪声 |

## 采纳类型

| 类型 | 适合场景 | 输出位置 |
|------|----------|----------|
| Skill | 稳定、可复用、需要专门流程的能力 | `.agents/skills/<name>/SKILL.md` |
| Agent | 需要角色边界、长期职责或独立上下文 | `.agents/agents/<name>.md` 或 `.codex/agents/<name>.toml` |
| Rule | 应一直遵守的项目约束 | `.agents/rules/<name>.md` 或 `project-preset/rules/` |
| Command doc | 一条可执行流程入口 | `.agents/commands/<name>.md` |
| Template | 可复制的 artifact 格式 | `docs/templates/` 或 `workspace/templates/` |
| Reference | 只作为资料，不进入执行流程 | `docs/` 或候选记录 |

默认优先采纳为 reference/template/rule，只有明确有重复流程价值时才升级为 skill 或 agent。

## 评估维度

| 维度 | 问题 | 阻塞条件 |
|------|------|----------|
| 价值 | 是否解决真实重复问题 | 没有明确使用场景 |
| 适配 | 是否符合当前 AGENTS.md 和 preset 架构 | 要求重写核心流程 |
| 安全 | 是否引入命令执行、凭据、网络写入或供应链风险 | 需要未授权外部访问 |
| 质量 | 是否有清晰输入、输出、边界和失败处理 | 指令含糊、不可验证 |
| 维护 | 来源是否活跃，是否容易更新 | 无来源、无许可、无人维护 |
| 许可 | 是否允许复制、修改和分发 | 许可不明或不兼容 |
| 成本 | 是否会增加用户维护负担 | 需要手填大量状态 |

### 推荐评分

每项 0-2 分：

- 0：不满足或风险高。
- 1：部分满足，需要适配。
- 2：满足，证据清楚。

采纳建议：

| 总分 | 建议 |
|------|------|
| 0-6 | `rejected` |
| 7-10 | 保持 `watching` 或补证据 |
| 11-13 | `candidate` |
| 14 | 可进入 `adopted` |

安全或许可为 0 分时，不允许进入 `adopted`。

## 采纳流程

1. 记录来源、作者、链接、许可和发现原因。
2. 写清它解决的重复问题，必须关联 tasks、events、review、release 或 metrics 证据之一。
3. 给出采纳类型建议：skill、agent、rule、command、template 或 reference。
4. 按评估维度打分并写证据。
5. 明确适配计划：保留、改写、删除和不采纳哪些部分。
6. 进入 `candidate` 后，先做小范围试用或文档化评审。
7. 进入 `adopted` 前，必须确认许可、安全边界和维护责任。
8. 如果 rejected，写清原因，避免未来重复评估。

## Registry 总览格式

```markdown
# Ecosystem Registry

| ID | 名称 | 类型 | 状态 | 来源 | 价值假设 | 最近更新 | 下一步 |
|----|------|------|------|------|----------|----------|--------|
| ECO-001 | Example Review Skill | skill | watching | GitHub URL | 降低 review 打回 | 2026-07-10 | 补许可证据 |
```

## 候选记录必须包含

- ID：`ECO-001` 这类稳定编号。
- 名称和来源。
- 状态：`watching` / `candidate` / `adopted` / `rejected`。
- 类型建议：skill / agent / rule / command / template / reference。
- 价值假设。
- 证据来源：events、metrics、review、release、issue 或人工观察。
- 评估分数。
- 安全和许可结论。
- 适配计划。
- 下一步。

## 不采纳标准

满足任一条件，默认 `rejected`：

- 需要未授权的外部网络写入。
- 要求保存或传输密钥、token、私有代码片段。
- 许可不明且需要复制内容进仓库。
- 指令不可验证，只是泛泛建议。
- 与 AGENTS.md 的“简洁优先、精准修改、小任务轻流程”冲突。
- 会让用户维护重复状态或大量手工指标。

## 和现有工具的关系

- `skill-curator`：负责评估外部 skill/agent 质量，可使用 registry 模板输出候选记录。
- `project-preset`：如果候选能力最终变成项目规则或 preset，必须保留采纳理由和来源。
- `/standup`：未来可以读取 registry，提醒 candidate 的下一步评估动作。
- Workbench：未来可以展示 ecosystem candidates，但不应默认打扰日常开发。

## 非目标

- 不实现自动安装。
- 不从 GitHub 自动抓取 skill/agent。
- 不把第三方代码直接复制到 `.agents/skills/`。
- 不新增 marketplace。
- 不替代人工许可和安全判断。

## 验收标准

- 能用四种状态管理外部 skill/agent 的采纳过程。
- 每个候选项都有价值、证据、安全、许可和适配记录。
- 明确何时拒绝候选项，避免重复评估。
- 提供可复制模板，后续可以直接创建候选记录。
- 不引入自动安装、网络访问或供应链风险。

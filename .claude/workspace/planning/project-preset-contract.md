# Project Preset Contract

> 状态：active
> Contract ID：PPC-VNEXT-001
> Product Brief ID：PB-VNEXT-001
> Owner：A2 Project Context / A4 Planning Context
> 更新于：2026-07-12

## 目的

让 `base` 安装后的项目专属规则从“命令文档约定”变成可检查、可发现、可被后续流程一致加载的输入。它不把项目内容复制到可由 `update` 覆盖的团队配置，也不创建第二份项目状态。

## 结构与所有权

```text
project-profile/              # 项目事实、已确认决策、推断与未决问题
project-preset/
├── PRESET.md                 # 入口与加载索引
├── manifest.json             # 稳定引用与优先级
├── curation.md               # skill-curator 审查结论
├── rules/                    # 已确认的短硬规则
├── specs/                    # 按需深入参考
└── skills/                   # 仅保留通过准入的项目专属 skill
```

- `project-profile/` 拥有扫描事实与确认状态；未确认推断不得成为 rule。
- `project-preset/` 只拥有已确认的项目差异，不复制公共团队规则或技术栈 preset。
- `.claude/`、`.agents/`、`.codex/` 由安装器和同步器拥有；`project-preset/` 内不得嵌套这些目录。
- `roadmap/spec/tasks/events` 继续按 Planning Artifact Contract 拥有产品模块、执行状态和证据；project-preset 不替代它们。

## Manifest 与 Curation

`manifest.json` 必须声明：`name`（固定为 `project-preset`）、version、source、generatedAt、updatedAt、priority（固定为 `project-over-technical-preset`）、profileDir（固定为 `project-profile`）、curation（固定为 `curation.md`）、rules 数组和 specs 数组。

`curation.md` 必须包含单行 `- 审查结论：通过 / 需修订 / 暂停等待用户确认`。只有“通过”可作为可加载项目 preset；其余结论不被静默加载。

## 读取与降级

存在且通过 `project-preset validate` 时，读取顺序固定为：

```text
project-preset/PRESET.md -> manifest 声明的 rules -> 按需 specs -> base / 已安装技术栈 preset
```

不存在 project-preset 时，现有项目继续使用 base/技术栈 preset，不阻塞开发；命令应提示可按需运行 `/project-preset`。存在但校验失败时，不得把它当作规则加载，必须指出修复路径。

## CLI 边界

- `project-preset validate` 只校验目录、manifest、引用、curation 和项目 skill 的最小合同。
- `project-preset context` 只输出是否可加载和应读取的文件；它不代表 agent 已理解、遵守或验证这些规则。
- 两个命令均为只读，不生成、修改、复制或合并任何 project-profile/project-preset 文件。

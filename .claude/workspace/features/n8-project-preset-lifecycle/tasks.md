# N8.1 Project Preset Lifecycle Tasks

> 状态：in_progress
> Task Set：N8-TASKS-001
> Spec：`spec.md`
> Roadmap Module：N8
> 执行包：`.claude/workspace/features/n8-project-preset-lifecycle/`
> 更新于：2026-07-12

## Spec/Task Quality Gate

- 当前结果：pass。N8.1.1-N8.1.4 已通过；2026-07-12 复盘后新增 N8.1.5，当前尚未完成。
- 本轮范围：保留已通过的 Contract、validator/context、核心入口加载和同步验证；补齐受控 feedback 更新闭环。
- 不做：自动生成项目 preset、目录复制/overlay、通用 preset 扩张、Owner Decision Gate、真实项目 dogfood、迁移删除。
- Builder 状态：N8.1.1-N8.1.4 已完成；N8.1.5 planned。不重做前四项，不扩大到公共 preset 或通用执行层。

### N8.1.1 定义 Project Preset Contract 与测试 fixture

- **任务 ID**：N8.1.1
- **状态**：done
- **描述**：定义 project-preset 的确定性最小结构、manifest/curation 字段、允许目录、禁止嵌套目录和降级行为，并创建有效/无效 fixture helpers。
- **验收标准**：D13/D14 的结构边界可由固定输入验证；没有 project-preset 的项目仍能获得明确降级结果。
- **验收命令**：`node create-claude-team/cli.js project-preset validate`、`npm test`
- **阻塞原因**：无
- **Gate 结果**：local pass / review pass / release not_required
- **产物**：`.claude/workspace/planning/project-preset-contract.md`、`create-claude-team/lib/project-preset.js`、smoke fixture helpers
- **最近更新**：2026-07-12

### N8.1.2 实现只读 validator 与 context CLI

- **任务 ID**：N8.1.2
- **状态**：done
- **描述**：实现 `project-preset validate` 与 `project-preset context [--json]`，接入帮助文本和非零退出码；输出路径、问题和下一步，不写入项目文件。
- **验收标准**：有效 preset pass；非法 JSON、缺失引用、禁止目录、无效 curation/skill 被拒绝；context 返回稳定读取顺序。
- **验收命令**：`npm test`、`node create-claude-team/cli.js project-preset context --json`
- **阻塞原因**：无
- **Gate 结果**：local pass / review pass / release not_required
- **产物**：`create-claude-team/cli.js`、`create-claude-team/lib/project-preset.js`、`create-claude-team/scripts/smoke-test.js`
- **最近更新**：2026-07-12

### N8.1.3 接入核心流程与 Claude/Codex 同步

- **任务 ID**：N8.1.3
- **状态**：done
- **描述**：给 plan/dev/fix/check/review-all/ship/standup 注入统一的 project-preset 加载与降级契约，同步并测试 Claude 源命令和 Codex skills。
- **验收标准**：D15 通过；所有入口保持 `PRESET -> rules -> specs -> base/技术栈回退` 顺序；无效 preset 不被静默加载。
- **验收命令**：`node create-claude-team/cli.js update`、`npm test`
- **阻塞原因**：无
- **Gate 结果**：local pass / review pass / release not_required
- **产物**：`.claude/commands/*.md`、`.agents/commands/*.md`、`.agents/skills/team-command-*/SKILL.md`
- **最近更新**：2026-07-12

### N8.1.4 系统验证与交付证据

- **任务 ID**：N8.1.4
- **状态**：done
- **描述**：执行本地门禁、tarball 初始化/更新场景和系统审查，记录本轮的 scope、剩余风险与 N8.2/N8.3 边界。
- **验收标准**：D13-D15 与全部项目命令通过；报告明确“加载契约已验证，不等于真实 dogfood 已完成”。
- **验收命令**：`npm run gate`、`npm run test:tarball`、`node create-claude-team/cli.js planning validate`、`/review-all --system N8`
- **阻塞原因**：无
- **Gate 结果**：local pass / review pass / release not_required
- **产物**：`.claude/workspace/reviews/2026-07-12-n8-project-preset-lifecycle.md`、`.claude/workspace/events.jsonl`
- **最近更新**：2026-07-12

### N8.1.5 闭合真实反馈到 Project Preset 的受控更新

- **任务 ID**：N8.1.5
- **状态**：blocked
- **描述**：把 Owner 明确反馈或 review/standup/events 中可复核的重复证据，转成一份最小 preset 修改建议。建议必须展示证据、拟改文件、不改范围和风险；Owner 未确认时零写入。确认后只修改相关 profile/preset 文件，经 skill-curator 审查，再重新 validate/context 并验证核心入口能读到新规则。
- **验收标准**：D25 通过；至少一个已激活的真实项目完成 `feedback -> proposal -> Owner confirmation -> curation -> validate/context -> reload`；拒绝或未确认时 git diff 为空；一次偶发失败不能直接变成规则。
- **验收命令**：在 `create-claude-team/` 运行 `npm run gate` 与 `npm run test:tarball`；在仓库根目录运行 `node create-claude-team/cli.js planning validate`；在真实项目运行 `project-preset validate`、`project-preset context --json` 并核验更新前后 diff。
- **优先级**：P0，N8 关单前必须完成。
- **阻塞原因**：Owner 已拒绝 PetCare 候选 `PPFB-20260712-001`；Target Files 未修改，且不自动生成替代规则。N8.1.5 需等待一条新的、与已拒绝候选实质不同的 Owner 反馈或可复核重复证据，再建立新 proposal。
- **Gate 结果**：spec/task pass；delivery preflight/transition pass；local pass；review pass；release not_required；acceptance blocked after Owner rejection；fix pass
- **产物**：最小 feedback proposal 契约、对应流程/回归测试、`.claude/workspace/reviews/2026-07-12-n8-feedback-lifecycle.md`、PetCare 的 `project-profile/feedback/2026-07-12-validation-evidence.md`。
- **最近更新**：2026-07-12

## 建议顺序

```text
N8.1.1 -> N8.1.2 -> N8.1.3 -> N8.1.4 -> N8.1.5
```

N8.2-N8.5 的历史任务保持完成，不因 N8.1.5 重做。N8.1.5 只补 feedback 行为闭环，不新建 N8.6，不把样本扩展或 Claude runtime 环境问题混成功能开发。

## 收口证据

- Contract：`.claude/workspace/planning/project-preset-contract.md`。
- 审查报告：`.claude/workspace/reviews/2026-07-12-n8-project-preset-lifecycle.md`。
- 历史本地门禁：N8.1.1-N8.1.4 的 `npm run gate`（701 通过）和 `npm run test:tarball` 通过；该证据不覆盖 N8.1.5。
- 主链验证：`project-preset validate`、`project-preset context --json`、`planning validate` 通过；本仓库未配置 project-preset 时明确返回 `absent` fallback。

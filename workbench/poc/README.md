# Workbench PoC

本目录是本地项目驾驶舱 PoC。它只读本仓库里的可信状态 artifact，不写数据库、不接云服务、不修改项目状态。

## 运行

```bash
node workbench/poc/server.mjs
```

打开：

```text
http://127.0.0.1:4185
```

可用性检查：

```bash
node workbench/poc/server.mjs --check
```

## 数据源

- `docs/maturity-roadmap.md`
- `docs/maturity-tasks.md`
- `docs/productivity-roadmap.md`
- `docs/productivity-tasks.md`
- `.claude/workspace/events.jsonl`
- `.claude/workspace/reviews/*.md`
- `.claude/workspace/releases/*.md`
- `.claude/workspace/cleanup/*.md`
- `.claude/workspace/dogfood.md`
- `create-claude-team/lib/state-tools.js`

代码仍保留对旧 `workspace/releases/*.md` 和 `workspace/dogfood.md` 的只读 fallback，用于打开未迁移的历史项目；本仓库的当前事实源已经迁到 `.claude/workspace/`。

## 当前范围

- 今日：可信状态、阻塞、审查、发布、最近运行和下一步动作。
- 任务：点击任务查看目标、验收和复制任务命令。
- 运行：点击运行记录查看检查结果。
- 证据：查看 review/release 报告、artifact 和 failureRecovery。
- 清理：展示 Delivery Steward 的 Artifact Cleanup 报告或空状态。
- all-done：当前任务集全部完成时，给出发布确认、dogfood、复盘或下一轮动作。

## 不做

- 不做登录。
- 不做数据库。
- 不接真实云服务。
- 不修改 artifact，只读取并展示。

# Workbench PoC

本目录是 Phase 5 的本地 artifact PoC。它只读本仓库里的 Markdown/JSONL 文件，不写数据库、不接云服务、不修改 CLI。

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

- `docs/productivity-roadmap.md`
- `docs/productivity-tasks.md`
- `.claude/workspace/events.jsonl`

## 当前范围

- Today：当前阶段、焦点任务、阻塞数、最近 run、下一步建议。
- Task Focus：Phase 5 当前任务、目标、状态、任务队列和进度。

## 不做

- 不做登录。
- 不做数据库。
- 不接真实云服务。
- 不修改 artifact，只读取并展示。

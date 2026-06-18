# 项目优化升级决策文档

> 决策人:Claude(代项目维护)｜日期:2026-06-18｜版本基线:v3.0.1
>
> 本文档是**行动清单**,不是讨论稿。按优先级从上往下做,每一项都给了"怎么验证"。
> 不需要一次做完,但 **P0 必须先做**,否则现在发布出去会坑用户。

---

## 0. 怎么用这份文档

1. 从 **P0** 开始,一项一项来,做完一项跑一次它的"验证方法"再进下一项
2. 每个大批次结束后 commit 一次,commit message 引用本文档的小节号(如 `fix: P0.1 update 命令删除公共技能`)
3. P1 是你明确要的 AI 预设扩展,P0 修完就做这个
4. P2 是健壮性收尾,可以放到最后或穿插

**最小可发布线 = P0 全部完成。** 在那之前不要 `npm publish`。

---

## 1. 优先级总览

| 编号 | 问题 | 严重度 | 一句话影响 |
|------|------|--------|-----------|
| P0.1 | `update` 命令会删掉公共 skills/rules | 🔴 致命 | 用户跑一次 update 就丢 6 个公共技能 + 公共规则 |
| P0.2 | 配置双源:`create-claude-team/` 里有一份冗余副本且进了 git | 🔴 致命 | 两份配置必然漂移,发布出去的是旧的/错的 |
| P1.1 | AI 预设只有 Python 路线 | 🟡 重要 | 你会 web 却用不上,覆盖窄 |
| P1.2 | 没有明确"反框架"立场 | 🟡 重要 | AI 可能默认上 LangChain 全家桶,违背设计初衷 |
| P1.3 | `ai-knowledge-base` 命名已经配不上内容 | 🟢 可选 | 现在已含 Agent/结构化输出,名字还是"知识库" |
| P2.1 | hooks 是 `.sh`,Windows 下能否跑未验证 | 🟡 重要 | 你自己就在 Windows,hooks 可能静默失效 |
| P2.2 | CLI 没有任何测试 | 🟡 重要 | P0.1 这种 bug 本该被一个冒烟测试拦住 |
| P2.3 | 文档/元数据不一致(URL、计数、过期报告) | 🟢 可选 | 不影响功能,影响专业度 |

---

## 2. P0 — 必须先修

### P0.1 `update` 命令会删除公共 skills/rules 【确认的 BUG】

**问题**:`create-claude-team/lib/update.js` 的更新逻辑分两步:
1. 先复制底座目录:对 `skills/` 先 `rm` 再 copy → 此时只有 6 个公共技能
2. 再叠加预设目录:对 `skills/` **又一次 `rm`** 再 copy → **把刚复制的 6 个公共技能删掉**,只剩预设的 8 个

`init.js` 用的是 `copyDir`(合并,不删),所以**安装是对的**;但 `update.js` 在预设叠加前多了一步 `rm`,导致**更新会丢东西**。受影响的是 `skills/` 和 `rules/`(底座和预设都有内容的目录)。

**为什么之前没发现**:没有测试,而且 init 正常,只有 update 出错。

**怎么验证(做之前先复现)**:
```
# 在临时目录
npx create-claude-team init --preset ai-knowledge-base
# 数一下技能数量,应该是 14(6 公共 + 8 预设)
ls .claude/skills | wc -l        # 期望 14

npx create-claude-team update
ls .claude/skills | wc -l        # 如果变成 8,bug 复现
ls .claude/rules                 # 公共的 git.md/design.md 是否还在
```

**决策(怎么修)**:预设叠加阶段**不要 `rm`**,改成和 init 一样用合并式 `copyDir`。即删掉 update.js 预设循环里的那行 `if (existsSync(dest)) await rm(...)`。
- 风险:预设里被删除的旧文件不会被清掉(残留)。但当前预设文件名稳定,可接受。彻底方案是"先全删 → 底座+预设一起合并复制",但那是 P2.2 加测试后再重构。

**完成标志**:上面验证脚本 update 后技能仍是 14,公共规则仍在。

---

### P0.2 配置双源问题 — `create-claude-team/` 里的冗余副本

**问题**:`create-claude-team/.claude/` 和 `create-claude-team/presets/` 是仓库根目录的**完整副本**,而且**被 git 跟踪了**(45 个文件)。机制是 `scripts/sync-config.js` 在 `prepublishOnly` 时从根目录同步过去。

这是典型的"两个真理来源"。证据:本次接手时我发现 `create-claude-team/.claude/CLAUDE.md` 还停在 v2.0.2,而根目录已是 v3.0.0 —— **已经漂移了**。现在 create-claude-team 副本里也**没有我新加的 AI 技能/specs**,又漂移了一次。

**为什么致命**:发布到 npm 的是 create-claude-team 目录里的副本。如果你忘了同步(或同步脚本没跑),用户 `npx` 装到的就是旧配置。你改了根目录以为生效了,其实没有。

**怎么验证**:
```
git ls-files create-claude-team/.claude | head   # 能列出文件 = 被跟踪 = 有问题
diff -r .claude create-claude-team/.claude         # 有 diff = 已漂移
```

**决策(怎么修)**:让副本**只在发布时生成,不进 git**。
1. 在 `create-claude-team/.gitignore`(或根 `.gitignore`)加入:
   ```
   create-claude-team/.claude/
   create-claude-team/presets/
   ```
2. `git rm -r --cached create-claude-team/.claude create-claude-team/presets`(从跟踪移除,保留本地文件)
3. 确认 `sync-config.js` 在 `prepublishOnly` 跑 —— 已经配好了,发布时会重新生成
4. (可选,更稳)发布前手动跑一次 `npm run prepublishOnly` 然后 `npm pack`,检查 tar 内容

**完成标志**:`git ls-files create-claude-team/.claude` 输出为空;`npm pack` 出来的包里 `.claude/` 和 `presets/` 内容与根目录一致。

> 注:`homepage` 在 package.json 里写的是 `claude-team-config`,实际远程是 `claude-code-presets`,顺手一起改(见 P2.3)。

---

## 3. P1 — AI 预设扩展(你的核心需求)

### P1.1 / P1.2 决策:AI 预设改成"双语言 + 反框架"

我作为决策者拍板,**不拆成两个预设**,理由:RAG / Agent / Prompt / 评估 / 嵌入这些概念 70% 与语言无关,拆开就是又一次 P0.2 式的重复维护。改成**一个预设,安装时选主语言**:

**结构决策**:
- **Rules(始终加载)** → 必须按语言分。安装时只装匹配语言的那套,避免 Python 和 TS 规则同时灌给 AI 造成混乱
- **Skills(按需触发)** → 同时保留两种语言无妨,AI 按描述匹配自己挑。语言无关的概念类技能(rag-pipeline、prompt-engineering、llm-evaluation)正文里**同时给 Python 和 TS 两段示例**
- **Specs(按需读取)** → 按语言分文件(`specs/python.md` / `specs/typescript.md`)

**CLI 配合**:`init` 对 AI 预设增加语言选择
```
npx create-claude-team init --preset ai-knowledge-base --lang typescript
# 或交互式提问"主语言? Python / TypeScript"
```
只复制对应语言的 rules/specs。`.preset` 标记文件里也记下语言(给 update 用)。

**TypeScript 路线要补的内容**:
- `rules/typescript-ai.md` —— AI 项目的 TS 规则(Zod 校验、`ai` SDK 用法约束、错误处理)
- `specs/typescript.md` —— TS AI 后端参考(Hono + `ai` SDK + pgvector via drizzle/postgres.js + 测试)
- 把 `ai-agents`、`structured-output`、`rag-pipeline` 等技能补上 TS 示例(对应 Vercel AI SDK 的 `generateText` / `generateObject` / `streamText` / 工具调用)
- `embedding`、`vector-db` 技能补 TS 侧的 pgvector 操作

**反框架立场(P1.2)** —— 写进 `rules/llm.md` 和 `rules/agents.md` 顶部,明确:
- **默认裸 SDK**(Anthropic SDK / Vercel AI SDK),不引入 LangChain / LlamaIndex
- 仅在以下场景才考虑重框架:需要现成的多数据源连接器、团队已有 LangChain 资产、快速原型
- 引用依据:Anthropic《Building Effective Agents》—— 少抽象、可控、可调试优先

**怎么验证**:
```
npx create-claude-team init --preset ai-knowledge-base --lang typescript
cat .claude/rules/ | grep -L python    # 不应有 python.md
ls .claude/specs                        # 应有 typescript.md,无 python.md
# 在装好的项目里让 Claude "做一个 RAG 检索接口",看它是否用 ai SDK 而非 LangChain
```

**完成标志**:两种语言各自 init 出来的 rules/specs 互不污染;TS 路线的技能示例可直接抄用且不依赖 Vercel 部署。

---

### P1.3 (可选)重命名 `ai-knowledge-base` → `ai-app`

**问题**:预设现在覆盖 RAG + Agent + 结构化输出 + LLM 服务,"知识库"这名字已经偏窄。

**决策**:**建议重命名为 `ai-app`**,因为项目还没正式发布(pre-1.0),改名成本最低就是现在。保留 `ai-knowledge-base` 作为 CLI 的别名,避免老命令报错。

**怎么验证**:`npx create-claude-team init --preset ai-app` 和 `--preset ai-knowledge-base` 都能装上同一套。

> 如果嫌麻烦,这条可以跳过,不影响功能。

---

## 4. P2 — 健壮性与一致性

### P2.1 hooks 在 Windows 的可移植性

**问题**:`settings.json` 里 hooks 是 `bash ".../security-check.sh"`。你在 Windows 上开发,`bash` 要靠 Git Bash 在 PATH 里才行。如果没有,PreToolUse hook 可能静默失败 —— 等于安全检查形同虚设,而你不会收到提示。

**怎么验证**:
```
# 在你的 Windows 机器上,装好配置后,故意让 Claude 写一段含 eval() 的代码
# 看 security-check.sh 是否拦截(应该 exit 2 阻止)
# 如果毫无反应 → hook 没跑起来
which bash    # 确认 bash 是否可用
```

**决策(三选一,按你情况)**:
- A. **接受现状 + 文档说明**:README 注明"hooks 需要 Git Bash(Windows 用户基本都有)"。成本最低
- B. **加 Node 版 hook 作为兜底**:把 security-check 逻辑用 Node 重写一份(跨平台),settings.json 改成 `node .../security-check.mjs`。最稳但有工作量
- C. **两者都留**,settings.json 里按平台分流

我倾向 **A 现在做,B 列入 backlog**:先确认你的机器上 bash 版能跑,能跑就够用,跨平台等真有非 Git Bash 用户再说。

---

### P2.2 CLI 缺少冒烟测试

**问题**:`create-claude-team` 是个分发工具,却没有一个测试。P0.1 那种 bug 本该被自动测试拦住。

**决策**:加一个最小冒烟测试(不需要测试框架,一个 node 脚本即可):
1. init 到临时目录 → 断言:`.claude/CLAUDE.md` 存在、skills 数量正确(14)、`.mcp.json` 已合并预设、`.preset` 内容正确
2. update 同一目录 → 断言:技能数量**仍是 14**(守住 P0.1)、`settings.json`/`workspace/` 未被改动
3. 两种预设各跑一遍

**怎么验证**:`npm test` 通过;故意把 P0.1 的 bug 改回去,测试应该变红。

**完成标志**:有 `npm test`,CI(如果配)绿。

---

### P2.3 文档与元数据一致性

逐项检查(都是小修):
- [ ] `package.json` 的 `homepage` / `bugs` URL:`claude-team-config` → 实际仓库 `claude-code-presets`
- [ ] README / USAGE 里的 Agent/Skill **数量**是否和实际一致(这类计数最容易漂)。验证:`ls .claude/agents | wc -l` 对照文档
- [ ] `MODIFICATION-REPORT.md` 是 v2.0 的一次性产物,已被 CHANGELOG 覆盖 → **决策:删除或移入 `docs/archive/`**
- [ ] `USAGE.md` / `BEST-PRACTICES.md` 是否还提 5 个 MCP、旧命令数等过期信息
- [ ] CHANGELOG 版本号与 package.json `version` 是否对齐(现在 package.json 是 3.0.0,CHANGELOG 已到 3.0.1 → 发布前对齐)

**怎么验证**:全局搜过期关键词
```
grep -rn "claude-team-config\|5 个 MCP\|14 个 Skill" . --include="*.md"
```

---

## 5. 完整检查清单(可勾选)

```
P0(发布前必做)
[x] P0.1 修 update.js 预设叠加删除 bug + 复现验证通过   ← 已修(注入测试确认可拦截)
[x] P0.2 create-claude-team 副本移出 git + gitignore + npm pack 验证   ← 已修

P1(AI 预设扩展,你的核心需求)
[x] P1.1 init 增加 --lang 语言选择(Python/TypeScript)   ← 已做
[x] P1.1 新增 TS 路线:rules/typescript-ai.md + specs/typescript.md   ← 已做(+ rag.md)
[x] P1.1 技能补 TS 示例(ai-agents/structured-output 完整;其余加指引)   ← 已做
[x] P1.1 specs 按语言隔离(lang/python/ 与 lang/typescript/)   ← 已做
[x] P1.2 rules/llm.md + rules/agents.md 写入"默认裸 SDK,反框架"立场   ← 已做
[ ] P1.3 (可选)重命名 ai-knowledge-base → ai-app(保留别名)   ← 暂缓(避免大量路径改动)

P2(健壮性收尾)
[ ] P2.1 验证 Windows 下 hooks 能跑 + README 注明 Git Bash 要求
[x] P2.2 加 CLI 冒烟测试(init/update × 两预设)   ← 已做(npm test,24 断言)
[~] P2.3 修 URL、对齐计数、处理 MODIFICATION-REPORT、对齐版本号   ← URL 和版本号已顺手修,其余待办
```

---

## 6. 我建议的执行批次

| 批次 | 内容 | 产出 commit |
|------|------|-------------|
| **第 1 批** | P0.1 + P0.2 | 修好分发,这之后才能安全发布 |
| **第 2 批** | P2.2(先加测试) | 有了测试网,后面改动有保障 |
| **第 3 批** | P1.1 + P1.2(AI 预设双语言 + 反框架) | 你的核心需求落地 |
| **第 4 批** | P1.3 + P2.1 + P2.3(收尾) | 命名、可移植、文档一致 |

> 把 P2.2(测试)提到 P1 之前,是因为 AI 预设扩展会大改文件,有测试网才不会再踩 P0.1 这种坑。

---

## 附:本次(v3.0.1)已完成的事

- AI 预设 6 技能补全 frontmatter + 新增 ai-agents / structured-output
- 新增 specs/(claude-api / python / rag)
- 新增 rules/agents.md,更新 rules/llm.md 模型 ID
- 重写 PRESET.md 定位
- 同步根 CLAUDE.md 到 create-claude-team(治标,根治见 P0.2)
- init.js 写入 .preset 标记,update.js 读取(但引入了 P0.1 的 bug,待修)
- 修 web-fullstack postgres MCP 包名

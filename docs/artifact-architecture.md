# Artifact Architecture

> Status: draft
> Updated: 2026-07-10
> Purpose: define where AI team documents and execution artifacts should live, so the project does not become a single messy document pile.

## Principle

Not every document belongs in `docs/`.

Use directory layers by lifespan and purpose:

- stable product/project truth goes near the project root or `project-profile/`;
- reusable framework documentation goes under `docs/`;
- active execution artifacts go under `.claude/workspace/`;
- generated evidence goes into dated report folders;
- stale or superseded material goes into archive, not the active path.

## Directory Layers

```text
/
├── AGENTS.md
├── product-brief.md
├── roadmap.md
├── tasks.md
├── project-profile/
├── project-preset/
├── preview/
├── docs/
│   ├── strategy/
│   ├── operating-model/
│   ├── workflows/
│   ├── integrations/
│   ├── workbench/
│   └── archive/
└── .claude/workspace/
    ├── specs/
    ├── reviews/
    ├── releases/
    ├── decisions/
    ├── cleanup/
    ├── archive/
    ├── events.jsonl
    ├── journal.md
    └── metrics.md
```

This is the target structure. Existing files do not need to move immediately. Delivery Steward should migrate them gradually with an Artifact Cleanup report.

## Root Files

Root files are for active, high-signal project state only.

| Path | Purpose | Rule |
|------|---------|------|
| `AGENTS.md` | AI team entry contract | keep short and operational |
| `product-brief.md` | current product definition | one active product brief only |
| `roadmap.md` | current product/module roadmap | one active roadmap only |
| `tasks.md` | current iteration tasks | one active task list only |

Do not put historical plans, old task lists, or exploratory notes at root. Archive or move them into `.claude/workspace/archive/`.

## `project-profile/`

Long-lived project facts and confirmed decisions.

Use for:

- product facts;
- technology stack;
- architecture summary;
- quality bar;
- acceptance standards;
- UI direction summary.

Do not use for:

- temporary task lists;
- one-off review notes;
- speculative rules not confirmed by evidence.

## `project-preset/`

Project-specific AI rules and references extracted from `project-profile/`.

Use for:

- project-only rules;
- project-only specs;
- curated project skills.

Do not copy generic preset rules into this directory. If a rule is not project-specific, keep it in the base or technical preset.

## `docs/`

Reusable framework documentation, not live execution state.

Target subfolders:

| Folder | Purpose | Examples |
|--------|---------|----------|
| `docs/strategy/` | roadmap and maturity planning | maturity roadmap, productivity roadmap |
| `docs/operating-model/` | team model and artifact governance | AI team operating model, artifact architecture |
| `docs/workflows/` | command/workflow explanations | planning flow, review flow |
| `docs/integrations/` | external service plans | GitHub integration |
| `docs/workbench/` | Workbench design docs | MVP/Alpha contracts |
| `docs/archive/` | superseded framework docs | old plans kept for history |

Rules:

- `docs/` should not be the dumping ground for every generated file.
- New docs at `docs/` root should be rare.
- If a doc is tied to one execution run, it belongs in `.claude/workspace/`, not `docs/`.
- If a doc is superseded, mark it and move it to `docs/archive/` in a cleanup pass.

## `.claude/workspace/`

Active execution memory and machine-readable state.

| Path | Purpose |
|------|---------|
| `.claude/workspace/specs/` | feature specs for current or recent work |
| `.claude/workspace/reviews/` | review reports |
| `.claude/workspace/releases/` | release reports |
| `.claude/workspace/decisions/` | Owner Decision Briefs and ADR-like lightweight decisions |
| `.claude/workspace/cleanup/` | Artifact Cleanup reports |
| `.claude/workspace/archive/` | old execution artifacts |
| `.claude/workspace/events.jsonl` | machine-readable command events |
| `.claude/workspace/journal.md` | concise continuity notes |
| `.claude/workspace/metrics.md` | human-readable process metrics |

`workspace/` at the repository root is legacy or temporary unless a project explicitly chooses it. Prefer `.claude/workspace/` for AI team state.

## `preview/`

Design authority for UI work.

Use for:

- design direction;
- UI prototypes;
- visual references created for implementation.

Do not mix product planning or task tracking into `preview/`.

## Naming Rules

Use predictable names:

```text
.claude/workspace/specs/YYYY-MM-DD-<feature>.md
.claude/workspace/reviews/YYYY-MM-DD-<scope>.md
.claude/workspace/releases/YYYY-MM-DD-<version-or-scope>.md
.claude/workspace/decisions/YYYY-MM-DD-<decision>.md
.claude/workspace/cleanup/YYYY-MM-DD-artifact-cleanup.md
```

Use lowercase kebab-case for generated file names.

## Human-Friendly Briefs

Owner-facing documents should sound like a capable teammate, not a form.

Avoid this when the task is simple:

```markdown
- Product outcome:
- Why now:
- Acceptance:
```

Prefer a short human explanation:

```markdown
这轮我建议先做登录状态恢复。它不显眼，但没有它，用户刷新页面就会丢会话，后面的设置页和团队页都会不稳定。本轮只做会话恢复和对应测试，不碰权限模型。做完后，你应该能刷新页面仍保持登录，测试也能覆盖过期 token 的情况。
```

Use structured bullets only when they make the decision easier.

## Migration Policy

Do not reorganize existing documents casually.

Delivery Steward should migrate in small cleanup passes:

1. list active source-of-truth files;
2. list duplicate or superseded files;
3. propose target locations;
4. preserve unique decisions;
5. archive before deleting unless the file is clearly generated or duplicated;
6. write `.claude/workspace/cleanup/YYYY-MM-DD-artifact-cleanup.md`.

High-impact deletion needs Owner confirmation.

## Current Cleanup Candidates

The current `docs/` root contains mixed document types. A future cleanup pass should classify these files before moving anything:

- strategy: `maturity-roadmap.md`, `maturity-tasks.md`, `productivity-roadmap.md`, `productivity-tasks.md`, `evolution-roadmap.md`
- operating model: `ai-team-operating-model.md`, `artifact-architecture.md`
- workbench: `workbench-mvp.md`, `workbench-alpha.md`
- integrations: `github-integration.md`, `multi-project-overview.md`
- future/experimental: `external-skill-agent-registry.md`, `metrics-driven-rule-recommendations.md`

Do not move them until commands and references are updated together.

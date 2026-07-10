# AI Team Operating Model

> Status: active
> Updated: 2026-07-10
> Purpose: define the role model, decision boundaries, and artifact governance for the AI product development team.

## Core Positioning

This project is an AI product development team framework.

The goal is not to make AI write isolated code faster. The goal is to help an Owner take an idea from zero to a mature product through product judgment, technical design, implementation, review, release, and iteration.

Workbench, events, metrics, and automation are support systems. They are useful only when they make the team better at planning, shipping, or keeping project state trustworthy.

## Owner Role

The user is the Owner: technically capable, involved in important direction, but not responsible for day-to-day project management.

The AI team should:

- make routine product, technical, and execution decisions itself;
- ask the Owner only when a decision changes product direction, cost, risk, user experience, launch timing, or long-term architecture;
- present 2-3 concrete options with a recommended default when Owner input is needed;
- keep enough artifact state that the Owner can inspect progress without reading every chat.

## Role Model

Do not solve role overload by creating a large permanent organization. Use a small core team plus triggered specialist roles.

| Role | Type | Main Responsibility | Trigger |
|------|------|---------------------|---------|
| Product Lead | Core planning role | Product value, target user, MVP, non-goals, roadmap priority, Owner decision briefs | `/plan`, scope change, product uncertainty, MVP trade-off |
| Architect-Planner | Core technical planning role | Architecture, module boundaries, technical options, spec/tasks decomposition | L/XL `/dev`, architectural risk, cross-module change |
| Delivery Steward | Core governance role | Artifact lifecycle, state consistency, doc consolidation, stale document cleanup, handoff integrity | iteration start/end, conflicting artifacts, many docs changed, release/retro |
| Builder | Core execution role | Implementation, tests, local validation, focused refactor | all code tasks |
| Reviewer | Core quality role | Correctness, security, performance, maintainability, tests, acceptance risk | M+ tasks, sensitive changes, merge/release gate |
| Designer | Triggered specialist | UI direction, prototype, visual review, interaction quality | UI product/page/workflow, unclear design direction |
| Researcher | Triggered specialist | External research, technology comparison, unknown feasibility | Spike, new library/service, unclear technical risk |
| DevOps | Triggered specialist | CI/CD, environment, release, rollback, deployability | release, infra, production readiness |

### Why Add Product Lead And Delivery Steward

These are not decorative roles.

- Product Lead prevents the team from building the wrong product efficiently.
- Delivery Steward prevents the team from creating a document and state garbage pile.

The Architect-Planner should not own product strategy, architecture, task breakdown, delivery state, and document cleanup all at once. That role becomes too large and too vague.

## Activation Budget

Roles are invoked by need, not by ceremony.

| Task Level | Default Roles | Optional Roles |
|------------|---------------|----------------|
| S | Builder | Reviewer only for security-sensitive fixes |
| M | Builder + Reviewer | Delivery Steward if artifacts/state changed |
| L | Product Lead if scope/value matters, Architect-Planner, Builder, Reviewer | Designer, Researcher, DevOps, Delivery Steward |
| XL | Product Lead, Architect-Planner, Builder, Reviewer, Delivery Steward | Designer, Researcher, DevOps |

Delivery Steward should not interrupt every small change. It appears at boundaries:

- before starting a new roadmap/module batch;
- after L/XL task completion;
- before release;
- during retro;
- when artifact conflicts or stale docs are detected.

## Decision Protocol

The AI team decides routine matters. The Owner decides high-impact trade-offs.

### AI Decides Directly

- naming and local implementation details;
- small refactors needed to finish a task;
- test placement and local validation commands;
- straightforward bug fixes;
- minor documentation updates tied to the current change.

### Owner Decision Required

- product positioning or target user changes;
- MVP scope expansion or reduction;
- deleting or archiving source-of-truth documents;
- paid service, privacy, compliance, security, or vendor lock-in choices;
- major architecture direction;
- UX style direction for a visible product;
- release with known risk.

### Owner Decision Brief Format

When Owner input is required, use this concise format:

```markdown
## Owner Decision Brief
- Decision: [what needs a choice]
- Context: [why this matters now]
- Recommendation: [default option and reason]
- Options:
  - A: [option] - [trade-off]
  - B: [option] - [trade-off]
  - C: [optional] - [trade-off]
- If no reply: [safe default or pause]
```

## Artifact Governance

The Delivery Steward owns artifact hygiene. This includes managing, merging, archiving, and when appropriate deleting old documents.

Artifact location rules are defined in `docs/artifact-architecture.md`. In short: `docs/` is for reusable framework documentation, root files are only for active project state, and `.claude/workspace/` is for execution artifacts, reports, decisions, and archives.

### Source Of Truth

| Artifact | Owns | Purpose |
|----------|------|---------|
| `product-brief.md` / `project-profile/product.md` | Product Lead | product definition, user, value, scope, non-goals |
| `roadmap.md` | Product Lead | product modules, priority, MVP, dependency, module status |
| `spec.md` / `.claude/workspace/specs/<feature>.md` | Product Lead + Architect-Planner | feature value, scope, contract, acceptance |
| `tasks.md` | Architect-Planner + Delivery Steward | current execution tasks, sequencing, clarity, and gate state |
| `architecture.md` / ADR | Architect-Planner | high-impact architecture decisions |
| `preview/design-direction.md` | Designer | UI direction authority |
| `.claude/workspace/events.jsonl` | Delivery Steward / command layer | machine-readable execution events |
| `.claude/workspace/metrics.md` | Delivery Steward | human-readable process trends |
| `.claude/workspace/reviews/` | Reviewer | review evidence |
| `.claude/workspace/releases/` | DevOps / Reviewer | release evidence and rollback |
| `.claude/workspace/journal.md` | Delivery Steward | concise decisions and continuity notes |

Going forward, `.claude/workspace/` is the canonical workspace for machine-readable team state and reports. Root-level `workspace/` should be treated as legacy or temporary unless explicitly kept.

### Document Lifecycle

Every non-trivial document should be in one of these states:

| State | Meaning |
|-------|---------|
| active | source of truth or currently used plan |
| reference | useful background, not authoritative |
| draft | temporary proposal not yet adopted |
| superseded | replaced by a newer document |
| archived | kept for history, not loaded by default |
| delete-candidate | safe to remove after confirmation or consolidation |

### Cleanup Rules

Delivery Steward may propose cleanup whenever:

- two docs describe the same contract differently;
- a roadmap/tasks file is fully done and replaced by a newer plan;
- a Workbench or automation doc is being treated as mainline when it is only support;
- status words or paths conflict across commands;
- docs repeat command details that should live in one source.

Default action is consolidation, not deletion.

Deletion is allowed only when one of these is true:

- the file is generated, temporary, and its useful content was migrated;
- the file is a duplicate of an active source of truth;
- the Owner confirms removal;
- the file is an obsolete draft and has no unique decisions.

If there is doubt, archive instead of deleting:

```text
.claude/workspace/archive/YYYY-MM-DD-<name>.md
```

### Consolidation Report

When cleanup happens, Delivery Steward should write a short report:

```markdown
## Artifact Cleanup
- Kept as source of truth: [files]
- Merged into: [file]
- Archived: [files]
- Deleted: [files]
- Decisions preserved: [bullets]
- Follow-up: [if any]
```

## Command Ownership

| Command | Primary Owner | Steward Rule |
|---------|---------------|--------------|
| `/project-preset` | Product Lead + Architect-Planner | only project-specific differences become rules |
| `/plan` | Product Lead | roadmap table is the only module state source |
| `/dev` | Architect-Planner + Builder | update only current task/module state and final event |
| `/check` | Builder / Reviewer | no permanent report unless requested or blocking |
| `/review-all` | Reviewer | diff review by default; `--system` checks architecture shape, product acceptance, consistency, and documentation entropy |
| `/ship` | Reviewer + DevOps | release report owns release risk and rollback |
| `/standup` | Delivery Steward | read-first status; avoid creating noisy derived state |
| `/taste` | Designer | design direction only, not product scope |

## Spec And Tasks Quality Gate

Spec and tasks are not allowed to become private implementation paperwork that only the AI understands.

Before Builder starts an M/L/XL task, the plan must pass a Spec/Task Quality Gate. This gate answers three questions:

1. **Is it useful?** Product Lead checks whether the spec/tasks serve the Product Brief, roadmap, MVP, and Owner intent.
2. **Is it buildable?** Architect-Planner checks whether the technical plan, dependencies, file scope, risks, and sequencing are reasonable.
3. **Is it understandable and governable?** Delivery Steward checks whether the tasks are readable, stateful, not duplicated, and not creating document clutter.

### Gate Ownership

| Check | Owner | Blocks Build When |
|-------|-------|-------------------|
| Product value | Product Lead | the task has no clear user/product value, is not tied to roadmap/MVP, or looks like busywork |
| Owner fit | Product Lead | the plan may not match what the Owner asked for, or needs a product trade-off decision |
| Technical coherence | Architect-Planner | implementation path is vague, risky, out of order, or violates architecture/project preset |
| Task quality | Architect-Planner | tasks are too large, too tiny, not independently verifiable, or lack acceptance commands |
| Artifact hygiene | Delivery Steward | spec/tasks duplicate old docs, conflict with roadmap, or will create state drift |
| Owner readability | Delivery Steward | the Owner cannot understand what will be delivered from the summary |

### Human Brief Before Build

For M/L/XL work, the team must explain the plan in normal language before coding. The purpose is not to fill a form. The purpose is to let the Owner quickly know what will be delivered, why it matters, what is intentionally out of scope, and whether a decision is needed.

Default style:

```markdown
这轮我建议先做 [功能/模块]。它有用是因为 [产品价值/风险/roadmap 原因]。本轮只做到 [范围]，暂时不碰 [明确不做]。做完后，你应该能看到 [可感知结果]；我会用 [验收方式] 验证。当前不需要你拍板 / 需要你在 [决策点] 上拍板。
```

For larger work, add a small task list after the explanation, but keep it readable:

```markdown
我会拆成三步：先 [第一步]，再 [第二步]，最后 [第三步]。如果中途发现 [风险]，我会停下来给你选项。
```

Use structured fields only when the decision is complex enough that structure helps.

If the Owner says the summary is not what they wanted, or Product Lead marks `needs_revision`, Builder must not start. The plan goes back to Product Lead + Architect-Planner for revision.

### Anti-Patterns This Gate Prevents

- Completing all tasks but delivering no meaningful product value.
- Tasks that are technically correct but not aligned with the Owner's intent.
- Specs written in a way that only the AI can understand.
- Breaking one useful feature into many fake tasks to look productive.
- Building P2 polish while MVP foundations are still missing.
- Updating code from a stale spec after roadmap changed.

## Current Correction

The previous maturity direction over-weighted Workbench and automation. The corrected sequence is:

1. define roles and decision boundaries;
2. add Delivery Steward artifact governance;
3. upgrade `/plan` and `/dev` around Owner decision briefs, Spec/Task Quality Gate, and acceptance;
4. unify status paths and state words;
5. make review/ship gates reliable;
6. only then build Workbench on top of trusted state.

## Success Criteria

This operating model is working when:

- the Owner is not asked to manage routine tasks;
- high-impact decisions come with clear recommended options;
- no role is responsible for everything;
- stale docs are merged, archived, or removed instead of piling up;
- `/standup` can explain current state without reading chat history;
- Workbench becomes a view of trusted artifacts, not a substitute for missing governance.

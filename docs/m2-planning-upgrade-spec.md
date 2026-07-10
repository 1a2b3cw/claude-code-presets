# M2 Planning Upgrade Specification

> Lifecycle: active
> Owner: Product Lead + Architect-Planner + Delivery Steward
> Scope: M2.1 and M2.2 in `docs/maturity-tasks.md`

## Outcome

`/plan` must turn an Owner's product idea into a confirmed Product Brief, a recommended MVP, explicit non-goals, and an executable roadmap. It must recommend the default route instead of asking the Owner to perform routine product management.

## Product planning contract

1. `product-brief.md` is the preferred confirmed product contract; `prd.md` is an accepted existing equivalent.
2. `project-profile/product.md` is supporting project evidence. It may retain facts, confirmed decisions, labelled inferences, and unresolved questions; an inference does not become a Product Brief fact or a rule without confirmation.
3. Product Lead owns user value, MVP membership, non-goals, priority, and whether an Owner Decision Brief is needed.
4. Architect-Planner turns the recommended product route into modules, dependencies, complexity, technical risks, and runnable acceptance criteria.
5. Delivery Steward ensures the Product Brief, roadmap, profile, and preset have one clear purpose each and do not duplicate a fact source.

## Project preset boundary

`project-preset/` contains only confirmed project-specific differences from the base and technology presets. Its single portable rules directory is `project-preset/rules/`; it must not contain `.agents/` or `.claude/` subdirectories. Generic team rules remain in the installed base configuration.

## Deliverables

| Task | Deliverable | Verification |
|------|-------------|--------------|
| M2.1 | Product Lead handoff and roadmap fields for user value and MVP membership | `npm run validate`, `npm test` |
| M2.2 | Confirmed-fact boundary for profile/preset and portable rules path | `npm run validate`, `npm test` |

## Decision record

Owner confirmed option A on 2026-07-10: standardize project preset rules on `project-preset/rules/`.

## Non-goals

- No new CLI command or automatic project migration.
- No generated project preset instance in this repository.
- No changes to business code, Workbench behavior, or the base team rules.

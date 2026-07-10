# Evolution Roadmap

> Created from Architect-Planner, Researcher, and DevOps agent analysis.
> This document records the platform/preset evolution direction for later reference.

## Current Judgment

The project has moved from an AI team configuration package into a pluggable preset system with a project-specific preset workflow.

The next stage should not primarily add more presets. The safer direction is to make `project-preset` verifiable, activated by downstream commands, and connected to feedback loops.

## Strategic Direction

1. Close the `project-preset` lifecycle:
   generate -> review -> validate -> activate in `/dev` and related commands -> update from `/standup` feedback.
2. Upgrade the installer internals from direct filesystem scripting to explicit models:
   `InstallPlan`, `SyncPlan`, overlay engine, and schema validators.
3. Grow the preset ecosystem only after the core workflow is measurable:
   preset incubation, external skill adoption gates, plugin-style preset providers, and release governance.

## P0: Next Month

- Add `architecture.md` and `docs/adr/`.
- Record core decisions:
  - `.claude/` is the source of truth.
  - presets overlay onto the base configuration.
  - Codex files are generated outputs.
  - `project-preset/` is not automatically copied into `.claude/`, `.agents/`, or `.codex/`.
- Make `/dev`, `/check`, `/review-all`, and `/standup` explicitly read `project-preset/PRESET.md` and `project-preset/rules/` first when present.
- Add `project-preset --check` or an equivalent validation entrypoint.
- Validate `manifest.json`, `curation.md`, `rules/`, `specs/`, and `skills/`.
- Add release gates:
  - `npm run validate`
  - `npm test`
  - `npm pack --dry-run --json`
  - packed tarball smoke test
- Test hook behavior directly, not only file existence:
  - block `eval()`
  - block unsafe `innerHTML`
  - block `git reset --hard`
  - block `npm publish`

## P1: 1-3 Months

- Extract `InstallPlan` and `SyncPlan` so dry-run and real execution share one plan.
- Add schemas for:
  - `preset.json`
  - `preset.mcp.json`
  - `.mcp.json`
  - generated hooks config
- Make overlay rules explicit:
  `base -> technical preset -> language variant -> future project preset`.
- Add golden snapshot tests for generated `.claude/`, `.agents/`, `.codex/`, and `AGENTS.md`.
- Create a preset incubation process:
  repeated project-preset patterns become preset candidates.
- Consider `backend-api` or `python-backend` as the first candidate only after enough project evidence exists.

## P2: 3-6 Months

- Add plugin-style preset providers using manifest plus assets.
- Add provenance to generated files:
  source version, generator version, and source hash.
- Move npm publishing to tag-driven CI with trusted publishing/OIDC.
- Create an external skills and agents registry:
  `watching`, `candidate`, `adopted`, `rejected`.
- Add cross-platform CI:
  Windows, Linux, macOS.

## Recommended Order

1. `architecture.md` and ADRs.
2. `project-preset` command activation path.
3. `project-preset` validator.
4. release and pack gates.
5. `InstallPlan` and `SyncPlan`.
6. schemas and snapshots.
7. preset incubation.
8. new backend/API preset candidates.

## Important Product Note

This roadmap is about the configuration platform itself.

It is not the broader product direction for automating software development, project execution, or product-building workflows. That broader direction should be designed separately around delivery automation and measurable productivity gains.

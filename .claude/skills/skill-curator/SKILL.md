---
name: skill-curator
description: Evaluate, adapt, or create Claude Code/Codex skills, agents, commands, hooks, and preset contributions from external repositories or internal ideas. Use when the user asks to borrow GitHub skills, compare mature AI coding team projects, import community agents, design a new skill, audit SKILL.md quality, or decide whether a third-party skill should be adopted.
---

# Skill Curator

## Core Rule
Do not copy community skills blindly. Extract the pattern, verify the license and safety profile, then adapt the smallest useful workflow into this project's preset structure.

## Workflow

1. Research
   - Prefer official docs, actively maintained repositories, and curated awesome lists.
   - Record source URL, last activity if relevant, license, and the concrete pattern worth borrowing.

2. Classify
   - **Public skill**: language/framework-neutral workflow useful in every preset.
   - **Preset skill**: tied to web, AI, mobile, or another stack.
   - **Rule**: short mandatory behavior that should always be loaded.
   - **Spec**: longer reference material loaded only when needed.
   - **Command**: repeatable workflow that maps to a user-facing slash command or `team-command-*` skill.
   - **Hook/script**: deterministic validation or safety automation.

3. Gate
   - License allows reuse or the implementation is rewritten from first principles.
   - No secret handling, remote code execution, destructive shell usage, or unreviewed install script.
   - `SKILL.md` has concise frontmatter with `name` and `description`.
   - Description includes when to use the skill, not only what it is.
   - Body is short, procedural, and points to references for long details.

4. Adapt
   - Rewrite instructions in this project's style.
   - Keep rules short and mandatory.
   - Put long examples or stack-specific details into specs or references.
   - Add or update smoke tests when the change affects generated output.

5. Verify
   - Run dry-run init for an affected preset.
   - Run `npm test` from `create-claude-team/`.
   - Check Codex sync output when public skills, commands, rules, specs, hooks, or agents change.

## Project Preset Audit

Use this mode when `/project-preset` has generated or updated `project-profile/` and `project-preset/`.

Treat `/project-preset` as the generator and this skill as the reviewer. Do not generate the whole project preset from scratch unless explicitly asked; audit the draft, classify issues, and propose or apply focused fixes.

### Inputs

- `project-profile/` facts, decisions, inferences, and unresolved questions.
- `project-preset/PRESET.md`.
- `project-preset/manifest.json`.
- `project-preset/rules/`.
- `project-preset/specs/`.
- `project-preset/skills/`.
- Existing source files or repo metadata when needed to verify claims.

### Audit Checks

1. Evidence
   - Facts and confirmed decisions may become rules.
   - Inferences must stay in profile or unresolved questions until confirmed.
   - Any rule without evidence should be downgraded or flagged.

2. Classification
   - Short mandatory behavior belongs in `rules/`.
   - Long explanation, architecture, domain context, and examples belong in `specs/`.
   - Repeatable user-triggered workflows may become commands.
   - Stable reusable project workflows may become skills.
   - Project history and observations belong in profile or curation notes, not rules.

3. Rule Quality
   - Rules must be concrete, enforceable, and short.
   - Reject vague rules like "write clean code" unless rewritten into an observable constraint.
   - Prefer rules that mention real project paths, commands, interfaces, data invariants, or review checks.

4. Project Skill Quality
   - A project skill must pass Project Skill Adoption Score below.
   - `SKILL.md` must have valid frontmatter with `name` and `description`.
   - The description must say when to use the skill.
   - The body must be procedural and concise; long details should move to `project-preset/specs/`.
   - Unsafe automation, secret handling, remote scripts, or destructive commands fail the audit.

5. Output
   - Write or update `project-preset/curation.md`.
   - Mark the audit result as `Pass`, `Revise`, or `Blocked`.
   - List rejected candidates and downgraded items with reasons.
   - List questions that must go back to the user before becoming rules.

## Project Skill Adoption Score

Use this score before creating or keeping a project-specific `skills/<name>/SKILL.md`:

| Dimension | Pass Signal |
|-----------|-------------|
| Fit | Solves a recurring workflow in this exact project |
| Specificity | Uses project terminology, paths, commands, data, or domain rules |
| Safety | No unsafe automation, hidden credential flow, remote code execution, or destructive shell behavior |
| Maintainability | Small enough for future maintainers to keep current |
| Testability | Can be validated by a script, checklist, example input/output, or focused review |

Keep or create the project skill only if at least four dimensions pass. Otherwise:

- 3 passes: keep as a Future Candidate in `project-preset/skills/README.md`.
- 0-2 passes: reject and record in `project-preset/curation.md`.

## Adoption Score

Use this lightweight score before adding a third-party idea:

| Dimension | Pass Signal |
|-----------|-------------|
| Fit | Solves a recurring workflow in this project |
| Specificity | More than generic prompting advice |
| Safety | No unsafe automation or hidden credential flow |
| Maintainability | Small enough to keep current |
| Testability | Can be validated by smoke test, dry-run, or a focused example |

Adopt only if at least four dimensions pass. Otherwise document as inspiration, not a built-in feature.

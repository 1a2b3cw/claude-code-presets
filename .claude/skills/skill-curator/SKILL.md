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

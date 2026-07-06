# External Skills and Agent Ecosystem Notes

This project should learn from mature community repositories without becoming a dump of copied skills. The goal is to extract stable patterns, rewrite them in this project's style, and keep every addition testable.

## Reference Sources

| Source | What To Borrow | How To Use It |
|--------|----------------|---------------|
| OpenAI Codex Skills docs: https://developers.openai.com/codex/skills | Progressive disclosure, concise `SKILL.md`, clear trigger descriptions | Keep skill bodies lean and move long references to specs |
| awesome-claude-code: https://github.com/hesreallyhim/awesome-claude-code | Ecosystem map of commands, agents, hooks, workflows, tooling | Use as discovery input, not as an install source |
| Claude Code Subagents Collection: https://github.com/davepoon/claude-code-subagents-collection | Large role catalog and subagent naming patterns | Borrow role taxonomy only when a role maps to a repeatable workflow |
| contains-studio/agents: https://github.com/contains-studio/agents | Frontmatter consistency, examples, testing notes for agents | Use as a quality model for future agent metadata |
| Build with Claude: https://www.buildwithclaude.com/ | Marketplace-style classification across plugins, commands, hooks, agents, skills | Use categories to improve docs and discovery |

## Upgrade Principles

1. Prefer curation over volume.
2. Treat every imported idea as untrusted until reviewed.
3. Rewrite community content instead of copying implementation text.
4. Put shared workflow knowledge in public skills.
5. Put stack-specific operational details in preset skills/rules/specs.
6. Add smoke-test coverage when the generated surface changes.

## Current Decisions

- Add `skill-curator` as a public skill so future GitHub/community skill adoption follows a repeatable process.
- Add smoke-test validation for every generated `SKILL.md` frontmatter.
- Keep third-party links in this document and user-facing docs, not inside generated project instructions unless they directly affect daily work.

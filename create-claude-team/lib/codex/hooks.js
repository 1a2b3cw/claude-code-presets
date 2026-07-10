export function buildCodexHooks() {
  return {
    hooks: {
      PreToolUse: [
        {
          matcher: 'Write|Edit',
          hooks: [
            {
              type: 'command',
              command: 'node "$(git rev-parse --show-toplevel)/.codex/hooks/security-check.mjs"',
              statusMessage: 'Checking code security',
            },
          ],
        },
        {
          matcher: 'Bash',
          hooks: [
            {
              type: 'command',
              command: 'node "$(git rev-parse --show-toplevel)/.codex/hooks/bash-check.mjs"',
              statusMessage: 'Checking shell command',
            },
          ],
        },
      ],
    },
  };
}

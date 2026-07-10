---
name: rn-upgrade
description: Plan and execute React Native or Expo SDK upgrades, dependency migrations, prebuild/bare compatibility checks, native module updates, and post-upgrade validation.
---

# RN Upgrade

Use this skill when upgrading Expo SDK, React Native, React, EAS build configuration, native modules, config plugins, or resolving dependency drift after an upgrade.

## Required Context
- Read `specs/react-native-upgrade.md`.
- Read `rules/expo.md` before changing Expo config or prebuild behavior.
- Use current official docs when target versions matter.

## Workflow
1. Record current and target versions.
2. Identify breaking changes and native module compatibility risks.
3. Upgrade in one isolated commit or task.
4. Fix type/lint/test/build failures.
5. Validate simulator, development build, and EAS build as required.

## Checks
- Lockfile changes are intentional.
- Config plugins match the target SDK.
- Native project changes are explainable.
- Rollback path is clear before release.

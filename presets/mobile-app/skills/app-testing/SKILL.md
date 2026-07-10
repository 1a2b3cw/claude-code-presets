---
name: app-testing
description: Plan and implement React Native tests with unit tests, React Native Testing Library, Maestro flows, and native capability mocks.
---

# App Testing

Use this skill when adding or repairing tests for React Native screens, hooks, stores, services, navigation, or E2E flows.

## Required Context
- Read `rules/mobile-testing.md`.
- For navigation tests, also read `specs/navigation.md`.

## Workflow
1. Put pure logic under unit tests first.
2. Test components through visible text and accessibility labels.
3. Mock network, storage, permissions, time, and native modules.
4. Add Maestro E2E for the core user path.
5. Run project scripts and record any manual device checks that remain.

## Checks
- Loading, empty, error, success, disabled states are covered.
- Permission-denied paths are covered.
- Tests do not hit production services.
- E2E flows are stable and avoid arbitrary sleeps when possible.

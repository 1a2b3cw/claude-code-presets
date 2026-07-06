---
name: device-verification
description: Build a device verification matrix and validate React Native or Expo changes across Expo Go, development builds, simulators, emulators, real devices, deep links, permissions, and release builds.
---

# Device Verification

Use this skill when a task needs simulator, emulator, real-device, Expo Go, development build, preview build, or production build validation.

## Required Context
- Read `rules/device-verification.md`.
- Read `specs/device-verification.md` for matrix and record templates.
- For release tasks, also read `rules/app-release.md`.

## Workflow
1. Classify the change: UI, navigation, form, native capability, config plugin, release.
2. Pick the smallest verification matrix that still covers the risk.
3. Run or request the relevant simulator/device/build checks.
4. Record checked devices, OS versions, build type, and uncovered risks.

## Checks
- Native capability changes are not validated only in Expo Go.
- iOS and Android behavior are both considered.
- Keyboard, safe area, permissions, and back behavior are covered when relevant.
- Unverified release risks are explicit.

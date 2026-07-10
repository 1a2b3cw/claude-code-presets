---
name: app-release
description: Prepare Expo React Native apps for EAS builds, internal distribution, App Store submission, Google Play submission, and release gate checks.
---

# App Release

Use this skill when preparing a mobile app build, changing app config, adding permissions, creating release notes, or running ship checks for iOS/Android.

## Required Context
- Read `rules/app-release.md`.
- Read `specs/app-store-release.md`.
- Read `rules/expo.md` when EAS or Expo config changes.

## Workflow
1. Confirm app identity, version, build number, icon, splash, scheme, and permissions.
2. Run tests, type checks, lint, and critical E2E flows.
3. Build with the intended EAS profile.
4. Verify the build on a real device or trusted internal distribution.
5. Prepare store metadata, privacy details, release notes, and rollback plan.

## Checks
- No secret is committed or bundled.
- iOS and Android build numbers increment.
- Permission declarations match actual features.
- Production API and telemetry settings are correct.

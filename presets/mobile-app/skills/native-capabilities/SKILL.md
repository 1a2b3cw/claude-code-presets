---
name: native-capabilities
description: Add React Native or Expo native capabilities such as camera, media library, location, notifications, files, sharing, and permissions.
---

# Native Capabilities

Use this skill when the task involves camera, photo library, location, push notifications, files, sharing, contacts, biometrics, sensors, or other device APIs.

## Required Context
- Read `rules/expo.md`.
- Read `rules/app-release.md` for permission and privacy requirements.
- Use `context7` when current Expo SDK behavior matters.

## Workflow
1. Prefer Expo SDK modules and confirm managed workflow support.
2. Define permission purpose, denied state, and settings recovery path.
3. Encapsulate native API access in a service or hook.
4. Add tests around permission branching and error conversion.
5. Update app config permission descriptions before release.

## Checks
- Permission prompts are user-initiated and have clear context.
- Denied and permanently denied states are handled.
- Sensitive outputs are not logged.
- Client secrets are not embedded in the app bundle.

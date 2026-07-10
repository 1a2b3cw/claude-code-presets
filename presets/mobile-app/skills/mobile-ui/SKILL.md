---
name: mobile-ui
description: Build and review React Native mobile UI with safe areas, touch states, keyboard handling, accessibility, and platform-aware polish.
---

# Mobile UI

Use this skill when implementing or reviewing React Native screens, reusable mobile components, forms, bottom sheets, tabs, lists, or visual interaction states.

## Required Context
- Read `rules/mobile-ui.md` before writing UI code.
- For deeper React Native details, read `specs/react-native.md`.
- If the project has `preview/`, read it before UI implementation.

## Workflow
1. Identify the target device contexts: small phone, large phone, iOS, Android, dark mode.
2. Design the screen around safe area, keyboard behavior, loading/error/empty states, and touch target size.
3. Implement with stable dimensions for repeated controls and list items.
4. Verify key states: default, pressed, disabled, loading, error, empty, offline when relevant.
5. For forms, verify keyboard type, submit behavior, validation placement, and keyboard avoidance.

## Checks
- No content is hidden behind status bar, tab bar, home indicator, or keyboard.
- Touch targets are large enough and have clear feedback.
- Icon-only actions have accessibility labels.
- Dynamic text does not clip at larger font sizes.
- Lists use virtualized list components when content can grow.

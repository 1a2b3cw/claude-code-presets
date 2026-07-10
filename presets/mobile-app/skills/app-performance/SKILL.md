---
name: app-performance
description: Diagnose and improve Expo/React Native mobile performance including startup, lists, images, animations, JS thread work, bundle size, network retries, and production-build profiling.
---

# App Performance

Use this skill when the user reports slow startup, janky scrolling, heavy images, animation stutter, battery/network waste, memory pressure, or wants a performance review of a React Native app.

## Required Context
- Read `rules/mobile-performance.md`.
- Read `specs/mobile-performance.md` for measurement and optimization patterns.
- For list or rendering issues, also read `rules/react-native.md`.

## Workflow
1. Reproduce on the closest target device and build type.
2. Identify the bottleneck category: startup, JS render, list virtualization, image/media, animation, network, native module, or package size.
3. Make one focused optimization.
4. Re-measure on the same device/build.
5. Record the before/after signal in the task or PR.

## Checks
- No unbounded `ScrollView` for growing lists.
- No expensive render-time parsing or formatting.
- Images have stable dimensions and appropriate size.
- Retry/refresh behavior has limits and backoff.
- Performance claims are based on measurement, not intuition.

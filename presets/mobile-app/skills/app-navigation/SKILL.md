---
name: app-navigation
description: Design and implement Expo Router navigation, auth flows, tabs, stacks, route params, and deep links for mobile apps.
---

# App Navigation

Use this skill when adding or changing routes, tabs, stacks, auth redirects, modal routes, route parameters, or deep links.

## Required Context
- Read `rules/expo.md`.
- Read `specs/navigation.md` for auth flow, route params, and deep link patterns.

## Workflow
1. Map user states: unknown session, signed out, signed in, permission blocked.
2. Place screens into route groups that match those states.
3. Keep `app/` files thin; move business logic to `src/features/`.
4. Validate route params before using them in services.
5. Test cold start, back behavior, tab switching, and deep link entry.

## Checks
- Auth state does not flash protected screens.
- Deep links handle signed-out users and missing resources.
- Route params are treated as untrusted input.
- Android hardware back behavior is intentional.

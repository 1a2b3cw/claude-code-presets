---
name: offline-first
description: Design mobile offline behavior, local persistence, cache policy, sync queues, weak-network states, and conflict handling.
---

# Offline First

Use this skill when adding offline reads, drafts, local persistence, optimistic updates, retry queues, or sync conflict handling.

## Required Context
- Read `specs/state-management.md`.
- Read `rules/react-native.md` for storage and side-effect boundaries.

## Workflow
1. Classify data as sensitive, non-sensitive preference, server cache, or structured offline data.
2. Pick storage: SecureStore, AsyncStorage, SQLite, or TanStack Query cache.
3. Define offline UX for read, create, edit, delete, and retry.
4. Define conflict policy before implementation.
5. Add tests for queue persistence, retry, and failed sync recovery.

## Checks
- Sensitive data is not stored in AsyncStorage.
- Offline actions have visible pending/error states.
- Retry logic has backoff and does not loop forever.
- Sync conflicts produce deterministic outcomes.

# Sync and Security Guide

## Sync model

The app is designed around local-first writes.

### Write path

1. User saves data in the UI.
2. The feature facade delegates to a repository.
3. The repository writes to local storage immediately.
4. The repository enqueues a sync job.
5. Auto-sync attempts to push the change to Supabase.

### Pull path

When online, the sync service also pulls remote rows and merges them into local storage.

## Queue behavior

The queue tracks:
- insert
- update
- delete

Queue statuses:
- `pending`
- `synced`
- `failed`
- `conflict`

Deletes should remove records remotely as well, not only locally.

## Conflict handling

Current v1 behavior:
- most entities use a practical last-write-wins style
- invoices can be marked as `conflict` for manual handling because billing data is more sensitive

## Connectivity

The app tracks online/offline state and exposes sync status in the shell UI.

Practical behavior:
- if offline, writes stay local
- if online, writes auto-sync shortly after save
- manual sync remains available in Settings

## Notification architecture

### Web

Uses the browser Notification API.

### Native

Uses `@capacitor/local-notifications`.

Current behavior includes:
- permission request
- Android notification channel creation
- exact alarm access flow on Android
- scheduling task due-date and reminder notifications

## App lock architecture

### Web

- optional PIN stored in local app settings
- lock gate shown after authenticated session restore when enabled

### Native

Uses `@aparajita/capacitor-biometric-auth`.

Current mobile unlock flow supports:
- fingerprint
- face unlock
- device credential fallback such as PIN, pattern, or password

## Settings controls

The Settings screen currently allows:
- run manual sync
- reset local data
- allow notifications
- allow exact alarms on native
- enable app lock
- configure web PIN
- enable/test native device security

## Security boundaries

- Supabase Auth controls identity
- RLS controls cloud ownership
- app lock is a convenience/privacy layer, not a replacement for backend authorization
- secrets should not be stored in plain text business tables

## Known limitations

- conflict resolution UI is still minimal
- iOS native folder is not yet committed in this repo
- local storage abstraction still uses browser fallback in web mode
- deeper automated test coverage remains to be expanded

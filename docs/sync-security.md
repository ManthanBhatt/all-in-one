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

Deletes remove records remotely as well as locally.

## Conflict handling

Current v1 behavior:
- most entities use a practical last-write-wins style
- invoices can be marked as `conflict` for manual handling because billing data is more sensitive

## Connectivity

The app tracks online/offline state and exposes sync status in the shell UI.

## Notification architecture

### Web

Uses the browser Notification API.

### Native

Uses `@capacitor/local-notifications` with Android channel setup and exact alarm access flow.

## App lock architecture

### Web

- optional PIN stored in local app settings
- lock gate shown after authenticated session restore when enabled

### Native

Uses `@aparajita/capacitor-biometric-auth` with biometric and device credential fallback.

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
- app lock is a privacy layer, not a replacement for backend authorization

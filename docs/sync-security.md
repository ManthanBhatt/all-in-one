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

The sync queue tracks:

- insert
- update
- delete

Common queue statuses:

- `pending`
- `synced`
- `failed`
- `conflict`

Deletes are intended to remove records remotely as well as locally.

## Conflict handling

Current practical behavior:

- most entities use a last-write-wins style approach
- invoices can be marked as `conflict` because billing data is more sensitive

The UI for deeper conflict resolution is still evolving.

## Connectivity and status

The app tracks online/offline state and exposes sync status in the shell UI.

Current UX patterns include:

- automatic sync after local writes
- manual sync from Settings
- visible sync state in the shell

## Notification architecture

### Web

Uses the browser Notification API.

### Native

Uses `@capacitor/local-notifications` with Android channel setup and exact alarm access flow.

Current reminder/task flows can open the related record when the notification is tapped.

## App lock architecture

### Web

- optional PIN stored in local app settings
- lock gate shown after authenticated session restore when enabled

### Native

Uses `@aparajita/capacitor-biometric-auth` with biometric and device credential fallback.

## Settings controls

The Settings screen currently supports:

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
- local device/app protection does not replace backend policy enforcement

## AI-specific note

The AI assistant can inspect workspace data and trigger app actions, but it still operates inside the same local-first repository/sync architecture as the rest of the app.

That means:

- AI-created records still go through repositories
- AI-created records still enqueue sync work
- AI does not bypass local validation or ownership rules

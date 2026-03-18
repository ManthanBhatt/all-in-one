# Codebase Guide

## High-level shape

The app lives in `productivity-app/` and is structured as a local-first Angular application with Ionic UI and Capacitor native integrations.

```text
productivity-app/
  src/app/
    core/
    features/
    shared/
  supabase/migrations/
  android/
```

## Main application layers

### `src/app/core`

Shared infrastructure and domain logic.

- `auth/`: Supabase auth client, guards, session store
- `db/`: local persistence, migrations, repositories
- `models/`: shared TypeScript contracts for all entities
- `notifications/`: task and reminder notification scheduling
- `security/`: web PIN lock and native biometric/device lock integration
- `services/`: app title and other app-wide utilities
- `sync/`: connectivity tracking, queue management, Supabase push/pull sync

### `src/app/features`

Feature-level pages and facades.

- `dashboard/`
- `clients/`
- `projects/`
- `tasks/`
- `notes/`
- `reminders/`
- `time/`
- `invoices/`
- `settings/`
- `auth/`

Each feature typically follows this pattern:
- page component for the UI
- facade for state loading, derived values, and orchestration
- repositories and shared models live in `core`, not inside the feature

### `src/app/shared`

Reusable UI building blocks such as the app shell and common display components.

## Navigation model

The app uses an authenticated shell under `/app/*` and public auth routes under `/auth/*`.

Core flow:
- `/auth/login`
- `/auth/register`
- `/app/dashboard`
- `/app/clients`
- `/app/projects`
- `/app/tasks`
- `/app/notes`
- `/app/reminders`
- `/app/time`
- `/app/invoices`
- `/app/settings`

## State and data flow

The app is local-first.

1. UI pages call feature facades.
2. Facades call repositories.
3. Repositories write to the local database abstraction first.
4. Repositories enqueue sync work.
5. Sync service pushes pending changes to Supabase when online.
6. Pulled remote changes are merged back into local storage.

This means rendering should not depend on active network connectivity.

## Key concepts

### Repositories

Repositories are the write boundary. UI code should not call Supabase directly.

Responsibilities:
- local CRUD
- local metadata stamping
- soft deletes where appropriate
- enqueueing sync mutations

### Facades

Facades expose feature state to components and keep page components thin.

Responsibilities:
- loading lists and summaries
- exposing computed data
- delegating save/update/delete to repositories
- feature-specific orchestration such as due-state updates or linked entity behavior

### Sync service

The sync layer performs:
- queued push to Supabase tables
- remote pull into local store
- invoice conflict marking
- retry/failure tracking

## UI conventions

The app intentionally uses a dark, non-default Ionic style with:
- custom cards and sections
- modal-driven create/edit flows
- task board drag-and-drop
- header sync indicator
- desktop sidebar shell

## Native integration points

### Android currently in repo

- app icons
- local notifications
- biometric/device auth plugin sync
- permissions already added in Android manifest

### iOS later

The code supports iOS, but the native platform folder needs to be added on macOS.

## Where to start as a contributor

Read these files first:
- `productivity-app/src/app/core/models/domain.models.ts`
- `productivity-app/src/app/core/db/app-database.service.ts`
- `productivity-app/src/app/core/sync/sync.service.ts`
- `productivity-app/src/app/shared/components/app-shell/app-shell.component.ts`
- `productivity-app/src/app/features/tasks/pages/tasks-list/tasks-list.page.ts`

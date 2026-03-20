# Codebase Guide

## High-level shape

Essentials is a local-first Angular application with Ionic UI and Capacitor native integrations.

```text
.
  src/app/
    core/
    features/
    shared/
  supabase/migrations/
  android/
  docs/
  resources/
```

## Main application layers

### `src/app/core`

Shared infrastructure, domain logic, and platform services.

- `ai/`: AI engine, action execution, chat persistence, capability/context services
- `auth/`: Supabase auth client, guards, feature guard, session store
- `db/`: local persistence, repository layer, local-first storage abstraction
- `files/`: file-related helpers
- `models/`: shared TypeScript contracts for entities and status enums
- `notifications/`: reminder and task notification scheduling
- `security/`: web PIN lock and native biometric/device lock integration
- `services/`: app title, navigation helpers, and app-wide utilities
- `settings/`: app settings helpers
- `sync/`: connectivity tracking, sync queue management, Supabase push/pull sync
- `utils/`: shared helpers

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
- `counters/`
- `ai-assistant/`
- `ai-models/`
- `settings/`
- `auth/`

Each feature typically follows this pattern:

- page component for the UI
- facade for loading, derived state, and orchestration
- repositories and shared models remain in `core`

### `src/app/shared`

Reusable UI and shell-level components.

Important shared areas:

- app shell
- navigation chrome
- shared page/layout styling in `src/global.scss`

## Navigation model

The app uses public auth routes under `/auth/*` and an authenticated shell under `/app/*`.

Primary routes:

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
- `/app/counters`
- `/app/counters/:id`
- `/app/ai-assistant`
- `/app/ai-models`
- `/app/settings`

Most workspace routes are protected by:

- `authGuard`
- `featureGuard(...)`

## State and data flow

The app is local-first.

1. Page components call feature facades.
2. Facades call repositories and specialized services.
3. Repositories write to the local store first.
4. Repositories enqueue sync work.
5. Sync service pushes pending changes to Supabase when online.
6. Remote changes are pulled and merged back into local storage.

## Key concepts

### Repositories

Repositories are the write boundary. UI code should not talk to Supabase directly.

Responsibilities:

- local CRUD
- local metadata stamping
- sync queue creation
- soft-delete or delete orchestration depending on the entity flow

### Facades

Facades keep page components thin.

Responsibilities:

- loading entity lists and summaries
- exposing computed data
- delegating save/update/delete work
- handling feature-specific workflows such as linked tasks, due-state calculations, and UI-specific actions

### Sync service

The sync layer performs:

- queued push to Supabase tables
- remote pull into local store
- sync status reporting
- invoice conflict marking
- retry/failure handling

### AI subsystem

The AI layer lives under `src/app/core/ai`.

Main responsibilities:

- chat session persistence
- workspace-aware prompt/context generation
- deterministic assistant responses and action plans
- executing real app actions such as creating notes, reminders, tasks, and other records
- model selection and download-state handling for the AI UI

The AI UI is split between:

- `features/ai-assistant`
- `features/ai-models`

## UI conventions

The app uses a dark, non-default Ionic style with:

- shared page/card layout primitives
- modal-driven create/edit flows
- icon-based CRUD actions
- mobile-safe modal and form behavior
- task board drag-and-drop
- desktop sidebar shell

## Native integration points

### Android currently in repo

- launcher icons and app branding
- local notifications
- biometric/device auth plugin sync
- Android permissions and Capacitor plugin wiring

### iOS later

The code supports iOS at the app level, but the native platform folder still needs to be added on macOS.

## Suggested starting files for contributors

Read these first:

- `src/app/core/models/domain.models.ts`
- `src/app/core/db/app-database.service.ts`
- `src/app/core/sync/sync.service.ts`
- `src/app/core/ai/engine/ai-engine.service.ts`
- `src/app/shared/components/app-shell/app-shell.component.ts`
- `src/app/features/tasks/pages/tasks-list/tasks-list.page.ts`

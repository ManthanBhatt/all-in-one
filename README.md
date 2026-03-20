# Essentials

Essentials is an offline-first Ionic + Angular + Capacitor workspace for solo developers, freelancers, and small agencies. It combines client work management, billing, reminders, counters, and an in-app AI assistant into one dark-mode-first hybrid app for web and Android, with iOS-ready architecture.

## Highlights

- Offline-first local data layer with automatic background sync
- Supabase authentication and cloud sync target
- Clients, projects, tasks, notes, reminders, time tracking, invoices, and counters
- Task workflow board with drag and drop
- Local notifications for reminders and task due dates
- Web PIN lock and native biometric/device lock support
- AI assistant and AI model hub
- Android Capacitor project included

## Stack

- Ionic 8
- Angular 20
- Capacitor 8
- Supabase
- `@capacitor-community/sqlite`
- `@capacitor/local-notifications`
- `@aparajita/capacitor-biometric-auth`
- `localforage`

## Repository Layout

- `src/`: Angular app
- `android/`: Android Capacitor project
- `supabase/`: SQL migrations for Supabase
- `docs/`: project wiki and contributor-facing technical docs
- `resources/`: brand, app icon, and launcher source assets

## Current Modules

- Dashboard
- Clients
- Projects
- Tasks
- Notes
- Reminders
- Time
- Invoices
- Counters
- AI Assistant
- AI Models
- Settings

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/ManthanBhatt/all-in-one.git
cd all-in-one
npm install
```

### 2. Configure Supabase

Set your Supabase project URL and anon key in the Angular environment files.

The app expects:

- Supabase Auth enabled
- Row Level Security enabled on user-owned tables
- the SQL migrations in `supabase/migrations/` applied to your project

Apply these migrations in order:

- `0001_initial_core_schema.sql`
- `0002_profiles_from_auth.sql`
- `0003_invoice_items_json.sql`

### 3. Run the web app

```bash
ionic serve
```

Open [http://localhost:8100](http://localhost:8100).

### 4. Build the web app

```bash
npm run build
```

### 5. Run Android

```bash
npx cap sync android
npx cap open android
```

### 6. Add iOS later

The codebase is structured to support iOS, but the `ios/` platform folder is not committed here. On macOS:

```bash
npx cap add ios
npx cap sync ios
npx cap open ios
```

## How to Use

### Auth

- Register from `/auth/register`
- Log in with Supabase Auth
- Session restore keeps you signed in across refreshes

### Core workflow

1. Create a client
2. Create a project linked to that client
3. Add tasks, either general or linked to a project
4. Capture notes and reminders
5. Track time
6. Generate invoices
7. Use counters for anything repetitive you want to track
8. Let the sync layer push local changes to Supabase automatically when online

### Notifications

- Web: allow browser notifications in Settings
- Android: allow notifications and exact alarms in Settings for reliable reminders
- Task due dates and reminders can trigger notifications

### App lock

- Web: enable app lock and set a PIN in Settings
- Mobile: enable app lock and use biometric/device security

### AI

- Use AI Assistant to query workspace state, create records, and inspect current work
- Use AI Models to manage the current assistant model selection and download state
- The current assistant layer is workspace-aware and action-capable, but it is not yet a full on-device LLM runtime

## Documentation

- [Documentation Index](./docs/README.md)
- [Codebase Guide](./docs/codebase.md)
- [Database Guide](./docs/database.md)
- [Sync and Security Guide](./docs/sync-security.md)
- [Contributing Guide](./CONTRIBUTING.md)

## Development Notes

Useful commands:

```bash
npm install
ionic serve
npm run build
npx cap sync android
```

## Current Scope

Implemented:

- Auth shell and session restore
- Offline-first CRUD for core modules
- Automatic sync queue and Supabase sync path
- Notifications and app lock
- Android support
- AI assistant and AI model management UI

Still evolving:

- richer invoice conflict resolution UI
- more complete AI runtime/inference backend
- improved automated test coverage
- iOS platform setup in-repo

## License

Released under the [MIT License](./LICENSE).

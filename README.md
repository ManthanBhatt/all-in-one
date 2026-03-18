# Freelancer OS

Freelancer OS is an offline-first Ionic + Angular + Capacitor workspace for independent developers and agencies. It combines clients, projects, tasks, notes, reminders, time tracking, invoices, sync, and app security into one dark-mode-first hybrid app that runs on web and Android today, with iOS-ready architecture.

## Highlights

- Offline-first local data layer with automatic background sync
- Supabase authentication and cloud sync target
- Clients, projects, tasks, notes, reminders, time tracking, and invoices
- Local notifications for reminders and task due dates
- Web PIN lock and native biometric/device lock support
- Drag-and-drop task workflow board
- Android Capacitor project included

## Stack

- Ionic 8
- Angular 20
- Capacitor 8
- Supabase
- Capacitor Community SQLite abstraction + browser fallback
- Capacitor Local Notifications
- Capacitor Biometric Auth

## Repository Layout

- `productivity-app/`: application source, Capacitor project, Supabase migrations
- `docs/`: open-source documentation and code wiki

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/ManthanBhatt/all-in-one.git
cd all-in-one/productivity-app
npm install
```

### 2. Configure Supabase

Add your Supabase project URL and anon key to the app config used by the Angular app.

The codebase expects:
- Supabase Auth enabled
- Row Level Security enabled on user-owned tables
- migrations in `supabase/migrations/` applied to your project

Apply these migrations in order:

- `0001_initial_core_schema.sql`
- `0002_profiles_from_auth.sql`
- `0003_invoice_items_json.sql`

### 3. Run the web app

```bash
ionic serve
```

Open [http://localhost:8100](http://localhost:8100).

### 4. Run Android

```bash
npx cap sync android
npx cap open android
```

### 5. Add iOS later

The codebase is prepared for iOS, but the iOS platform folder is not committed here. On macOS:

```bash
npx cap add ios
npx cap sync ios
npx cap open ios
```

## How to Use

### Auth

- Register a new user from `/auth/register`
- Log in with Supabase Auth
- The app restores your session on refresh

### Core workflow

1. Create a client
2. Create a project linked to that client
3. Add tasks, either general or linked to a project
4. Capture notes and reminders
5. Track time
6. Generate invoices
7. Let sync push local changes to Supabase automatically when online

### Notifications

- Web: allow browser notifications in Settings
- Android: allow notifications and exact alarms in Settings for reliable reminders
- Task due dates and reminders can trigger notifications

### App lock

- Web: enable app lock and set a PIN in Settings
- Mobile: enable app lock and use biometric/device security

## Open Source Docs

- [Documentation Index](./docs/README.md)
- [Codebase Guide](./docs/codebase.md)
- [Database Guide](./docs/database.md)
- [Sync and Security Guide](./docs/sync-security.md)

## Current Scope

Implemented:
- Auth shell and session restore
- Offline-first CRUD for core modules
- Auto sync queue and Supabase sync path
- Notifications and app lock
- Android support

Planned / evolving:
- richer conflict resolution UI for invoices
- expanded reporting and exports
- iOS platform setup in-repo
- more detailed test coverage

## Development Notes

Useful commands:

```bash
npm install
ionic serve
npm run build
npx cap sync android
```

## License

Released under the [MIT License](./LICENSE).

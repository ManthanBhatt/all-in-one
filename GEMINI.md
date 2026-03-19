# GEMINI.md - Freelancer OS

## Project Overview
Freelancer OS is an offline-first Ionic + Angular + Capacitor workspace for independent developers and agencies. It manages clients, projects, tasks, notes, reminders, time tracking, and invoices. It is designed to be mobile-ready (Android/iOS) with a dark-mode-first hybrid UI.

### Core Technologies
- **Framework**: Ionic 8 (Angular 20)
- **Mobile Runtime**: Capacitor 8
- **Backend**: Supabase (Postgres, Auth, RLS)
- **Local Database**: LocalForage (IndexedDB/WebSQL/LocalStorage abstraction)
- **Styling**: Vanilla CSS + SCSS with Ionic variables
- **Key Plugins**: 
    - `@capacitor/local-notifications` for reminders
    - `@aparajita/capacitor-biometric-auth` for app security

## Architecture & Project Structure
The project follows a modular architecture:
- `src/app/core/`: Infrastructure and domain logic (singleton services).
    - `auth/`: Supabase auth client and session management.
    - `db/`: Local persistence layer and repositories.
    - `models/`: Shared TypeScript contracts for domain entities.
    - `sync/`: Connectivity tracking and background sync orchestration.
    - `security/`: App-lock (PIN/Biometric) logic.
- `src/app/features/`: Functional modules organized by feature (Dashboard, Clients, Tasks, etc.).
    - Each feature typically contains a **page** (UI) and a **facade** (orchestrator).
- `src/app/shared/`: Reusable UI components and base layouts (e.g., `app-shell`).
- `supabase/migrations/`: SQL scripts for the remote database schema.

## Building and Running
### Web Development
```powershell
# Install dependencies
npm install

# Run development server
ionic serve
```

### Mobile Development (Android)
```powershell
# Sync web assets and plugins to Android
npx cap sync android

# Open in Android Studio
npx cap open android
```

### Testing & Linting
```powershell
# Run unit tests (Karma/Jasmine)
npm test

# Run ESLint
npm run lint
```

## Development Conventions
- **Offline-First**: All writes MUST go to the local repository first. The repository enqueues the change in `sync_queue`, which the `SyncService` later pushes to Supabase.
- **Repositories**: Act as the write boundary. Never call Supabase directly from UI components.
- **Facades**: Use facades to manage feature-level state and computed data, keeping page components thin.
- **Naming**: Use `.page.ts` for top-level routed components and `.component.ts` for reusable elements.
- **Entities**: All synced entities must extend `EntityBase` (defined in `src/app/core/models/domain.models.ts`) which includes sync metadata (`sync_status`, `is_dirty`, `version`, etc.).
- **Styling**: Adhere to the dark-mode aesthetic. Use CSS variables from `src/theme/variables.scss` for consistency.

## Remote Database (Supabase)
Ensure the following migrations are applied to your Supabase project in order:
1. `0001_initial_core_schema.sql`
2. `0002_profiles_from_auth.sql`
3. `0003_invoice_items_json.sql`
Row Level Security (RLS) is expected on all user-owned tables.

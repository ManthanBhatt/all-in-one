# Database Guide

## Overview

Essentials uses two data layers:

1. local-first persistence inside the app runtime
2. Supabase Postgres as the remote sync target

The logical entity model is shared across both sides so sync stays predictable.

## Core entities

Entity contracts are defined in `src/app/core/models/domain.models.ts`.

### Base fields

Most synced entities include:

- `id`
- `user_id`
- `created_at`
- `updated_at`
- `deleted_at`
- `version`
- `sync_status`
- `local_updated_at`
- `device_id`
- `is_dirty`

These support offline writes, merge behavior, and sync diagnostics.

## Business entities

### `clients`

Stores customer/account information.

### `projects`

Represents delivery work linked to a client.

Project statuses used by the UI:

- `planning`
- `active`
- `on_hold`
- `completed`
- `archived`

### `tasks`

Tracks execution work, either general or project-linked.

Task workflow states currently used by the UI:

- `planning`
- `in_flight`
- `on_hold`
- `in_review`
- `complete`

### `notes`

Linked context and freeform notes.

### `reminders`

Notification-driven schedule items.

### `time_entries`

Billable or non-billable work logs.

### `invoices`

Billing records with item data stored in a JSON column in Supabase.

### `counters`

Track repeated numeric progress such as reps, steps, habits, or arbitrary tallies.

### `sync_queue`

Tracks pending local mutations that still need remote sync.

## Supabase migrations

Current migration set:

- `supabase/migrations/0001_initial_core_schema.sql`
- `supabase/migrations/0002_profiles_from_auth.sql`
- `supabase/migrations/0003_invoice_items_json.sql`

## Relationships

Primary relationships:

- one `profile` owns many records through `user_id`
- one `client` owns many `projects`, `tasks`, `notes`, and `invoices`
- one `project` owns many `tasks`, `notes`, and `time_entries`
- one `task` can link to reminders, notes, and time entries
- one `invoice` belongs to a client and can optionally link to a project

Not every feature is fully relational yet in the UI, but the domain model is structured around these links.

## RLS expectations

Supabase should enforce ownership using `auth.uid() = user_id` for:

- select
- insert
- update
- delete

If you see foreign key failures on `user_id`, verify:

- the authenticated user exists in `public.profiles`
- migration `0002_profiles_from_auth.sql` has been applied

## Local-first behavior

The app runtime should treat local storage as the primary read/write source.

That means:

- page components read from local state only
- repositories write locally first
- sync happens asynchronously afterward

This is the most important database rule in the project.

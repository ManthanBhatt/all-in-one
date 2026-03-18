# Database Guide

## Overview

Freelancer OS uses two database layers:

1. local-first persistence inside the app runtime
2. Supabase Postgres as the remote sync target

The logical entity model is shared between both sides so sync can remain predictable.

## Core entities

Defined in `src/app/core/models/domain.models.ts`.

### Base fields

Nearly every synced entity includes:
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
Represents delivery work for a client.

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
Billing records with line items stored as JSON in Supabase.

### `sync_queue`
Tracks pending local changes that need remote sync.

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
- one `invoice` can be linked to a client and optionally a project

## RLS expectations

Supabase should enforce ownership using `auth.uid() = user_id` for select, insert, update, and delete.

If you see foreign key failures on `user_id`, verify the authenticated user exists in `public.profiles` and that migration `0002` has been applied.

# Database Guide

## Overview

Freelancer OS uses two database layers:

1. local-first persistence inside the app runtime
2. Supabase Postgres as the remote sync target

The logical entity model is shared between both sides so sync can remain predictable.

## Core entities

Defined in `productivity-app/src/app/core/models/domain.models.ts`.

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

Important fields:
- `name`
- `company_name`
- `email`
- `phone`
- `website`
- `billing_currency`
- `hourly_rate`
- `status`
- `notes`

### `projects`
Represents delivery work for a client.

Important fields:
- `client_id`
- `name`
- `description`
- `stack`
- `repo_url`
- `staging_url`
- `production_url`
- `status`
- `priority`
- `start_date`
- `due_date`

### `tasks`
Tracks execution work, either general or project-linked.

Important fields:
- `client_id`
- `project_id`
- `title`
- `description`
- `status`
- `priority`
- `due_at`
- `estimated_minutes`
- `completed_at`

Task workflow states currently used by the UI:
- `planning`
- `in_flight`
- `on_hold`
- `in_review`
- `complete`

### `notes`
Linked context and freeform notes.

Important fields:
- `client_id`
- `project_id`
- `task_id`
- `title`
- `body`
- `note_type`
- `is_pinned`

### `reminders`
Notification-driven schedule items.

Important fields:
- `client_id`
- `project_id`
- `task_id`
- `title`
- `remind_at`
- `status`
- `repeat_rule`
- `notification_id`

### `time_entries`
Billable or non-billable work logs.

Important fields:
- `client_id`
- `project_id`
- `task_id`
- `description`
- `started_at`
- `ended_at`
- `duration_minutes`
- `is_billable`
- `hourly_rate`

### `invoices`
Billing records.

Important fields:
- `client_id`
- `project_id`
- `invoice_number`
- `issue_date`
- `due_date`
- `status`
- `subtotal`
- `tax_amount`
- `discount_amount`
- `total_amount`
- `paid_at`
- `items` (JSON array in Supabase)

### `sync_queue`
Tracks pending local changes that need remote sync.

Important fields:
- `entity_type`
- `entity_id`
- `operation`
- `queue_status`
- `payload`
- `retry_count`
- `last_error`

## Supabase migrations

Current migration set:
- `0001_initial_core_schema.sql`
- `0002_profiles_from_auth.sql`
- `0003_invoice_items_json.sql`

### `0001_initial_core_schema.sql`
Creates the main tables and ownership model.

### `0002_profiles_from_auth.sql`
Creates and backfills `profiles`, plus auth trigger behavior so app users exist in `public.profiles`.

### `0003_invoice_items_json.sql`
Adds the `items` JSON column to invoices for the current invoice model.

## Relationships

Primary relationships:
- one `profile` owns many records through `user_id`
- one `client` owns many `projects`, `tasks`, `notes`, and `invoices`
- one `project` owns many `tasks`, `notes`, and `time_entries`
- one `task` can link to reminders, notes, and time entries
- one `invoice` can be linked to a client and optionally a project

## RLS expectations

Supabase should enforce ownership using `auth.uid() = user_id`.

That applies to:
- select
- insert
- update
- delete

Per-action policies are safer than broad `FOR ALL` policies for this schema.

## Practical setup notes

If you see foreign key failures on `user_id`, verify:
- the authenticated user exists in `public.profiles`
- the auth trigger/backfill migration has been applied

If you see invoice sync failures mentioning `items`, verify migration `0003` has been applied.

create table if not exists counters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  current_value integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1
);

alter table counters enable row level security;

create policy "counters_owner" on counters for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.invoices
add column if not exists items jsonb not null default '[]'::jsonb;

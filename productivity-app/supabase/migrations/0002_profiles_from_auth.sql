create or replace function public.handle_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id)
  do update set
    email = excluded.email,
    full_name = excluded.full_name,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute procedure public.handle_auth_user_profile();

insert into public.profiles (id, email, full_name)
select
  id,
  email,
  coalesce(raw_user_meta_data ->> 'full_name', '')
from auth.users
on conflict (id)
do update set
  email = excluded.email,
  full_name = excluded.full_name,
  updated_at = now();

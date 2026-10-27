-- Feature 1: Sign up and login
-- Supabase Auth keeps login details (including the hashed password) in its own
-- auth.users table. This public.users table mirrors each account so the app has
-- its own users table, as the assignment requires.

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

-- Row Level Security: each user can only read their own row.
alter table public.users enable row level security;

create policy "Users can view their own row"
  on public.users for select
  to authenticated
  using ((select auth.uid()) = id);

-- Every new sign up automatically gets a row in public.users.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

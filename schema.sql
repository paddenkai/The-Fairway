-- The Fairway — Supabase Schema
-- Run this in your Supabase SQL Editor

-- ── ROUNDS TABLE ──
create table if not exists rounds (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  join_code text not null,
  course_name text not null,
  course_data jsonb,
  pars jsonb not null default '{}',
  total_holes integer not null default 18,
  players jsonb not null default '[]',
  scores jsonb not null default '{}',
  greenies jsonb not null default '{}',
  greenie_eligible jsonb not null default '{}',
  games jsonb not null default '{}',
  game_amounts jsonb not null default '{}',
  created_by uuid references auth.users(id),
  status text not null default 'active' check (status in ('active', 'complete', 'abandoned'))
);

-- ── PROFILES TABLE ──
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  venmo_handle text,
  updated_at timestamptz default now()
);

-- ── REALTIME ──
alter publication supabase_realtime add table rounds;

-- ── RLS: ROUNDS ──
alter table rounds enable row level security;
create policy "Anyone can read rounds" on rounds for select using (true);
create policy "Anyone can insert rounds" on rounds for insert with check (true);
create policy "Anyone can update rounds" on rounds for update using (true);

-- ── RLS: PROFILES ──
alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can upsert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- ── Auto-create profile on signup ──
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── INDEXES ──
create index if not exists rounds_join_code_idx on rounds(join_code);
create index if not exists rounds_status_idx on rounds(status);
create index if not exists rounds_created_at_idx on rounds(created_at desc);
create index if not exists rounds_created_by_idx on rounds(created_by);

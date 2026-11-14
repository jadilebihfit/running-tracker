-- Langkah: skema sinkron. Jalankan sekali di Supabase → SQL Editor → New query → Run.

create table if not exists public.lk_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  profile    jsonb,
  profile_u  bigint not null default 0,
  done       jsonb not null default '{}'::jsonb,
  earned     jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.lk_runs (
  user_id    uuid not null references auth.users (id) on delete cascade,
  id         text not null,
  data       jsonb,
  deleted    boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists lk_runs_user_updated on public.lk_runs (user_id, updated_at);

alter table public.lk_state enable row level security;
alter table public.lk_runs  enable row level security;

-- Setiap pengguna hanya bisa membaca dan menulis datanya sendiri.
drop policy if exists "lk_state milik sendiri" on public.lk_state;
create policy "lk_state milik sendiri" on public.lk_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "lk_runs milik sendiri" on public.lk_runs;
create policy "lk_runs milik sendiri" on public.lk_runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

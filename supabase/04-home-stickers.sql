create table if not exists public.home_stickers (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.couple_spaces(id) on delete cascade,
  month_key text not null check (month_key ~ '^\d{4}-\d{2}$'),
  stickers jsonb not null default '[]'::jsonb,
  updated_by uuid references public.couple_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (space_id, month_key)
);

alter table public.home_stickers enable row level security;

drop policy if exists "public read home stickers" on public.home_stickers;
create policy "public read home stickers"
  on public.home_stickers for select
  using (true);

drop policy if exists "public insert home stickers" on public.home_stickers;
create policy "public insert home stickers"
  on public.home_stickers for insert
  with check (true);

drop policy if exists "public update home stickers" on public.home_stickers;
create policy "public update home stickers"
  on public.home_stickers for update
  using (true)
  with check (true);

drop policy if exists "public delete home stickers" on public.home_stickers;
create policy "public delete home stickers"
  on public.home_stickers for delete
  using (true);

do $$
begin
  alter publication supabase_realtime add table public.home_stickers;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

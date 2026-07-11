create table if not exists public.weekly_summaries (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.couple_spaces(id) on delete cascade,
  month_key text not null check (month_key ~ '^\d{4}-\d{2}$'),
  week_id text not null,
  week_range text not null,
  summary_text text not null,
  entry_signature text,
  model text,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (space_id, week_id)
);

create index if not exists weekly_summaries_space_month_idx
  on public.weekly_summaries (space_id, month_key);

alter table public.weekly_summaries enable row level security;

drop policy if exists "public read weekly summaries" on public.weekly_summaries;
create policy "public read weekly summaries"
  on public.weekly_summaries for select
  using (true);

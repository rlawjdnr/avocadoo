create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.couple_members(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "public read push subscriptions" on public.push_subscriptions;
create policy "public read push subscriptions"
  on public.push_subscriptions for select
  using (true);

drop policy if exists "public upsert push subscriptions" on public.push_subscriptions;
create policy "public upsert push subscriptions"
  on public.push_subscriptions for insert
  with check (true);

drop policy if exists "public update own push subscriptions" on public.push_subscriptions;
create policy "public update own push subscriptions"
  on public.push_subscriptions for update
  using (true)
  with check (true);

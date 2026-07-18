create extension if not exists pgcrypto;

create table if not exists public.couple_spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.couple_members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.couple_spaces(id) on delete cascade,
  nickname text not null,
  created_at timestamptz not null default now(),
  unique (space_id, nickname)
);

create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.couple_spaces(id) on delete cascade,
  author_id uuid not null references public.couple_members(id) on delete restrict,
  diary_date date not null,
  location_text text,
  body_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.diary_images (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.diary_entries(id) on delete cascade,
  image_url text not null,
  storage_path text not null,
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now(),
  unique (entry_id, sort_order)
);

create unique index if not exists diary_images_one_cover_per_entry
  on public.diary_images (entry_id)
  where is_cover;

create table if not exists public.diary_comments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.diary_entries(id) on delete cascade,
  author_id uuid not null references public.couple_members(id) on delete restrict,
  body_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.diary_entry_likes (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.diary_entries(id) on delete cascade,
  member_id uuid not null references public.couple_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (entry_id, member_id)
);

create table if not exists public.diary_comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.diary_comments(id) on delete cascade,
  member_id uuid not null references public.couple_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (comment_id, member_id)
);

insert into public.couple_spaces (id, name)
values ('11111111-1111-4111-8111-111111111111', '아보카도')
on conflict (id) do update set name = excluded.name;

insert into public.couple_members (id, space_id, nickname)
values
  ('22222222-2222-4222-8222-222222222221', '11111111-1111-4111-8111-111111111111', '정정욱'),
  ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', '혜민민')
on conflict (id) do update set nickname = excluded.nickname;

alter table public.couple_spaces enable row level security;
alter table public.couple_members enable row level security;
alter table public.diary_entries enable row level security;
alter table public.diary_images enable row level security;
alter table public.diary_comments enable row level security;
alter table public.diary_entry_likes enable row level security;
alter table public.diary_comment_likes enable row level security;

drop policy if exists "public read couple spaces" on public.couple_spaces;
create policy "public read couple spaces" on public.couple_spaces for select using (true);

drop policy if exists "public read couple members" on public.couple_members;
create policy "public read couple members" on public.couple_members for select using (true);

drop policy if exists "public read diary entries" on public.diary_entries;
create policy "public read diary entries" on public.diary_entries for select using (true);

drop policy if exists "public insert diary entries" on public.diary_entries;
create policy "public insert diary entries" on public.diary_entries for insert with check (true);

drop policy if exists "public update diary entries" on public.diary_entries;
create policy "public update diary entries" on public.diary_entries for update using (true) with check (true);

drop policy if exists "public delete diary entries" on public.diary_entries;
create policy "public delete diary entries" on public.diary_entries for delete using (true);

drop policy if exists "public read diary images" on public.diary_images;
create policy "public read diary images" on public.diary_images for select using (true);

drop policy if exists "public insert diary images" on public.diary_images;
create policy "public insert diary images" on public.diary_images for insert with check (true);

drop policy if exists "public update diary images" on public.diary_images;
create policy "public update diary images" on public.diary_images for update using (true) with check (true);

drop policy if exists "public delete diary images" on public.diary_images;
create policy "public delete diary images" on public.diary_images for delete using (true);

drop policy if exists "public read diary comments" on public.diary_comments;
create policy "public read diary comments" on public.diary_comments for select using (true);

drop policy if exists "public insert diary comments" on public.diary_comments;
create policy "public insert diary comments" on public.diary_comments for insert with check (true);

drop policy if exists "public update diary comments" on public.diary_comments;
create policy "public update diary comments" on public.diary_comments for update using (true) with check (true);

drop policy if exists "public delete diary comments" on public.diary_comments;
create policy "public delete diary comments" on public.diary_comments for delete using (true);

drop policy if exists "public read diary entry likes" on public.diary_entry_likes;
create policy "public read diary entry likes" on public.diary_entry_likes for select using (true);

drop policy if exists "public insert diary entry likes" on public.diary_entry_likes;
create policy "public insert diary entry likes" on public.diary_entry_likes for insert with check (true);

drop policy if exists "public delete diary entry likes" on public.diary_entry_likes;
create policy "public delete diary entry likes" on public.diary_entry_likes for delete using (true);

drop policy if exists "public read diary comment likes" on public.diary_comment_likes;
create policy "public read diary comment likes" on public.diary_comment_likes for select using (true);

drop policy if exists "public insert diary comment likes" on public.diary_comment_likes;
create policy "public insert diary comment likes" on public.diary_comment_likes for insert with check (true);

drop policy if exists "public delete diary comment likes" on public.diary_comment_likes;
create policy "public delete diary comment likes" on public.diary_comment_likes for delete using (true);

insert into storage.buckets (id, name, public)
values ('diary-images', 'diary-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "public read diary images bucket" on storage.objects;
create policy "public read diary images bucket" on storage.objects for select using (bucket_id = 'diary-images');

drop policy if exists "public upload diary images bucket" on storage.objects;
create policy "public upload diary images bucket" on storage.objects for insert with check (bucket_id = 'diary-images');

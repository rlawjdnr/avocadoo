create extension if not exists pgcrypto;

create table if not exists public.couple_spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.couple_members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null,
  nickname text not null,
  created_at timestamptz not null default now(),
  unique (space_id, nickname)
);

create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null,
  author_id uuid not null,
  diary_date date not null,
  location_text text,
  body_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.diary_images (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null,
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
  entry_id uuid not null,
  author_id uuid not null,
  body_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.diary_entry_likes (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null,
  member_id uuid not null,
  created_at timestamptz not null default now(),
  unique (entry_id, member_id)
);

create table if not exists public.diary_comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null,
  member_id uuid not null,
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

select
  to_regclass('public.couple_spaces') as couple_spaces,
  to_regclass('public.couple_members') as couple_members,
  to_regclass('public.diary_entries') as diary_entries,
  to_regclass('public.diary_images') as diary_images,
  to_regclass('public.diary_comments') as diary_comments,
  to_regclass('public.diary_entry_likes') as diary_entry_likes,
  to_regclass('public.diary_comment_likes') as diary_comment_likes;

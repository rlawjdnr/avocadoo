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

do $$
begin
  alter table public.diary_images
    add column if not exists is_cover boolean not null default false;

  if not exists (select 1 from pg_constraint where conname = 'couple_members_space_id_fkey') then
    alter table public.couple_members
      add constraint couple_members_space_id_fkey
      foreign key (space_id) references public.couple_spaces(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'diary_entries_space_id_fkey') then
    alter table public.diary_entries
      add constraint diary_entries_space_id_fkey
      foreign key (space_id) references public.couple_spaces(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'diary_entries_author_id_fkey') then
    alter table public.diary_entries
      add constraint diary_entries_author_id_fkey
      foreign key (author_id) references public.couple_members(id) on delete restrict;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'diary_images_entry_id_fkey') then
    alter table public.diary_images
      add constraint diary_images_entry_id_fkey
      foreign key (entry_id) references public.diary_entries(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'diary_comments_entry_id_fkey') then
    alter table public.diary_comments
      add constraint diary_comments_entry_id_fkey
      foreign key (entry_id) references public.diary_entries(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'diary_comments_author_id_fkey') then
    alter table public.diary_comments
      add constraint diary_comments_author_id_fkey
      foreign key (author_id) references public.couple_members(id) on delete restrict;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'diary_entry_likes_entry_id_fkey') then
    alter table public.diary_entry_likes
      add constraint diary_entry_likes_entry_id_fkey
      foreign key (entry_id) references public.diary_entries(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'diary_entry_likes_member_id_fkey') then
    alter table public.diary_entry_likes
      add constraint diary_entry_likes_member_id_fkey
      foreign key (member_id) references public.couple_members(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'diary_comment_likes_comment_id_fkey') then
    alter table public.diary_comment_likes
      add constraint diary_comment_likes_comment_id_fkey
      foreign key (comment_id) references public.diary_comments(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'diary_comment_likes_member_id_fkey') then
    alter table public.diary_comment_likes
      add constraint diary_comment_likes_member_id_fkey
      foreign key (member_id) references public.couple_members(id) on delete cascade;
  end if;
end $$;

insert into public.couple_spaces (id, name)
values ('11111111-1111-4111-8111-111111111111', '아보카도')
on conflict (id) do update set name = excluded.name;

insert into public.couple_members (id, space_id, nickname)
values
  ('22222222-2222-4222-8222-222222222221', '11111111-1111-4111-8111-111111111111', '정정욱'),
  ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', '혜민민')
on conflict (id) do update set nickname = excluded.nickname;

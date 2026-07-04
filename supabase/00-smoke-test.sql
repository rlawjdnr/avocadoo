create extension if not exists pgcrypto;

create table if not exists public.couple_spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

select to_regclass('public.couple_spaces') as created_table;

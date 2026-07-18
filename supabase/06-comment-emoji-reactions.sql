create table if not exists public.diary_comment_emoji_reactions (
  comment_id uuid not null references public.diary_comments(id) on delete cascade,
  emoji_id text not null,
  member_id uuid not null references public.couple_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, emoji_id, member_id)
);

alter table public.diary_comment_emoji_reactions enable row level security;

drop policy if exists "public read diary comment emoji reactions" on public.diary_comment_emoji_reactions;
create policy "public read diary comment emoji reactions"
  on public.diary_comment_emoji_reactions for select
  using (true);

drop policy if exists "public insert diary comment emoji reactions" on public.diary_comment_emoji_reactions;
create policy "public insert diary comment emoji reactions"
  on public.diary_comment_emoji_reactions for insert
  with check (true);

drop policy if exists "public delete diary comment emoji reactions" on public.diary_comment_emoji_reactions;
create policy "public delete diary comment emoji reactions"
  on public.diary_comment_emoji_reactions for delete
  using (true);

do $$
begin
  alter publication supabase_realtime add table public.diary_comment_emoji_reactions;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

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

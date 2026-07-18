alter table public.diary_images
  add column if not exists is_cover boolean not null default false;

create unique index if not exists diary_images_one_cover_per_entry
  on public.diary_images (entry_id)
  where is_cover;

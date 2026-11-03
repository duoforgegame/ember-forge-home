-- HERO CAROUSEL: images chosen in the admin for the homepage tile strip.
-- Safe to run more than once. While the table is empty the site picks images automatically.
create table if not exists public.site_hero_tiles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.site_projects(id) on delete cascade,
  url text not null default '',
  fit text not null default 'cover' check (fit in ('cover', 'contain')),
  visible boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists site_hero_tiles_sort_idx on public.site_hero_tiles(sort_order);
grant select on public.site_hero_tiles to anon, authenticated;
grant all on public.site_hero_tiles to service_role;
alter table public.site_hero_tiles enable row level security;
drop policy if exists "public read hero tiles" on public.site_hero_tiles;
create policy "public read hero tiles" on public.site_hero_tiles
  for select to anon, authenticated using (true);

notify pgrst, 'reload schema';

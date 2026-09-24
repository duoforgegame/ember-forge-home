-- ============================================================
-- LANDING PAGE REDESIGN MIGRATION (idempotent, additive only)
-- Safe to run multiple times. Never drops or renames anything.
-- ============================================================

-- ---------- site_projects ----------
alter table public.site_projects
  add column if not exists visible boolean not null default true,
  add column if not exists key_art_url text not null default '',
  add column if not exists trailer_url text not null default '',
  add column if not exists info_bar_color text not null default '',
  add column if not exists press_kit_enabled boolean not null default false,
  add column if not exists more_info_enabled boolean not null default false;

update public.site_projects
   set key_art_url = cover_url
 where key_art_url = '' and coalesce(cover_url, '') <> '';

-- ---------- site_team ----------
alter table public.site_team
  add column if not exists gamer_tag text not null default '',
  add column if not exists real_name text not null default '';

update public.site_team
   set gamer_tag = case when position(' - ' in name) > 0 then split_part(name, ' - ', 1) else name end,
       real_name = case when position(' - ' in name) > 0 then substring(name from position(' - ' in name) + 3) else '' end
 where gamer_tag = '' and real_name = '';

-- ---------- site_header_links / site_socials ----------
alter table public.site_header_links
  add column if not exists visible boolean not null default true;

alter table public.site_socials
  add column if not exists twitter_visible boolean not null default true,
  add column if not exists tiktok_visible boolean not null default true,
  add column if not exists instagram_visible boolean not null default true,
  add column if not exists discord_visible boolean not null default true,
  add column if not exists youtube_visible boolean not null default true;

-- ---------- site_game_page_blocks ----------
-- New block fields (background, store bar, captions, etc.) live inside the JSONB content column.
alter table public.site_game_page_blocks
  add column if not exists visible boolean not null default true,
  add column if not exists content jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

-- ---------- site_game_platforms ----------
create table if not exists public.site_game_platforms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.site_projects(id) on delete cascade,
  name text not null default '',
  logo_url text not null default '',
  store_url text not null default '',
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists site_game_platforms_project_idx
  on public.site_game_platforms(project_id, sort_order);
grant select on public.site_game_platforms to anon, authenticated;
grant all on public.site_game_platforms to service_role;
alter table public.site_game_platforms enable row level security;
drop policy if exists "public read game platforms" on public.site_game_platforms;
create policy "public read game platforms" on public.site_game_platforms
  for select to anon, authenticated using (true);

-- ---------- site_landing_settings (singleton) ----------
create table if not exists public.site_landing_settings (
  id integer primary key check (id = 1),
  updated_at timestamptz not null default now()
);
alter table public.site_landing_settings
  add column if not exists slider_autoplay boolean not null default true,
  add column if not exists slider_interval_seconds integer not null default 6,
  add column if not exists header_banner_logo_url text not null default '',
  add column if not exists header_sticky_logo_url text not null default '',
  add column if not exists header_studio_line text not null default 'A TWO-PERSON INDIE STUDIO FROM LÜBECK, GERMANY',
  add column if not exists header_established_line text not null default 'EST. 2021',
  add column if not exists discord_button_label text not null default 'DISCORD',
  add column if not exists discord_button_url text not null default '',
  add column if not exists mission_visible boolean not null default true,
  add column if not exists mission_text text not null default 'We make the kind of games we''d play ourselves. Easy to pick up, hard to put down, and always a little bit of "just one more". Every update is shaped by the people who actually play them, from our Discord to the Steam reviews.',
  add column if not exists mission_signoff text not null default 'Forged together with our community.',
  add column if not exists about_heading text not null default 'ABOUT US',
  add column if not exists contact_heading text not null default 'CONTACT',
  add column if not exists contact_direct_text text not null default 'Or reach us directly at',
  add column if not exists contact_email text not null default 'info@duoforgegames.com',
  add column if not exists footer_logo_url text not null default '',
  add column if not exists footer_copyright text not null default '© 2026 Duo Forge Games. All rights reserved.',
  add column if not exists updated_at timestamptz not null default now();
grant select on public.site_landing_settings to anon, authenticated;
grant all on public.site_landing_settings to service_role;
alter table public.site_landing_settings enable row level security;
drop policy if exists "public read landing settings" on public.site_landing_settings;
create policy "public read landing settings" on public.site_landing_settings
  for select to anon, authenticated using (true);
insert into public.site_landing_settings (id, discord_button_url)
select 1, coalesce((select discord from public.site_socials where id = 1), '')
on conflict (id) do nothing;

-- ---------- site_mission_lines ----------
create table if not exists public.site_mission_lines (
  id uuid primary key default gen_random_uuid(),
  text text not null default '',
  style text not null default 'white_black' check (style in ('white_black', 'black_orange')),
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
grant select on public.site_mission_lines to anon, authenticated;
grant all on public.site_mission_lines to service_role;
alter table public.site_mission_lines enable row level security;
drop policy if exists "public read mission lines" on public.site_mission_lines;
create policy "public read mission lines" on public.site_mission_lines
  for select to anon, authenticated using (true);
insert into public.site_mission_lines (text, style, sort_order)
select v.text, v.style, v.sort_order
from (values
  ('GAMES BY', 'white_black', 0),
  ('GAMERS', 'white_black', 1),
  ('FOR', 'black_orange', 2),
  ('GAMERS', 'black_orange', 3)
) as v(text, style, sort_order)
where not exists (select 1 from public.site_mission_lines);

-- Refresh the REST API schema cache so new tables are reachable immediately (fixes 404s).
notify pgrst, 'reload schema';

-- Duo Forge Games — initial schema
-- Copy into Supabase SQL editor and Run.

create extension if not exists "pgcrypto";

-- PROJECTS
create table if not exists public.site_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  cover_url text not null default '',
  status text not null default 'In Development',
  button_label text not null default '',
  button_url text not null default '',
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
grant select on public.site_projects to anon, authenticated;
grant all on public.site_projects to service_role;
alter table public.site_projects enable row level security;
drop policy if exists "public read projects" on public.site_projects;
create policy "public read projects" on public.site_projects for select to anon, authenticated using (true);

-- TEAM
create table if not exists public.site_team (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default '',
  bio text not null default '',
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
grant select on public.site_team to anon, authenticated;
grant all on public.site_team to service_role;
alter table public.site_team enable row level security;
drop policy if exists "public read team" on public.site_team;
create policy "public read team" on public.site_team for select to anon, authenticated using (true);

-- ABOUT (singleton)
create table if not exists public.site_about (
  id integer primary key check (id = 1),
  intro_html text not null default '',
  updated_at timestamptz not null default now()
);
grant select on public.site_about to anon, authenticated;
grant all on public.site_about to service_role;
alter table public.site_about enable row level security;
drop policy if exists "public read about" on public.site_about;
create policy "public read about" on public.site_about for select to anon, authenticated using (true);
insert into public.site_about (id, intro_html) values (1, '') on conflict (id) do nothing;

-- SOCIALS (singleton)
create table if not exists public.site_socials (
  id integer primary key check (id = 1),
  twitter text not null default '',
  tiktok text not null default '',
  instagram text not null default '',
  discord text not null default 'https://discord.gg/9mJ4XA6YrB',
  youtube text not null default '',
  updated_at timestamptz not null default now()
);
grant select on public.site_socials to anon, authenticated;
grant all on public.site_socials to service_role;
alter table public.site_socials enable row level security;
drop policy if exists "public read socials" on public.site_socials;
create policy "public read socials" on public.site_socials for select to anon, authenticated using (true);
insert into public.site_socials (id) values (1) on conflict (id) do nothing;

-- HEADER LINKS
create table if not exists public.site_header_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text not null default '',
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
grant select on public.site_header_links to anon, authenticated;
grant all on public.site_header_links to service_role;
alter table public.site_header_links enable row level security;
drop policy if exists "public read header" on public.site_header_links;
create policy "public read header" on public.site_header_links for select to anon, authenticated using (true);

-- FOOTER LINKS
create table if not exists public.site_footer_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text not null default '',
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
grant select on public.site_footer_links to anon, authenticated;
grant all on public.site_footer_links to service_role;
alter table public.site_footer_links enable row level security;
drop policy if exists "public read footer" on public.site_footer_links;
create policy "public read footer" on public.site_footer_links for select to anon, authenticated using (true);

-- CONTACT SUBMISSIONS — admin only (via edge function service role)
create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  created_at timestamptz not null default now()
);
grant all on public.contact_submissions to service_role;
alter table public.contact_submissions enable row level security;
-- no anon/authenticated policies: reads/writes only via service_role from edge functions

-- STORAGE bucket for cover uploads
insert into storage.buckets (id, name, public)
values ('project-covers', 'project-covers', true)
on conflict (id) do nothing;

-- STATUS COLORS (public read, admin writes via edge function service role)
create table if not exists public.site_status_colors (
  status text primary key,
  color text not null default '#f59e0b',
  updated_at timestamptz not null default now()
);
grant select on public.site_status_colors to anon, authenticated;
grant all on public.site_status_colors to service_role;
alter table public.site_status_colors enable row level security;
drop policy if exists "public read status colors" on public.site_status_colors;
create policy "public read status colors" on public.site_status_colors for select to anon, authenticated using (true);

insert into public.site_status_colors (status, color) values
  ('Play Now', '#10b981'),
  ('In Development', '#f59e0b'),
  ('Coming Soon', '#0ea5e9'),
  ('Prototype', '#a1a1aa')
on conflict (status) do nothing;

-- Storage policies for project-covers bucket: allow public read + service_role writes.
-- Uploads go through admin-write (service_role signs uploads); browser uploads via signed URL token.
drop policy if exists "public read covers" on storage.objects;
create policy "public read covers" on storage.objects for select using (bucket_id = 'project-covers');

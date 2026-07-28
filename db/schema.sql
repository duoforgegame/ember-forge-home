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
  inquiry_type text not null default 'other',
  created_at timestamptz not null default now()
);
alter table public.contact_submissions add column if not exists inquiry_type text not null default 'other';
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

-- LEGAL PAGES (imprint, privacy) — editable via admin panel
create table if not exists public.site_legal (
  slug text primary key,
  title text not null default '',
  body_html text not null default '',
  updated_at timestamptz not null default now()
);
grant select on public.site_legal to anon, authenticated;
grant all on public.site_legal to service_role;
alter table public.site_legal enable row level security;
drop policy if exists "public read legal" on public.site_legal;
create policy "public read legal" on public.site_legal for select to anon, authenticated using (true);

insert into public.site_legal (slug, title, body_html) values
  ('imprint', 'Impressum',
$html$<section>
  <h2>Angaben gemäß § 5 TMG</h2>
  <p>Duo Forge Games<br />[Straße und Hausnummer]<br />[PLZ] Lübeck<br />Deutschland</p>
</section>
<section>
  <h2>Kontakt</h2>
  <p>E-Mail: <a href="mailto:info@duoforgegames.com">info@duoforgegames.com</a></p>
</section>
<section>
  <h2>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
  <p>[Name der verantwortlichen Person], Anschrift wie oben</p>
</section>
<section>
  <h2>Haftungsausschluss</h2>
  <p>Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.</p>
</section>
<p><em>Hinweis: Bitte Platzhalter durch die tatsächlichen Angaben ersetzen, bevor die Website veröffentlicht wird.</em></p>$html$),
  ('privacy', 'Datenschutzerklärung',
$html$<section>
  <h2>1. Verantwortlicher</h2>
  <p>Duo Forge Games, [Anschrift], E-Mail: info@duoforgegames.com</p>
</section>
<section>
  <h2>2. Erhebung und Speicherung personenbezogener Daten</h2>
  <p>Bei Nutzung unseres Kontaktformulars werden die von Ihnen angegebenen Daten (Name, E-Mail-Adresse, Betreff, Nachricht) zur Bearbeitung Ihrer Anfrage gespeichert. Die Daten werden per verschlüsselter SMTP-Verbindung (IONOS) an unser Postfach übermittelt und in unserer Datenbank (Supabase, Region EU) für die Dauer der Bearbeitung aufbewahrt.</p>
</section>
<section>
  <h2>3. Rechtsgrundlage</h2>
  <p>Die Verarbeitung erfolgt gemäß Art. 6 Abs. 1 lit. b DSGVO zur Durchführung vorvertraglicher Maßnahmen bzw. Art. 6 Abs. 1 lit. f DSGVO auf Basis unseres berechtigten Interesses an der Beantwortung Ihrer Anfrage.</p>
</section>
<section>
  <h2>4. Cookies &amp; Tracking</h2>
  <p>Diese Website setzt keine Cookies zu Tracking- oder Analysezwecken ein. Es werden keine Drittanbieter-Skripte eingebunden, die personenbezogene Daten erheben.</p>
</section>
<section>
  <h2>5. Ihre Rechte</h2>
  <p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit sowie Widerspruch. Zur Ausübung wenden Sie sich bitte an <a href="mailto:info@duoforgegames.com">info@duoforgegames.com</a>.</p>
</section>
<section>
  <h2>6. Hosting</h2>
  <p>Die Website wird auf einem von uns betriebenen Server gehostet. Datenbank- und Serverfunktionen werden über Supabase (Region EU) bereitgestellt. E-Mails werden über IONOS SE, Elgendorfer Str. 57, 56410 Montabaur, versandt.</p>
</section>
<p><em>Hinweis: Dieser Text ist ein Muster und ersetzt keine individuelle Rechtsberatung. Bitte vor Veröffentlichung durch einen Fachanwalt prüfen lassen.</em></p>$html$)
on conflict (slug) do nothing;

-- ANNOUNCEMENT BANNER (singleton)
create table if not exists public.site_announcement (
  id integer primary key check (id = 1),
  enabled boolean not null default false,
  message text not null default '',
  link_url text not null default '',
  link_label text not null default '',
  open_in_new_tab boolean not null default true,
  background_color text not null default '#f59e0b',
  text_color text not null default '#0b0b0f',
  updated_at timestamptz not null default now()
);
grant select on public.site_announcement to anon, authenticated;
grant all on public.site_announcement to service_role;
alter table public.site_announcement enable row level security;
drop policy if exists "public read announcement" on public.site_announcement;
create policy "public read announcement" on public.site_announcement for select to anon, authenticated using (true);
insert into public.site_announcement (id) values (1) on conflict (id) do nothing;

-- PRESS KIT — per-project toggle + related tables
alter table public.site_projects add column if not exists press_kit_enabled boolean not null default false;

create table if not exists public.site_press_kits (
  project_id uuid primary key references public.site_projects(id) on delete cascade,
  genre text not null default '',
  platforms text not null default '',
  release_date text not null default '',
  price text not null default '',
  one_line_pitch text not null default '',
  long_description text not null default '',
  developer text not null default '',
  publisher text not null default '',
  studio_location text not null default '',
  steam_url text not null default '',
  discord_url text not null default '',
  other_social_urls text not null default '',
  press_contact_email text not null default '',
  key_art_url text not null default '',
  game_logo_url text not null default '',
  studio_logo_url text not null default '',
  trailer_url text not null default '',
  system_requirements text not null default '',
  content_warnings text not null default '',
  press_kit_zip_url text not null default '',
  updated_at timestamptz not null default now()
);
grant select on public.site_press_kits to anon, authenticated;
grant all on public.site_press_kits to service_role;
alter table public.site_press_kits enable row level security;
drop policy if exists "public read press kits" on public.site_press_kits;
create policy "public read press kits" on public.site_press_kits for select to anon, authenticated using (true);

create table if not exists public.site_press_screenshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.site_projects(id) on delete cascade,
  url text not null default '',
  caption text not null default '',
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists site_press_screenshots_project_idx on public.site_press_screenshots(project_id);
grant select on public.site_press_screenshots to anon, authenticated;
grant all on public.site_press_screenshots to service_role;
alter table public.site_press_screenshots enable row level security;
drop policy if exists "public read press screenshots" on public.site_press_screenshots;
create policy "public read press screenshots" on public.site_press_screenshots for select to anon, authenticated using (true);

-- STORAGE bucket for press kit assets (public read) — also reused for Game Info Page images
insert into storage.buckets (id, name, public)
values ('press-kit-assets', 'press-kit-assets', true)
on conflict (id) do nothing;

drop policy if exists "public read press kit assets" on storage.objects;
create policy "public read press kit assets" on storage.objects for select using (bucket_id = 'press-kit-assets');

-- GAME INFO PAGE — per-project toggle + block-based content
alter table public.site_projects add column if not exists more_info_enabled boolean not null default false;

create table if not exists public.site_game_page_blocks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.site_projects(id) on delete cascade,
  block_type text not null,
  sort_order integer not null default 0,
  visible boolean not null default true,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists site_game_page_blocks_project_idx on public.site_game_page_blocks(project_id);
grant select on public.site_game_page_blocks to anon, authenticated;
grant all on public.site_game_page_blocks to service_role;
alter table public.site_game_page_blocks enable row level security;
drop policy if exists "public read game blocks" on public.site_game_page_blocks;
create policy "public read game blocks" on public.site_game_page_blocks for select to anon, authenticated using (true);

-- FEATURED GAME (singleton) — highlighted card between Home and Projects on the landing page
create table if not exists public.site_featured_game (
  id integer primary key check (id = 1),
  enabled boolean not null default false,
  project_id uuid references public.site_projects(id) on delete set null,
  custom_image_url text not null default '',
  custom_headline text not null default '',
  custom_description text not null default '',
  steam_app_id text not null default '',
  updated_at timestamptz not null default now()
);
grant select on public.site_featured_game to anon, authenticated;
grant all on public.site_featured_game to service_role;
alter table public.site_featured_game enable row level security;
drop policy if exists "public read featured game" on public.site_featured_game;
create policy "public read featured game" on public.site_featured_game for select to anon, authenticated using (true);
insert into public.site_featured_game (id) values (1) on conflict (id) do nothing;






-- ============================================================
-- SKIN CREATOR (Unboxed community pixel art skins)
-- ============================================================
create table if not exists public.weapon_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
grant select on public.weapon_categories to anon, authenticated;
grant all on public.weapon_categories to service_role;
alter table public.weapon_categories enable row level security;
drop policy if exists "public read weapon categories" on public.weapon_categories;
create policy "public read weapon categories" on public.weapon_categories for select to anon, authenticated using (true);

create table if not exists public.weapons (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.weapon_categories(id) on delete cascade,
  name text not null,
  template_image_url text not null default '',
  canvas_width integer not null default 64,
  canvas_height integer not null default 32,
  active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists weapons_category_idx on public.weapons(category_id);
grant select on public.weapons to anon, authenticated;
grant all on public.weapons to service_role;
alter table public.weapons enable row level security;
drop policy if exists "public read weapons" on public.weapons;
create policy "public read weapons" on public.weapons for select to anon, authenticated using (true);

create table if not exists public.skin_submissions (
  id uuid primary key default gen_random_uuid(),
  weapon_id uuid references public.weapons(id) on delete set null,
  pixel_data jsonb not null default '[]'::jsonb,
  preview_image_url text not null default '',
  skin_name text,
  player_name text,
  discord_name text not null,
  email text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
alter table public.skin_submissions add column if not exists skin_name text;
create index if not exists skin_submissions_weapon_idx on public.skin_submissions(weapon_id);
create index if not exists skin_submissions_status_idx on public.skin_submissions(status);
grant insert on public.skin_submissions to anon, authenticated;
grant all on public.skin_submissions to service_role;
alter table public.skin_submissions enable row level security;
drop policy if exists "public submit skins" on public.skin_submissions;
create policy "public submit skins" on public.skin_submissions
  for insert to anon, authenticated
  with check (status = 'pending' and char_length(discord_name) between 1 and 120);

-- seed default categories
insert into public.weapon_categories (name, sort_order)
select v.name, v.ord from (values
  ('Pistols',1),('MPs',2),('Assault Rifles',3),('Shotguns',4),('Sniper',5),('Knifes',6),('Specials',7)
) as v(name, ord)
where not exists (select 1 from public.weapon_categories);

-- ============================================================
-- SKIN CREATOR PLAYER ACCOUNTS (lightweight, username + password only)
-- Completely separate from the /admin login. Never exposed to anon/authenticated.
-- ============================================================
create table if not exists public.skin_creator_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists skin_creator_users_username_lower_idx
  on public.skin_creator_users (lower(username));
grant all on public.skin_creator_users to service_role;
alter table public.skin_creator_users enable row level security;
-- no anon/authenticated policies: all access happens through the skin-auth edge function

alter table public.skin_submissions
  add column if not exists user_id uuid references public.skin_creator_users(id) on delete set null;
create index if not exists skin_submissions_user_idx on public.skin_submissions(user_id);

-- guests may only insert submissions without an account link; logged-in users
-- submit through the skin-auth edge function (service role sets user_id server-side)
drop policy if exists "public submit skins" on public.skin_submissions;
create policy "public submit skins" on public.skin_submissions
  for insert to anon, authenticated
  with check (status = 'pending' and user_id is null and char_length(discord_name) between 1 and 120);

-- ---------------------------------------------------------------------------
-- Skin Creator: optional email + password reset (added later)
-- ---------------------------------------------------------------------------
alter table public.skin_creator_users
  add column if not exists email text,
  add column if not exists reset_token_hash text,
  add column if not exists reset_token_expires_at timestamptz;
create unique index if not exists skin_creator_users_email_lower_idx
  on public.skin_creator_users (lower(email)) where email is not null;
create index if not exists skin_creator_users_reset_token_idx
  on public.skin_creator_users (reset_token_hash) where reset_token_hash is not null;

-- ---------------------------------------------------------------------------
-- Skin Creator: public Community Gallery (approved skins only)
-- A view is used instead of a table policy so private columns
-- (discord_name, email, pixel_data, user_id) are never queryable by anon.
-- security_invoker stays off, so the view bypasses RLS on the base table.
-- ---------------------------------------------------------------------------
create or replace view public.public_skin_gallery as
  select s.id,
         s.preview_image_url,
         s.skin_name,
         s.player_name,
         s.created_at,
         w.name as weapon_name
    from public.skin_submissions s
    left join public.weapons w on w.id = s.weapon_id
   where s.status = 'approved';
alter view public.public_skin_gallery set (security_invoker = off);
grant select on public.public_skin_gallery to anon, authenticated;
grant all on public.public_skin_gallery to service_role;
create index if not exists skin_submissions_status_created_idx
  on public.skin_submissions(status, created_at desc);

-- ---------------------------------------------------------------------------
-- Skin Creator: community upvotes (account required, one vote per skin)
-- ---------------------------------------------------------------------------
create table if not exists public.skin_votes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.skin_submissions(id) on delete cascade,
  user_id uuid not null references public.skin_creator_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (submission_id, user_id)
);
create index if not exists skin_votes_submission_idx on public.skin_votes(submission_id);
create index if not exists skin_votes_user_idx on public.skin_votes(user_id);
grant all on public.skin_votes to service_role;
alter table public.skin_votes enable row level security;
-- no anon/authenticated policies: voting happens through the skin-auth edge function

-- gallery view now also exposes the public vote count
create or replace view public.public_skin_gallery as
  select s.id,
         s.preview_image_url,
         s.skin_name,
         s.player_name,
         s.created_at,
         w.name as weapon_name,
         (select count(*) from public.skin_votes v where v.submission_id = s.id) as vote_count
    from public.skin_submissions s
    left join public.weapons w on w.id = s.weapon_id
   where s.status = 'approved';
alter view public.public_skin_gallery set (security_invoker = off);
grant select on public.public_skin_gallery to anon, authenticated;
grant all on public.public_skin_gallery to service_role;

-- ---------------------------------------------------------------------------
-- Skin Creator: anonymous browser based upvotes + "in_game" status
-- ---------------------------------------------------------------------------
create table if not exists public.skin_upvotes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.skin_submissions(id) on delete cascade,
  voter_key text not null,
  created_at timestamptz not null default now(),
  unique (submission_id, voter_key)
);
create index if not exists skin_upvotes_submission_idx on public.skin_upvotes(submission_id);
create index if not exists skin_upvotes_voter_idx on public.skin_upvotes(voter_key);
grant select, insert, delete on public.skin_upvotes to anon, authenticated;
grant all on public.skin_upvotes to service_role;
alter table public.skin_upvotes enable row level security;

drop policy if exists "public read upvotes" on public.skin_upvotes;
create policy "public read upvotes" on public.skin_upvotes
  for select to anon, authenticated using (true);

drop policy if exists "public add upvote" on public.skin_upvotes;
create policy "public add upvote" on public.skin_upvotes
  for insert to anon, authenticated
  with check (
    char_length(voter_key) between 8 and 64
    and exists (
      select 1 from public.skin_submissions s
       where s.id = submission_id and s.status in ('approved', 'in_game')
    )
  );

drop policy if exists "public remove own upvote" on public.skin_upvotes;
create policy "public remove own upvote" on public.skin_upvotes
  for delete to anon, authenticated using (true);

-- gallery now also lists in_game skins and counts the anonymous upvotes
create or replace view public.public_skin_gallery as
  select s.id,
         s.preview_image_url,
         s.skin_name,
         s.player_name,
         s.created_at,
         s.status,
         w.name as weapon_name,
         (select count(*) from public.skin_upvotes v where v.submission_id = s.id) as vote_count
    from public.skin_submissions s
    left join public.weapons w on w.id = s.weapon_id
   where s.status in ('approved', 'in_game');
alter view public.public_skin_gallery set (security_invoker = off);
grant select on public.public_skin_gallery to anon, authenticated;
grant all on public.public_skin_gallery to service_role;

-- ============================================================
-- Bot protection (Cloudflare Turnstile)
-- Guest submissions now go through the skin-auth edge function op
-- "guest_submit", which verifies the Turnstile token server side and
-- inserts with the service role. The direct public insert path is removed
-- so the captcha cannot be bypassed by calling PostgREST directly.
-- ============================================================
drop policy if exists "public submit skins" on public.skin_submissions;
revoke insert on public.skin_submissions from anon, authenticated;

-- ============================================================
-- Fix: allow the "in_game" status and show the weapon template
-- behind the painted pixels in the public community gallery.
-- ============================================================
alter table public.skin_submissions drop constraint if exists skin_submissions_status_check;
alter table public.skin_submissions
  add constraint skin_submissions_status_check
  check (status in ('pending', 'approved', 'rejected', 'in_game'));

drop view if exists public.public_skin_gallery;
create or replace view public.public_skin_gallery as
  select s.id,
         s.preview_image_url,
         s.skin_name,
         s.player_name,
         s.created_at,
         s.status,
         s.pixel_data,
         w.name as weapon_name,
         w.template_image_url,
         w.canvas_width,
         w.canvas_height,
         (select count(*) from public.skin_upvotes v where v.submission_id = s.id) as vote_count
    from public.skin_submissions s
    left join public.weapons w on w.id = s.weapon_id
   where s.status in ('approved', 'in_game');
alter view public.public_skin_gallery set (security_invoker = off);
grant select on public.public_skin_gallery to anon, authenticated;
grant all on public.public_skin_gallery to service_role;

-- ============================================================
-- Upvotes now require a Skin Creator account.
-- Votes live in skin_votes (user based); the anonymous browser
-- based skin_upvotes path is no longer used by the app.
-- ============================================================
drop view if exists public.public_skin_gallery;
create or replace view public.public_skin_gallery as
  select s.id,
         s.preview_image_url,
         s.skin_name,
         s.player_name,
         s.created_at,
         s.status,
         s.pixel_data,
         w.name as weapon_name,
         w.template_image_url,
         w.canvas_width,
         w.canvas_height,
         (select count(*) from public.skin_votes v where v.submission_id = s.id) as vote_count
    from public.skin_submissions s
    left join public.weapons w on w.id = s.weapon_id
   where s.status in ('approved', 'in_game');
alter view public.public_skin_gallery set (security_invoker = off);
grant select on public.public_skin_gallery to anon, authenticated;
grant all on public.public_skin_gallery to service_role;

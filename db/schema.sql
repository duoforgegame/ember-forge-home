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



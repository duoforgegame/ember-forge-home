-- ============================================================
-- SOCIAL LINKS LIST (idempotent, additive only)
-- Replaces the fixed site_socials fields on the public site. site_socials is kept untouched.
-- ============================================================

create table if not exists public.site_social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'custom',
  label text not null default '',
  url text not null default '',
  icon_url text not null default '',
  visible boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists site_social_links_sort_idx on public.site_social_links(sort_order);
grant select on public.site_social_links to anon, authenticated;
grant all on public.site_social_links to service_role;
alter table public.site_social_links enable row level security;
drop policy if exists "public read social links" on public.site_social_links;
create policy "public read social links" on public.site_social_links
  for select to anon, authenticated using (true);

-- Migrate existing socials. Deterministic ids make re-runs a no-op (on conflict do nothing).
insert into public.site_social_links (id, platform, label, url, visible, sort_order)
select md5('site-social-' || v.platform)::uuid, v.platform, v.label, v.url, v.visible, v.sort_order
from public.site_socials s
cross join lateral (values
  ('discord',   'Discord',   coalesce(s.discord, ''),   coalesce(s.discord_visible, true),   0),
  ('youtube',   'YouTube',   coalesce(s.youtube, ''),   coalesce(s.youtube_visible, true),   1),
  ('tiktok',    'TikTok',    coalesce(s.tiktok, ''),    coalesce(s.tiktok_visible, true),    2),
  ('x',         'X',         coalesce(s.twitter, ''),   coalesce(s.twitter_visible, true),   4),
  ('instagram', 'Instagram', coalesce(s.instagram, ''), coalesce(s.instagram_visible, true), 5)
) as v(platform, label, url, visible, sort_order)
where s.id = 1 and v.url <> ''
on conflict (id) do nothing;

-- Steam link: previously derived in code from the first game with a Steam store button.
insert into public.site_social_links (id, platform, label, url, visible, sort_order)
select md5('site-social-steam')::uuid, 'steam', 'Steam', p.button_url, true, 3
from public.site_projects p
where p.button_url ~* 'store\.steampowered\.com'
order by p.sort_order
limit 1
on conflict (id) do nothing;

notify pgrst, 'reload schema';

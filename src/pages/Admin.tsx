import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, LogOut, Trash2, Plus, Save, Upload, ImageIcon, FileText, ArrowUp, ArrowDown, ExternalLink, X, Layers, Eye, EyeOff, GripVertical, Copy, Gamepad2, PanelTop, Goal, Users, Mail, Share2, PanelBottom, Palette, Scale, Bell, MessagesSquare, PanelLeftClose, PanelLeftOpen, LayoutDashboard, GalleryHorizontal, CircleDot, Check, Reply, ChevronRight } from "lucide-react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { adminLogin, adminCall, clearToken, uploadProjectCover, uploadPressAsset, slugify } from "@/lib/api";
import { statusBadgeStyle } from "@/pages/Landing";
import { AnnouncementBannerPreview } from "@/components/AnnouncementBanner";
import { FeaturedGameCard } from "@/components/FeaturedGameCard";
import { GamesHero, MissionSection, TeamSection, ContactSection, type ProjectView } from "@/pages/Landing";
import { SocialIconLinks, SocialIcon, SOCIAL_PLATFORMS, platformLabel, type SocialLink } from "@/components/SocialIconLinks";
import { GamePageCanvas, type GameBlock, type GameProject } from "@/pages/GamePage";
import adminLogo from "@/assets/dfg-logo.png";
import "./admin.css";

type ProjectRow = { id?: string; title: string; description: string; cover_url: string; key_art_url?: string; trailer_url?: string; info_bar_color?: string; visible?: boolean; status: string; button_label: string; button_url: string; sort_order: number; press_kit_enabled?: boolean; more_info_enabled?: boolean };
type TeamRow = { id?: string; name: string; gamer_tag?: string; real_name?: string; role: string; bio: string; sort_order: number };
type LinkRow = { id?: string; label: string; url: string; sort_order: number; visible?: boolean };
type Socials = { id: number; twitter: string; tiktok: string; instagram: string; discord: string; youtube: string; twitter_visible?: boolean; tiktok_visible?: boolean; instagram_visible?: boolean; discord_visible?: boolean; youtube_visible?: boolean };
type About = { id: number; intro_html: string };
type LandingSettingsRow = {
  id: number; slider_autoplay: boolean; slider_interval_seconds: number;
  header_banner_logo_url: string; header_sticky_logo_url: string; header_studio_line: string; header_established_line: string;
  discord_button_label: string; discord_button_url: string; mission_visible: boolean; mission_text: string; mission_signoff: string;
  about_heading: string; contact_heading: string; contact_direct_text: string; contact_email: string;
  footer_logo_url: string; footer_copyright: string;
};
type MissionLineRow = { id?: string; text: string; style: "white_black" | "black_orange"; sort_order: number };
type PlatformRow = { id?: string; project_id: string; name: string; logo_url: string; store_url: string; sort_order: number };
const LANDING_SETTINGS_DEFAULTS: LandingSettingsRow = {
  id: 1, slider_autoplay: true, slider_interval_seconds: 6,
  header_banner_logo_url: "", header_sticky_logo_url: "", header_studio_line: "A TWO-PERSON INDIE STUDIO FROM LÜBECK, GERMANY", header_established_line: "EST. 2021",
  discord_button_label: "DISCORD", discord_button_url: "", mission_visible: true, mission_text: "We make the kind of games we'd play ourselves. Easy to pick up, hard to put down, and always a little bit of \"just one more\". Every update is shaped by the people who actually play them, from our Discord to the Steam reviews.", mission_signoff: "Forged together with our community.",
  about_heading: "ABOUT US", contact_heading: "CONTACT", contact_direct_text: "Or reach us directly at", contact_email: "info@duoforgegames.com",
  footer_logo_url: "", footer_copyright: "© 2026 Duo Forge Games. All rights reserved.",
};
type Submission = { id: string; name: string; email: string; subject: string; message: string; inquiry_type: string; created_at: string };

const INQUIRY_META: Record<string, { label: string; className: string }> = {
  player:    { label: "Player",               className: "is-player" },
  press:     { label: "Press / Media",        className: "is-press" },
  publisher: { label: "Publisher / Business", className: "is-publisher" },
  other:     { label: "Other",                className: "is-other" },
};
type StatusColor = { status: string; color: string };

const DEFAULT_STATUSES = ["Play Now", "In Development", "Coming Soon", "Prototype"] as const;

const TABS = ["Overview", "Games", "Carousel", "Header", "Mission", "About", "Contact", "Socials", "Footer", "Messages", "Banner", "Status colors", "Legal"] as const;
type Tab = (typeof TABS)[number];

/* Every section gets a plain-language hint so it is obvious what you are editing and where it shows up. */
const TAB_META: Record<Tab, { title: string; hint: string }> = {
  Overview: { title: "Overview", hint: "What's live right now and what still needs attention." },
  Games: { title: "Games", hint: "Your games in the homepage slider. Drag to change the order." },
  Carousel: { title: "Hero carousel", hint: "Pick which images run through the tile strip on the homepage, and in what order." },
  Header: { title: "Header", hint: "The studio line shows on the homepage hero. Logos and menu links are used on game and press pages." },
  Mission: { title: "Mission", hint: "The orange band below the games: headline lines run in the ticker, the text is the big quote." },
  About: { title: "About us", hint: "Studio intro and the team cards. The headline is the small label above the section." },
  Contact: { title: "Contact", hint: "Headline and email next to the contact form." },
  Socials: { title: "Social links", hint: "Icons shown in the contact section and the Discord button." },
  Footer: { title: "Footer", hint: "Logo, copyright and legal links at the very bottom." },
  Messages: { title: "Messages", hint: "Everything people sent through the contact form." },
  Banner: { title: "Announcement banner", hint: "A strip above the whole site for news like a launch or sale." },
  "Status colors": { title: "Status colors", hint: "Badge colors for Play Now, In Development and so on." },
  Legal: { title: "Legal pages", hint: "Imprint and privacy policy." },
};

const TAB_GROUPS = [
  { label: "Start", tabs: [{ name: "Overview" as Tab, icon: LayoutDashboard }] },
  { label: "Content", tabs: [
    { name: "Games" as Tab, icon: Gamepad2 },
    { name: "Carousel" as Tab, icon: GalleryHorizontal },
    { name: "Socials" as Tab, icon: Share2 },
    { name: "Messages" as Tab, icon: MessagesSquare },
  ] },
  { label: "Homepage sections", tabs: [
    { name: "Header" as Tab, icon: PanelTop },
    { name: "Mission" as Tab, icon: Goal },
    { name: "About" as Tab, icon: Users },
    { name: "Contact" as Tab, icon: Mail },
    { name: "Footer" as Tab, icon: PanelBottom },
  ] },
  { label: "Settings", tabs: [
    { name: "Banner" as Tab, icon: Bell },
    { name: "Status colors" as Tab, icon: Palette },
    { name: "Legal" as Tab, icon: Scale },
  ] },
] as const;

export default function Admin() {
  // Always require the password again when the panel is opened.
  useEffect(() => { clearToken(); }, []);
  const [authed, setAuthed] = useState<boolean>(false);
  return authed ? <Dashboard onLogout={() => setAuthed(false)} /> : <Login onOk={() => setAuthed(true)} />;
}

function Login({ onOk }: { onOk: () => void }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await adminLogin(password);
      onOk();
    } catch (err: any) {
      setError(err?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="admin-login">
      <form onSubmit={submit} className="admin-login-card">
        <img src={adminLogo} alt="Duo Forge Games" width={64} height={64} />
        <h1>Welcome back</h1>
        <p>Log in to edit the Duo Forge Games website.</p>
        <div className="admin-login-field">
          <Label htmlFor="pwd">Password</Label>
          <Input id="pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus autoComplete="current-password" />
        </div>
        {error && <p className="admin-login-error">{error}</p>}
        <Button type="submit" disabled={loading || !password} className="w-full">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Log in
        </Button>
        <a href="/" className="admin-login-back">Back to the website</a>
      </form>
    </div>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("Overview");
  const [dirty, setDirty] = useState(false);
  const [menuOpen, setMenuOpen] = useState(() => !window.matchMedia("(max-width: 760px)").matches);
  const [messageCount, setMessageCount] = useState<number | null>(null);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);
  useEffect(() => {
    adminCall({ op: "list_submissions" }).then((res) => setMessageCount((res?.rows ?? []).length)).catch(() => setMessageCount(null));
  }, []);
  const changeTab = (next: Tab) => {
    if (window.matchMedia("(max-width: 760px)").matches) setMenuOpen(false);
    if (next === tab) return;
    if (dirty && !confirm("You have unsaved changes. Leave without saving?")) return;
    setDirty(false); setTab(next);
    window.scrollTo({ top: 0 });
  };
  const logout = () => { if (dirty && !confirm("You have unsaved changes. Log out anyway?")) return; clearToken(); onLogout(); };
  const meta = TAB_META[tab];
  return (
    <div className={`admin-center min-h-screen ${menuOpen ? "admin-menu-open" : "admin-menu-collapsed"}`}>
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <img src={adminLogo} alt="Duo Forge Games" />
          <div className="admin-brand-copy">
            <strong>Duo Forge</strong>
            <span>Website admin</span>
          </div>
          <Button variant="ghost" size="icon" className="admin-sidebar-toggle" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? "Collapse admin menu" : "Expand admin menu"} title={menuOpen ? "Collapse menu" : "Expand menu"}>
            {menuOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
          </Button>
        </div>

        <nav className="admin-nav" aria-label="Admin sections">
          {TAB_GROUPS.map((group) => (
            <div className="admin-nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.tabs.map(({ name, icon: Icon }) => (
                <button
                  type="button"
                  key={name}
                  onClick={() => changeTab(name)}
                  className={tab === name ? "is-active" : ""}
                  aria-current={tab === name ? "page" : undefined}
                  title={!menuOpen ? TAB_META[name].title : undefined}
                >
                  <Icon />
                  <span>{TAB_META[name].title}</span>
                  {name === "Messages" && !!messageCount && <b className="admin-nav-count">{messageCount}</b>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <a href="/" target="_blank" rel="noopener noreferrer" title="Open the website"><ExternalLink /><span>View website</span></a>
          <button type="button" onClick={logout} title="Log out"><LogOut /><span>Log out</span></button>
        </div>
      </aside>
      {menuOpen && <button type="button" className="admin-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}

      <div className="admin-workspace">
        <header className="admin-command-bar">
          <Button variant="ghost" size="icon" className="admin-mobile-toggle" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle admin menu"><PanelLeftOpen /></Button>
          <div className="admin-command-title">
            <h1>{meta.title}</h1>
            <p>{meta.hint}</p>
          </div>
          {dirty && <span className="admin-dirty-pill"><i />Unsaved changes</span>}
        </header>
        <main>
        {tab === "Overview" && <OverviewPanel onOpen={changeTab} />}
        {tab === "Games" && <ProjectsPanel onDirty={setDirty} />}
        {tab === "Carousel" && <CarouselPanel onDirty={setDirty} />}
        {tab === "Header" && <HeaderPanel onDirty={setDirty} />}
        {tab === "Mission" && <MissionPanel onDirty={setDirty} />}
        {tab === "About" && <AboutPanel onDirty={setDirty} />}
        {tab === "Contact" && <ContactPanel onDirty={setDirty} />}
        {tab === "Socials" && <SocialsPanel onDirty={setDirty} />}
        {tab === "Footer" && <FooterPanel onDirty={setDirty} />}
        {tab === "Status colors" && <StatusColorsPanel />}
        {tab === "Legal" && <LegalPanel />}
        {tab === "Banner" && <AnnouncementPanel />}
        {tab === "Messages" && <MessagesPanel onCount={setMessageCount} />}
        </main>
      </div>
    </div>
  );
}

/* Start page: a quick read of what's live and a short to-do list built from the real data. */
function OverviewPanel({ onOpen }: { onOpen: (tab: Tab) => void }) {
  const projects = useLoader<ProjectRow[]>(() => loadTable("site_projects"));
  const messages = useLoader<Submission[]>(async () => (await adminCall({ op: "list_submissions" })).rows as Submission[]);
  const banner = useLoader<{ enabled: boolean; message: string } | null>(async () => {
    const { supabase } = await import("@/lib/supabase");
    const { data } = await supabase.from("site_announcement").select("enabled,message").eq("id", 1).maybeSingle();
    return data as { enabled: boolean; message: string } | null;
  });
  const shots = useLoader<{ project_id: string }[]>(async () => {
    const { supabase } = await import("@/lib/supabase");
    const [a, b] = await Promise.all([
      supabase.from("site_press_screenshots").select("project_id"),
      supabase.from("site_game_page_blocks").select("project_id").eq("block_type", "gallery"),
    ]);
    return [...(a.data ?? []), ...(b.data ?? [])] as { project_id: string }[];
  });
  const games = projects.data ?? [];
  const inbox = [...(messages.data ?? [])].sort((x, y) => y.created_at.localeCompare(x.created_at));
  const todos: { text: string; tab: Tab }[] = [];
  games.forEach((g) => {
    const name = g.title || "Untitled game";
    if (!g.key_art_url && !g.cover_url) todos.push({ text: `${name} has no key art yet`, tab: "Games" });
    if (!g.more_info_enabled) todos.push({ text: `${name}: game info page is off, so there is no "More info" button`, tab: "Games" });
    if (!g.trailer_url) todos.push({ text: `${name} has no trailer`, tab: "Games" });
    if (g.id && !(shots.data ?? []).some((s) => s.project_id === g.id)) todos.push({ text: `${name} has no screenshots`, tab: "Games" });
  });
  return (
    <div className="admin-overview">
      <section className="admin-stat-row">
        <button type="button" className="admin-stat" onClick={() => onOpen("Games")}>
          <span>Games</span>
          <strong>{projects.data ? games.filter((g) => g.visible !== false).length : "…"}</strong>
          <small>{games.filter((g) => g.visible === false).length ? `${games.filter((g) => g.visible === false).length} hidden` : "all visible"}</small>
        </button>
        <button type="button" className="admin-stat" onClick={() => onOpen("Messages")}>
          <span>Messages</span>
          <strong>{messages.data ? inbox.length : "…"}</strong>
          <small>{inbox[0] ? `latest ${new Date(inbox[0].created_at).toLocaleDateString()}` : "inbox empty"}</small>
        </button>
        <button type="button" className="admin-stat" onClick={() => onOpen("Banner")}>
          <span>Announcement banner</span>
          <strong className={banner.data?.enabled ? "is-on" : ""}>{banner.data?.enabled ? "On" : "Off"}</strong>
          <small>{banner.data?.enabled ? banner.data.message.slice(0, 40) : "nothing shown above the site"}</small>
        </button>
      </section>

      <div className="admin-overview-grid">
        <section className="admin-card">
          <div className="admin-card-head"><h2>Your games</h2><Button size="sm" variant="outline" onClick={() => onOpen("Games")}>Edit games</Button></div>
          {projects.loading && <Spinner />}
          <ul className="admin-game-mini">
            {games.map((g) => (
              <li key={g.id ?? g.title}>
                {g.key_art_url || g.cover_url ? <img src={g.key_art_url || g.cover_url} alt="" /> : <span className="admin-thumb-empty"><ImageIcon /></span>}
                <div><strong>{g.title || "Untitled game"}</strong><small>{g.status}{g.visible === false ? " · hidden" : ""}</small></div>
              </li>
            ))}
          </ul>
        </section>

        <section className="admin-card">
          <div className="admin-card-head"><h2>To do</h2><span className="admin-muted">{todos.length ? `${todos.length} open` : "all done"}</span></div>
          {todos.length === 0 && !projects.loading && <p className="admin-muted">Nothing missing. Nice!</p>}
          <ul className="admin-todo">
            {todos.slice(0, 8).map((t, i) => <li key={i}><button type="button" onClick={() => onOpen(t.tab)}><CircleDot />{t.text}</button></li>)}
          </ul>
        </section>

        <section className="admin-card admin-overview-wide">
          <div className="admin-card-head"><h2>Latest messages</h2><Button size="sm" variant="outline" onClick={() => onOpen("Messages")}>Open inbox</Button></div>
          {messages.loading && <Spinner />}
          {!messages.loading && inbox.length === 0 && <p className="admin-muted">No messages yet.</p>}
          <ul className="admin-inbox-mini">
            {inbox.slice(0, 4).map((m) => (
              <li key={m.id}>
                <span className={`admin-pill ${INQUIRY_META[m.inquiry_type]?.className ?? INQUIRY_META.other.className}`}>{(INQUIRY_META[m.inquiry_type] ?? INQUIRY_META.other).label}</span>
                <strong>{m.subject}</strong>
                <small>{m.name} · {new Date(m.created_at).toLocaleDateString()}</small>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function useLoader<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = async () => {
    setLoading(true);
    try { setData(await load()); setError(null); }
    catch (e: any) { setError(e?.message ?? "Load failed"); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, deps);
  return { data, loading, error, reload, setData };
}

async function loadTable<T>(table: string): Promise<T[]> {
  const { supabase } = await import("@/lib/supabase");
  const { data, error } = await supabase.from(table).select("*").order("sort_order", { ascending: true });
  if (error) throw tableError(table, error);
  return (data ?? []) as T[];
}

function tableError(table: string, error: { message?: string; code?: string; status?: number } | any) {
  const msg = error?.message || "request failed";
  const missing = error?.code === "PGRST205" || error?.code === "42P01" || /not find the table|does not exist|404/i.test(msg);
  return new Error(missing
    ? `Table "${table}" was not found in the database. Run db/migrations/2026_landing_redesign.sql in the Supabase SQL editor, then reload.`
    : `Could not load "${table}": ${msg}`);
}

function firstError(...loaders: { error: string | null }[]) {
  return loaders.find((l) => l.error)?.error ?? null;
}

async function loadSettings(): Promise<LandingSettingsRow> {
  const { supabase } = await import("@/lib/supabase");
  const { data, error } = await supabase.from("site_landing_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw tableError("site_landing_settings", error);
  return { ...LANDING_SETTINGS_DEFAULTS, ...(data ?? {}) };
}

function ProjectsPanel({ onDirty }: { onDirty?: (dirty: boolean) => void }) {
  const { data, loading, error, reload, setData } = useLoader<ProjectRow[]>(() => loadTable("site_projects"));
  const settingsLoader = useLoader<LandingSettingsRow>(loadSettings);
  const platformsLoader = useLoader<PlatformRow[]>(() => loadTable("site_game_platforms"));
  const colorsLoader = useLoader<StatusColor[]>(async () => {
    const { supabase } = await import("@/lib/supabase");
    const { data } = await supabase.from("site_status_colors").select("*");
    return (data ?? []) as StatusColor[];
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [pressKitFor, setPressKitFor] = useState<ProjectRow | null>(null);
  const [gamePageFor, setGamePageFor] = useState<ProjectRow | null>(null);
  const [selected, setSelected] = useState(0);
  const loadError = error || firstError(settingsLoader, platformsLoader);
  if (loadError) return <ErrorMsg text={loadError} />;
  if (loading || !settingsLoader.data || !platformsLoader.data) return <Spinner />;
  const rows = data ?? [];
  const settings = settingsLoader.data ?? LANDING_SETTINGS_DEFAULTS;
  const platforms = platformsLoader.data ?? [];
  const colorMap: Record<string, string> = {
    "Play Now": "#10b981", "In Development": "#f59e0b", "Coming Soon": "#0ea5e9", Prototype: "#a1a1aa",
  };
  for (const c of colorsLoader.data ?? []) colorMap[c.status] = c.color;

  const update = (i: number, patch: Partial<ProjectRow>) => { onDirty?.(true); setData(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r)); };
  const addRow = () => { onDirty?.(true); setData([...rows, { title: "", description: "", cover_url: "", key_art_url: "", trailer_url: "", info_bar_color: "", visible: true, status: "In Development", button_label: "", button_url: "", sort_order: rows.length, press_kit_enabled: false, more_info_enabled: false }]); };
  const removeRow = async (i: number) => {
    const row = rows[i];
    if (!confirm("Delete this game?")) return;
    if (row.id) await adminCall({ op: "delete", table: "site_projects", id: row.id });
    setData(rows.filter((_, idx) => idx !== i)); setSelected(Math.max(0, i - 1)); onDirty?.(true);
  };
  const saveAll = async () => {
    setSaving(true); setMsg("");
    try { await Promise.all([adminCall({ op: "upsert", table: "site_projects", rows: rows.map((row, index) => ({ ...row, cover_url: row.key_art_url || row.cover_url, sort_order: index })) }), adminCall({ op: "upsert", table: "site_landing_settings", rows: [settings] }), platforms.length ? adminCall({ op: "upsert", table: "site_game_platforms", rows: platforms.map((row, index) => ({ ...row, sort_order: index })) }) : Promise.resolve()]); setMsg("Saved"); onDirty?.(false); await reload(); }
    catch (e: any) { setMsg(e?.message ?? "Save failed"); }
    finally { setSaving(false); }
  };
  const current = Math.min(selected, Math.max(rows.length - 1, 0));
  const r = rows[current];
  const i = current;
  const ids = rows.map((row, idx) => row.id ?? `new-${idx}`);
  const addAndSelect = () => { addRow(); setSelected(rows.length); };
  return (
    <div className="space-y-4">
      <PanelHeader title="Games" onAdd={addAndSelect} addLabel="New game" onSave={saveAll} saving={saving} msg={msg} />
      <div className="admin-games-layout">
        <aside className="admin-games-list">
          <DndContext collisionDetection={closestCenter} onDragEnd={({ active, over }) => { if (!over || active.id === over.id) return; const oldIndex = ids.indexOf(String(active.id)); const newIndex = ids.indexOf(String(over.id)); setData(arrayMove(rows, oldIndex, newIndex)); if (current === oldIndex) setSelected(newIndex); onDirty?.(true); }}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              {rows.map((row, idx) => (
                <SortableGameItem key={ids[idx]} id={ids[idx]} active={idx === current} onSelect={() => setSelected(idx)}>
                  {row.key_art_url || row.cover_url ? <img src={row.key_art_url || row.cover_url} alt="" /> : <span className="admin-thumb-empty"><ImageIcon /></span>}
                  <span className="admin-games-list-copy">
                    <strong>{row.title || "Untitled game"}</strong>
                    <small><i style={{ background: colorMap[row.status] ?? "#a1a1aa" }} />{row.status}{row.visible === false ? " · hidden" : ""}</small>
                  </span>
                  <ChevronRight className="admin-games-list-arrow" />
                </SortableGameItem>
              ))}
            </SortableContext>
          </DndContext>
          {rows.length === 0 && <p className="admin-hint">No games yet. Click "New game" to add one.</p>}
          <div className="admin-card admin-slider-settings">
            <h3 className="admin-subhead">Homepage slider</h3>
            <ToggleField label="Rotate automatically" value={settings.slider_autoplay} onChange={(v) => { onDirty?.(true); settingsLoader.setData({ ...settings, slider_autoplay: v }); }} />
            {settings.slider_autoplay && <NumField label="Seconds per game" value={settings.slider_interval_seconds} onChange={(v) => { onDirty?.(true); settingsLoader.setData({ ...settings, slider_interval_seconds: Math.max(2, Math.min(60, v)) }); }} />}
          </div>
        </aside>

        {r && (
          <div className="admin-game-editor" key={ids[current]}>
            <section className="admin-card">
              <div className="admin-card-head">
                <h3>Basics</h3>
                <ToggleField label={r.visible !== false ? "Visible on the website" : "Hidden from the website"} value={r.visible !== false} onChange={(v) => update(i, { visible: v })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Game title" value={r.title} onChange={(v) => update(i, { title: v })} />
                <StatusSelect value={r.status} options={Object.keys(colorMap)} onChange={(v) => update(i, { status: v })} />
                <TextField className="sm:col-span-2" rows={4} label="Short description" hint={`${r.description.length}/350 characters. Shown under the title in the slider.`} value={r.description} onChange={(v) => update(i, { description: v.slice(0, 350) })} />
              </div>
            </section>

            <section className="admin-card">
              <h3>Images & video</h3>
              <CoverUploader value={r.key_art_url || r.cover_url} onChange={(v) => update(i, { key_art_url: v, cover_url: v })} />
              <div className="grid gap-4 sm:grid-cols-2 mt-4">
                <Field label="YouTube trailer" hint="Adds a play button on the key art." placeholder="https://youtube.com/watch?v=…" value={r.trailer_url || ""} onChange={(v) => update(i, { trailer_url: v })} />
                <ColorField label="Info bar color" value={r.info_bar_color || "#e8702a"} onChange={(v) => update(i, { info_bar_color: v })} />
              </div>
            </section>

            <section className="admin-card">
              <h3>Store button</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Button text" placeholder="Wishlist on Steam" value={r.button_label} onChange={(v) => update(i, { button_label: v })} />
                <Field label="Button link" placeholder="https://store.steampowered.com/app/…" value={r.button_url} onChange={(v) => update(i, { button_url: v })} />
              </div>
              <PlatformEditor project={r} rows={platforms.filter((platform) => platform.project_id === r.id)} onChange={(next) => { onDirty?.(true); platformsLoader.setData([...platforms.filter((platform) => platform.project_id !== r.id), ...next]); }} />
            </section>

            <section className="admin-card">
              <h3>Extra pages</h3>
              <div className="admin-page-toggles">
                <div className="admin-page-toggle">
                  <ToggleField label="Game info page" description={`Your own page at /games/${slugify(r.title || "slug")}. When on, a "More info" button appears and carousel tiles link here. When off, they go to the store.`} value={!!r.more_info_enabled} onChange={(v) => update(i, { more_info_enabled: v })} />
                  <Button type="button" variant="outline" size="sm" disabled={!r.id || !r.more_info_enabled} onClick={() => setGamePageFor(r)} title={!r.id ? "Save the game first" : !r.more_info_enabled ? "Switch the page on first" : "Edit game page"}><Layers className="mr-2 h-4 w-4" /> Edit page</Button>
                </div>
                <div className="admin-page-toggle">
                  <ToggleField label="Press kit" description={`Download page for journalists at /press/${slugify(r.title || "slug")}.`} value={!!r.press_kit_enabled} onChange={(v) => update(i, { press_kit_enabled: v })} />
                  <Button type="button" variant="outline" size="sm" disabled={!r.id || !r.press_kit_enabled} onClick={() => setPressKitFor(r)} title={!r.id ? "Save the game first" : !r.press_kit_enabled ? "Switch the press kit on first" : "Edit press kit"}><FileText className="mr-2 h-4 w-4" /> Edit press kit</Button>
                </div>
              </div>
              {!r.id && <p className="admin-hint mt-3">Save this new game once to unlock its extra pages.</p>}
            </section>

            <section className="admin-card">
              <h3>Preview</h3>
              <div className="admin-game-preview public-landing"><div className="landing-shell"><GamesHero preview projects={[{ title: r.title || "Untitled game", description: r.description, cover: r.key_art_url || r.cover_url, status: r.status as any, buttonLabel: r.button_label, buttonUrl: r.button_url, trailerUrl: r.trailer_url, infoBarColor: r.info_bar_color, platforms: platforms.filter((platform) => platform.project_id === r.id) } as ProjectView]} /></div></div>
            </section>

            <div className="admin-danger">
              <span>Delete <strong>{r.title || "this game"}</strong> from the website. This can't be undone.</span>
              <Button variant="ghost" size="sm" onClick={() => removeRow(i)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete game</Button>
            </div>
          </div>
        )}
      </div>
      {pressKitFor?.id && (
        <PressKitDialog
          project={pressKitFor}
          onClose={() => setPressKitFor(null)}
        />
      )}
      {gamePageFor?.id && (
        <GamePageDialog project={gamePageFor} platforms={platforms.filter((platform) => platform.project_id === gamePageFor.id)} onClose={() => setGamePageFor(null)} />
      )}
    </div>
  );
}

function SortableGameItem({ id, active, onSelect, children }: { id: string; active: boolean; onSelect: () => void; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`admin-games-list-item ${active ? "is-active" : ""}`}>
      <button type="button" className="admin-games-grip" {...attributes} {...listeners} aria-label="Drag to reorder"><GripVertical /></button>
      <button type="button" className="admin-games-select" onClick={onSelect} aria-current={active ? "true" : undefined}>{children}</button>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * HERO CAROUSEL: choose the images that run through the homepage tile strip.
 * Stored in site_hero_tiles. An empty table means the site picks images itself.
 * ------------------------------------------------------------------------- */
type HeroTileRow = { id?: string; project_id: string; url: string; fit: "cover" | "contain"; visible: boolean; sort_order: number };
type LibraryImage = { project_id: string; url: string; fit: "cover" | "contain"; source: string };

async function loadHeroTiles(): Promise<HeroTileRow[] | null> {
  const { supabase } = await import("@/lib/supabase");
  const { data, error } = await supabase.from("site_hero_tiles").select("*").order("sort_order");
  if (error) {
    const missing = error.code === "PGRST205" || error.code === "42P01" || /not find the table|does not exist/i.test(error.message || "");
    if (missing) return null;
    throw tableError("site_hero_tiles", error);
  }
  return (data ?? []) as HeroTileRow[];
}

async function loadImageLibrary(projects: ProjectRow[]): Promise<LibraryImage[]> {
  const { supabase } = await import("@/lib/supabase");
  const [shots, kits, blocks] = await Promise.all([
    supabase.from("site_press_screenshots").select("project_id,url").order("sort_order"),
    supabase.from("site_press_kits").select("project_id,key_art_url,game_logo_url"),
    supabase.from("site_game_page_blocks").select("project_id,block_type,content").order("sort_order"),
  ]);
  const out: LibraryImage[] = [];
  const add = (project_id: string, url: string, fit: "cover" | "contain", source: string) => {
    if (url && !out.some((x) => x.project_id === project_id && x.url === url)) out.push({ project_id, url, fit, source });
  };
  projects.forEach((p) => p.id && add(p.id, p.key_art_url || p.cover_url, "cover", "Key art"));
  ((kits.data ?? []) as { project_id: string; key_art_url: string; game_logo_url: string }[]).forEach((k) => {
    add(k.project_id, k.key_art_url, "contain", "Press kit art");
    add(k.project_id, k.game_logo_url, "contain", "Game logo");
  });
  ((shots.data ?? []) as { project_id: string; url: string }[]).forEach((x) => add(x.project_id, x.url, "cover", "Press screenshot"));
  ((blocks.data ?? []) as { project_id: string; block_type: string; content: any }[]).forEach((b) => {
    if (b.block_type === "gallery" && Array.isArray(b.content?.images)) b.content.images.forEach((url: string) => add(b.project_id, url, "cover", "Game page gallery"));
    if (b.block_type === "hero" && b.content?.image_url) add(b.project_id, b.content.image_url, "cover", "Game page hero");
  });
  return out;
}

function CarouselPanel({ onDirty }: { onDirty: (dirty: boolean) => void }) {
  const projectsLoader = useLoader<ProjectRow[]>(() => loadTable("site_projects"));
  const tilesLoader = useLoader<HeroTileRow[] | null>(loadHeroTiles);
  const libraryLoader = useLoader<LibraryImage[]>(async () => loadImageLibrary(await loadTable<ProjectRow>("site_projects")));
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [uploadFor, setUploadFor] = useState("");

  { const e = firstError(projectsLoader, tilesLoader, libraryLoader); if (e) return <ErrorMsg text={e} />; }
  if (projectsLoader.loading || tilesLoader.loading || libraryLoader.loading) return <Spinner />;
  const projects = (projectsLoader.data ?? []).filter((p) => p.id);
  if (tilesLoader.data === null) {
    return (
      <div className="admin-card admin-setup">
        <h3>One-time setup needed</h3>
        <p className="admin-hint">The table for carousel images doesn't exist yet. Until it does, the homepage picks images automatically.</p>
        <ol>
          <li>Open the Supabase SQL editor and run <code>db/migrations/2026_hero_carousel.sql</code>.</li>
          <li>Redeploy the admin function: <code>supabase functions deploy admin-write --no-verify-jwt</code></li>
          <li>Reload this page.</li>
        </ol>
      </div>
    );
  }
  const tiles = tilesLoader.data ?? [];
  const library = libraryLoader.data ?? [];
  const gameName = (id: string) => projects.find((p) => p.id === id)?.title || "Unknown game";
  const ids = tiles.map((t, i) => t.id ?? `new-${i}-${t.url}`);
  const setTiles = (next: HeroTileRow[]) => { onDirty(true); tilesLoader.setData(next.map((t, i) => ({ ...t, sort_order: i }))); };
  const update = (i: number, patch: Partial<HeroTileRow>) => setTiles(tiles.map((t, n) => (n === i ? { ...t, ...patch } : t)));
  const remove = (i: number) => { const t = tiles[i]; if (t.id) setDeletedIds([...deletedIds, t.id]); setTiles(tiles.filter((_, n) => n !== i)); };
  const inCarousel = (img: { project_id: string; url: string }) => tiles.some((t) => t.url === img.url && t.project_id === img.project_id);
  const addImage = (img: { project_id: string; url: string; fit: "cover" | "contain" }) => {
    if (inCarousel(img)) return;
    setTiles([...tiles, { project_id: img.project_id, url: img.url, fit: img.fit, visible: true, sort_order: tiles.length }]);
  };
  const addAll = () => setTiles([...tiles, ...library.filter((img) => !inCarousel(img)).map((img, i) => ({ project_id: img.project_id, url: img.url, fit: img.fit, visible: true, sort_order: tiles.length + i }))]);
  const upload = async (projectId: string, files: FileList | null) => {
    if (!files?.length) return;
    setMsg("");
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) urls.push(await uploadPressAsset(file, "press_image"));
      setTiles([...tiles, ...urls.map((url, i) => ({ project_id: projectId, url, fit: "cover" as const, visible: true, sort_order: tiles.length + i }))]);
    } catch (e: any) { setMsg(e?.message ?? "Upload failed"); }
  };
  const save = async () => {
    setSaving(true); setMsg("");
    try {
      for (const id of deletedIds) await adminCall({ op: "delete", table: "site_hero_tiles", id });
      if (tiles.length) await adminCall({ op: "upsert", table: "site_hero_tiles", rows: tiles.map((t, i) => ({ ...t, sort_order: i })) });
      setDeletedIds([]); onDirty(false); setMsg("Saved"); await tilesLoader.reload();
    } catch (e: any) {
      const text = String(e?.message ?? "Save failed");
      setMsg(/table not allowed/i.test(text) ? "Can't save yet: redeploy the admin-write function in Supabase (see setup steps)." : text);
    }
    finally { setSaving(false); }
  };
  const visibleCount = tiles.filter((t) => t.visible).length;

  return (
    <div className="space-y-4">
      <PanelHeader title="Hero carousel" onSave={save} saving={saving} msg={msg} />

      <div className={`admin-mode-note ${visibleCount ? "is-manual" : ""}`}>
        {visibleCount ? (
          <p><strong>Manual selection.</strong> Once saved, the homepage shows these {visibleCount} images in this order. Fewer than 12 repeat to fill the strip.</p>
        ) : (
          <p><strong>Automatic mode.</strong> Nothing is selected, so the homepage shows all key art and screenshots of your games. Add images below to choose yourself.</p>
        )}
        {library.some((img) => !inCarousel(img)) && <Button variant="outline" size="sm" onClick={addAll}><Plus className="mr-2 h-4 w-4" />Add all images</Button>}
      </div>

      <section className="admin-card">
        <div className="admin-card-head"><h3>In the carousel</h3><span className="admin-muted">{tiles.length} image{tiles.length === 1 ? "" : "s"} · drag to reorder</span></div>
        {tiles.length === 0 && <p className="admin-hint">No images picked yet. Click an image in the library below to add it.</p>}
        <DndContext collisionDetection={closestCenter} onDragEnd={({ active, over }) => { if (!over || active.id === over.id) return; const o = ids.indexOf(String(active.id)); const n = ids.indexOf(String(over.id)); if (o < 0 || n < 0) return; setTiles(arrayMove(tiles, o, n)); }}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="admin-tile-list">
              {tiles.map((t, i) => (
                <SortableTileRow key={ids[i]} id={ids[i]} dimmed={!t.visible}>
                  <span className={`admin-tile-thumb ${t.fit === "contain" ? "is-contain" : ""}`}><img src={t.url} alt="" /></span>
                  <div className="admin-tile-fields">
                    <select value={t.project_id} onChange={(e) => update(i, { project_id: e.target.value })} aria-label="Links to game">
                      {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                    <div className="admin-segment" role="group" aria-label="How the image fits the tile">
                      <button type="button" className={t.fit === "cover" ? "is-active" : ""} onClick={() => update(i, { fit: "cover" })}>Fill tile</button>
                      <button type="button" className={t.fit === "contain" ? "is-active" : ""} onClick={() => update(i, { fit: "contain" })}>Show whole</button>
                    </div>
                  </div>
                  <div className="admin-tile-actions">
                    <Button variant="ghost" size="icon" title={t.visible ? "Shown, click to hide" : "Hidden, click to show"} onClick={() => update(i, { visible: !t.visible })}>{t.visible ? <Eye /> : <EyeOff />}</Button>
                    <Button variant="ghost" size="icon" title="Remove from carousel" onClick={() => remove(i)}><X /></Button>
                  </div>
                </SortableTileRow>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </section>

      <section className="admin-card">
        <div className="admin-card-head"><h3>Image library</h3><span className="admin-muted">Click an image to add it</span></div>
        {projects.map((p) => {
          const imgs = library.filter((img) => img.project_id === p.id);
          return (
            <div key={p.id} className="admin-library-group">
              <div className="admin-library-head">
                <strong>{p.title}</strong>
                <label className="admin-upload-link">
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" disabled={uploadFor === p.id} onChange={async (e) => { setUploadFor(p.id!); await upload(p.id!, e.target.files); e.target.value = ""; setUploadFor(""); }} />
                  {uploadFor === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload new image
                </label>
              </div>
              {imgs.length === 0 && <p className="admin-hint">No images for this game yet.</p>}
              <div className="admin-library-grid">
                {imgs.map((img) => {
                  const added = inCarousel(img);
                  return (
                    <button key={img.url} type="button" className={`admin-library-item ${added ? "is-added" : ""}`} onClick={() => addImage(img)} disabled={added} title={added ? "Already in the carousel" : "Add to carousel"}>
                      <span className={`admin-tile-thumb ${img.fit === "contain" ? "is-contain" : ""}`}><img src={img.url} alt="" loading="lazy" /></span>
                      <small>{img.source}</small>
                      <i>{added ? <Check /> : <Plus />}</i>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function SortableTileRow({ id, dimmed, children }: { id: string; dimmed: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`admin-tile-row ${dimmed ? "is-dimmed" : ""}`}>
      <button type="button" className="admin-games-grip" {...attributes} {...listeners} aria-label="Drag to reorder"><GripVertical /></button>
      {children}
    </div>
  );
}

function SortableAdminCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="relative rounded-lg border border-border bg-card p-4"><button type="button" className="admin-drag-handle" {...attributes} {...listeners} aria-label="Drag to reorder"><GripVertical /></button>{children}</div>;
}

function PlatformEditor({ project, rows, onChange }: { project: ProjectRow; rows: PlatformRow[]; onChange: (rows: PlatformRow[]) => void }) {
  if (!project.id) return <p className="sm:col-span-2 text-xs text-muted-foreground">Save this game before adding platform tiles.</p>;
  const update = (i: number, patch: Partial<PlatformRow>) => onChange(rows.map((row, index) => index === i ? { ...row, ...patch } : row));
  return <div className="sm:col-span-2 space-y-3 border-t border-border pt-4"><div><Label>Platform tiles</Label><p className="admin-hint">Optional store logos (Steam, Epic, consoles) shown next to the button.</p></div>{rows.map((row, i) => <div key={row.id ?? i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto_auto]"><Field label="Platform name" value={row.name} onChange={(v) => update(i, { name: v })} /><Field label="Store URL" value={row.store_url} onChange={(v) => update(i, { store_url: v })} /><div className="flex items-end gap-1">{row.logo_url && <img src={row.logo_url} alt="" className="h-10 w-10 object-contain" />}<IconUploadButton onUploaded={(logo_url) => update(i, { logo_url })} /></div><div className="flex items-end"><Button variant="ghost" size="icon" disabled={i === 0} onClick={() => onChange(arrayMove(rows, i, i - 1))}><ArrowUp /></Button><Button variant="ghost" size="icon" disabled={i === rows.length - 1} onClick={() => onChange(arrayMove(rows, i, i + 1))}><ArrowDown /></Button></div><Button variant="ghost" size="icon" onClick={async () => { if (!confirm("Remove this platform?")) return; if (row.id) await adminCall({ op: "delete", table: "site_game_platforms", id: row.id }); onChange(rows.filter((_, index) => index !== i)); }}><Trash2 /></Button></div>)}<Button variant="outline" size="sm" onClick={() => onChange([...rows, { project_id: project.id!, name: "", logo_url: "", store_url: "", sort_order: rows.length }])}><Plus className="mr-2 h-4 w-4" />Add platform</Button></div>;
}

function StatusSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  const opts = Array.from(new Set([...options, ...DEFAULT_STATUSES, value].filter(Boolean)));
  return (
    <div>
      <Label>Status</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        {opts.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  );
}

function CoverUploader({ value, onChange, label = "Key art", hint = "Shown big in the slider. Best: 1920×1080 (16:9), JPG/PNG/WebP, max 5 MB.", contain = false }: { value: string; onChange: (url: string) => void; label?: string; hint?: string; contain?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string>("");

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setErr("");
    const okType = ["image/jpeg", "image/png", "image/webp"].includes(f.type);
    if (!okType) { setErr("Only JPG, PNG, or WebP allowed."); return; }
    if (f.size > 5 * 1024 * 1024) { setErr("Max file size is 5 MB."); return; }
    setUploading(true);
    try {
      const url = await uploadProjectCover(f);
      onChange(url);
    } catch (ex: any) {
      setErr(ex?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };
  const onDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    const transfer = new DataTransfer(); transfer.items.add(file);
    await onPick({ target: { files: transfer.files, value: "" } } as React.ChangeEvent<HTMLInputElement>);
  };

  return (
    <div>
      <Label>{label}</Label>
      <p className="admin-hint">{hint}</p>
      <div className="mt-2 admin-image-drop" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
        <div className={`admin-image-thumb ${contain ? "is-contain" : ""}`}>
          {value ? (
            <img src={value} alt={`${label} preview`} />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="admin-image-actions">
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onPick} className="hidden" />
          {!value && <p className="admin-hint">Drop an image here or</p>}
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…</> : <><Upload className="mr-2 h-4 w-4" /> {value ? "Replace image" : "Upload image"}</>}
          </Button>
          {value && <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>Remove image</Button>}
          <details className="admin-url-details"><summary>Use an image URL instead</summary><Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://…" /></details>
          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>
      </div>
    </div>
  );
}

function ProjectCardPreview({ project, statusColor }: { project: ProjectRow; statusColor: string }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative aspect-video overflow-hidden bg-surface-2">
        {project.cover_url ? (
          <img src={project.cover_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">No cover yet</div>
        )}
        <span
          className="absolute left-3 top-3 rounded-md border px-2.5 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm"
          style={statusBadgeStyle(statusColor)}
        >
          {project.status || "Status"}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="font-display text-lg font-bold">{project.title || "Untitled project"}</h3>
        <p className="flex-1 text-sm text-muted-foreground">{project.description || "Description preview…"}</p>
        <Button className="mt-1 w-full bg-primary font-semibold text-primary-foreground" disabled>
          {project.button_label || "Button"}
        </Button>
      </div>
    </article>
  );
}

function StatusColorsPanel() {
  const { data, loading, error, reload, setData } = useLoader<StatusColor[]>(async () => {
    const { supabase } = await import("@/lib/supabase");
    const { data } = await supabase.from("site_status_colors").select("*");
    const existing = (data ?? []) as StatusColor[];
    const byStatus = new Map(existing.map((r) => [r.status, r]));
    // Ensure defaults are present in UI so user can edit them immediately.
    const defaults: Record<string, string> = {
      "Play Now": "#10b981", "In Development": "#f59e0b", "Coming Soon": "#0ea5e9", Prototype: "#a1a1aa",
    };
    for (const s of DEFAULT_STATUSES) if (!byStatus.has(s)) existing.push({ status: s, color: defaults[s] });
    return existing;
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  if (loading) return <Spinner />;
  if (error) return <ErrorMsg text={error} />;
  const rows = data ?? [];
  const update = (i: number, patch: Partial<StatusColor>) => setData(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const addRow = () => setData([...rows, { status: "", color: "#f59e0b" }]);
  const removeRow = async (i: number) => {
    const row = rows[i];
    if (!confirm(`Delete color for "${row.status}"?`)) return;
    if (row.status) await adminCall({ op: "delete", table: "site_status_colors", id: row.status });
    setData(rows.filter((_, idx) => idx !== i));
  };
  const saveAll = async () => {
    setSaving(true); setMsg("");
    try {
      const clean = rows.filter((r) => r.status.trim()).map((r) => ({ status: r.status.trim(), color: r.color }));
      await adminCall({ op: "upsert", table: "site_status_colors", rows: clean });
      setMsg("Saved"); await reload();
    } catch (e: any) { setMsg(e?.message ?? "Save failed"); }
    finally { setSaving(false); }
  };
  const PRESETS = ["#10b981", "#22c55e", "#f59e0b", "#f97316", "#ef4444", "#0ea5e9", "#3b82f6", "#8b5cf6", "#ec4899", "#a1a1aa"];
  return (
    <div className="space-y-4">
      <PanelHeader title="Status colors" onAdd={addRow} onSave={saveAll} saving={saving} msg={msg} />
      <p className="text-sm text-muted-foreground">Customize the badge color for each project status. Applied on the public site.</p>
      {rows.map((r, i) => (
        <div key={`${r.status}-${i}`} className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-[1fr_auto_auto_auto]">
          <Field label="Status label" value={r.status} onChange={(v) => update(i, { status: v })} />
          <div>
            <Label>Color</Label>
            <input type="color" value={r.color} onChange={(e) => update(i, { color: e.target.value })} className="mt-1 h-10 w-16 cursor-pointer rounded-md border border-input bg-background" />
          </div>
          <div>
            <Label>Hex</Label>
            <Input value={r.color} onChange={(e) => update(i, { color: e.target.value })} className="mt-1 w-28" />
          </div>
          <div>
            <Label>Preview</Label>
            <span
              className="mt-1 inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold uppercase tracking-wider"
              style={statusBadgeStyle(r.color || "#a1a1aa")}
            >
              {r.status || "Status"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1 sm:col-span-4">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => update(i, { color: p })}
                className="h-6 w-6 rounded-full border border-border ring-offset-background transition hover:scale-110"
                style={{ backgroundColor: p }}
                aria-label={`Use ${p}`}
              />
            ))}
            <div className="ml-auto">
              <Button variant="ghost" size="sm" onClick={() => removeRow(i)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


function TeamPanel() {
  const { data, loading, error, reload, setData } = useLoader<TeamRow[]>(() => loadTable("site_team"));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  if (loading) return <Spinner />;
  if (error) return <ErrorMsg text={error} />;
  const rows = data ?? [];
  const update = (i: number, patch: Partial<TeamRow>) => setData(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const addRow = () => setData([...rows, { name: "", role: "", bio: "", sort_order: rows.length }]);
  const removeRow = async (i: number) => {
    const row = rows[i];
    if (row.id && !confirm("Delete this member?")) return;
    if (row.id) await adminCall({ op: "delete", table: "site_team", id: row.id });
    setData(rows.filter((_, idx) => idx !== i));
  };
  const saveAll = async () => {
    setSaving(true); setMsg("");
    try { await adminCall({ op: "upsert", table: "site_team", rows }); setMsg("Saved"); await reload(); }
    catch (e: any) { setMsg(e?.message ?? "Save failed"); }
    finally { setSaving(false); }
  };
  return (
    <div className="space-y-4">
      <PanelHeader title="Team" onAdd={addRow} onSave={saveAll} saving={saving} msg={msg} />
      {rows.map((r, i) => (
        <div key={r.id ?? `new-${i}`} className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
          <Field label="Name" value={r.name} onChange={(v) => update(i, { name: v })} />
          <Field label="Role" value={r.role} onChange={(v) => update(i, { role: v })} />
          <TextField label="Bio" value={r.bio} onChange={(v) => update(i, { bio: v })} className="sm:col-span-2" />
          <NumField label="Sort order" value={r.sort_order} onChange={(v) => update(i, { sort_order: v })} />
          <div className="flex items-end justify-end sm:col-span-2">
            <Button variant="ghost" size="sm" onClick={() => removeRow(i)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AboutPanel({ onDirty }: { onDirty?: (dirty: boolean) => void }) {
  const { data, loading, error, setData } = useLoader<About>(async () => {
    const { supabase } = await import("@/lib/supabase");
    const { data: row } = await supabase.from("site_about").select("*").eq("id", 1).maybeSingle();
    return (row as About) ?? { id: 1, intro_html: "" };
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const settingsLoader = useLoader<LandingSettingsRow>(loadSettings);
  const teamLoader = useLoader<TeamRow[]>(() => loadTable("site_team"));
  { const e = error || firstError(settingsLoader, teamLoader); if (e) return <ErrorMsg text={e} />; }
  if (loading || !data || !settingsLoader.data || !teamLoader.data) return <Spinner />;
  if (error) return <ErrorMsg text={error} />;
  const save = async () => {
    setSaving(true); setMsg("");
    try { await Promise.all([adminCall({ op: "upsert", table: "site_about", rows: [data] }), adminCall({ op: "upsert", table: "site_landing_settings", rows: [settingsLoader.data] }), adminCall({ op: "upsert", table: "site_team", rows: (teamLoader.data ?? []).map((row, i) => ({ ...row, name: [row.gamer_tag, row.real_name].filter(Boolean).join(" - "), sort_order: i })) })]); setMsg("Saved"); onDirty?.(false); }
    catch (e: any) { setMsg(e?.message ?? "Save failed"); }
    finally { setSaving(false); }
  };
  const settings = settingsLoader.data ?? LANDING_SETTINGS_DEFAULTS; const team = teamLoader.data ?? [];
  const updateTeam = (i: number, patch: Partial<TeamRow>) => { onDirty?.(true); teamLoader.setData(team.map((row, index) => index === i ? { ...row, ...patch } : row)); };
  return (
    <div className="admin-editor-layout"><div className="space-y-4">
      <PanelHeader title="About" onSave={save} saving={saving} msg={msg} />
      <div className="rounded-lg border border-border bg-card p-4">
        <Field label="Section headline" value={settings.about_heading} onChange={(v) => { onDirty?.(true); settingsLoader.setData({ ...settings, about_heading: v }); }} />
        <Label>About intro (HTML allowed)</Label>
        <Textarea rows={10} value={data.intro_html} onChange={(e) => { onDirty?.(true); setData({ ...data, intro_html: e.target.value }); }} className="mt-2" />
      </div>
      {team.map((member, i) => <div className="admin-card grid gap-3 sm:grid-cols-2" key={member.id ?? i}><Field label="Gamer tag" value={member.gamer_tag || ""} onChange={(v) => updateTeam(i, { gamer_tag: v })} /><Field label="Real name" value={member.real_name || ""} onChange={(v) => updateTeam(i, { real_name: v })} /><Field label="Role" value={member.role} onChange={(v) => updateTeam(i, { role: v })} /><div className="sm:col-span-2"><TextField label="Bio" value={member.bio} onChange={(v) => updateTeam(i, { bio: v })} /></div><Button variant="ghost" className="text-destructive" onClick={async () => { if (!confirm("Delete this team member?")) return; if (member.id) await adminCall({ op: "delete", table: "site_team", id: member.id }); teamLoader.setData(team.filter((_, index) => index !== i)); }}><Trash2 className="mr-2 h-4 w-4" />Delete</Button></div>)}
      <Button variant="outline" onClick={() => { onDirty?.(true); teamLoader.setData([...team, { name: "", gamer_tag: "", real_name: "", role: "", bio: "", sort_order: team.length }]); }}><Plus className="mr-2 h-4 w-4" />Add team member</Button></div><PreviewPane><TeamSection team={team} heading={settings.about_heading} introHtml={data.intro_html} /></PreviewPane></div>
  );
}

type LegalRow = { slug: string; title: string; body_html: string };
const LEGAL_SLUGS: { slug: string; label: string }[] = [
  { slug: "imprint", label: "Imprint (Impressum)" },
  { slug: "privacy", label: "Privacy Policy (Datenschutz)" },
];

function LegalPanel() {
  const { data, loading, error, reload, setData } = useLoader<LegalRow[]>(async () => {
    const { supabase } = await import("@/lib/supabase");
    const { data } = await supabase.from("site_legal").select("*");
    const existing = (data ?? []) as LegalRow[];
    const bySlug = new Map(existing.map((r) => [r.slug, r]));
    const rows: LegalRow[] = LEGAL_SLUGS.map(({ slug, label }) =>
      bySlug.get(slug) ?? { slug, title: label, body_html: "" }
    );
    return rows;
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  if (loading || !data) return <Spinner />;
  if (error) return <ErrorMsg text={error} />;
  const rows = data;
  const update = (i: number, patch: Partial<LegalRow>) => setData(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const save = async () => {
    setSaving(true); setMsg("");
    try { await adminCall({ op: "upsert", table: "site_legal", rows }); setMsg("Saved"); await reload(); }
    catch (e: any) { setMsg(e?.message ?? "Save failed"); }
    finally { setSaving(false); }
  };
  return (
    <div className="space-y-4">
      <PanelHeader title="Legal pages" onSave={save} saving={saving} msg={msg} />
      <p className="text-sm text-muted-foreground">Edit the Imprint and Privacy Policy pages. HTML tags are allowed (e.g. &lt;h2&gt;, &lt;p&gt;, &lt;section&gt;, &lt;a&gt;, &lt;br&gt;, &lt;strong&gt;, &lt;em&gt;).</p>
      {rows.map((r, i) => (
        <div key={r.slug} className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display text-lg font-bold">{LEGAL_SLUGS.find((s) => s.slug === r.slug)?.label ?? r.slug}</div>
              <div className="text-xs text-muted-foreground">Public URL: /{r.slug}</div>
            </div>
          </div>
          <Field label="Page title" value={r.title} onChange={(v) => update(i, { title: v })} />
          <div>
            <Label>Body (HTML allowed)</Label>
            <Textarea rows={18} value={r.body_html} onChange={(e) => update(i, { body_html: e.target.value })} className="mt-2 font-mono text-xs" />
          </div>
        </div>
      ))}
    </div>
  );
}

type Announcement = {
  id: number;
  enabled: boolean;
  message: string;
  link_url: string;
  link_label: string;
  open_in_new_tab: boolean;
  background_color: string;
  text_color: string;
};

const ANNOUNCEMENT_DEFAULTS: Announcement = {
  id: 1,
  enabled: false,
  message: "",
  link_url: "",
  link_label: "",
  open_in_new_tab: true,
  background_color: "#f59e0b",
  text_color: "#0b0b0f",
};

function AnnouncementPanel() {
  const { data, loading, error, setData } = useLoader<Announcement>(async () => {
    const { supabase } = await import("@/lib/supabase");
    const { data: row } = await supabase.from("site_announcement").select("*").eq("id", 1).maybeSingle();
    return (row as Announcement) ?? ANNOUNCEMENT_DEFAULTS;
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  if (loading || !data) return <Spinner />;
  if (error) return <ErrorMsg text={error} />;
  const save = async () => {
    setSaving(true); setMsg("");
    try { await adminCall({ op: "upsert", table: "site_announcement", rows: [data] }); setMsg("Saved"); }
    catch (e: any) { setMsg(e?.message ?? "Save failed"); }
    finally { setSaving(false); }
  };
  const upd = <K extends keyof Announcement>(k: K, v: Announcement[K]) => setData({ ...data, [k]: v });
  return (
    <div className="space-y-4">
      <PanelHeader title="Announcement Banner" onSave={save} saving={saving} msg={msg} />
      <div className="rounded-lg border border-border bg-card p-4">
        <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Live preview</Label>
        <AnnouncementBannerPreview value={data} />
        {!data.enabled && (
          <p className="mt-2 text-xs text-muted-foreground">Currently disabled — will not render on the public site.</p>
        )}
      </div>
      <div className="grid gap-4 rounded-lg border border-border bg-card p-4">
        <ToggleField
          label="Enabled"
          description="Show the banner on the public site."
          value={data.enabled}
          onChange={(v) => upd("enabled", v)}
        />
        <TextField label="Message" value={data.message} onChange={(v) => upd("message", v)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Link URL (optional)" value={data.link_url} onChange={(v) => upd("link_url", v)} placeholder="https://…" />
          <Field label="Link label (optional)" value={data.link_label} onChange={(v) => upd("link_label", v)} placeholder="Learn more" />
        </div>
        <ToggleField
          label="Open link in new tab"
          description="Only applies when a link URL is set."
          value={data.open_in_new_tab}
          onChange={(v) => upd("open_in_new_tab", v)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <ColorField label="Background color" value={data.background_color} onChange={(v) => upd("background_color", v)} />
          <ColorField label="Text color" value={data.text_color} onChange={(v) => upd("text_color", v)} />
        </div>
      </div>
    </div>
  );
}

type FeaturedGame = {
  id: number;
  enabled: boolean;
  project_id: string | null;
  custom_image_url: string;
  custom_headline: string;
  custom_description: string;
  steam_app_id: string;
};

const FEATURED_DEFAULTS: FeaturedGame = {
  id: 1,
  enabled: false,
  project_id: null,
  custom_image_url: "",
  custom_headline: "",
  custom_description: "",
  steam_app_id: "",
};

function FeaturedGamePanel() {
  const { data, loading, error, setData } = useLoader<FeaturedGame>(async () => {
    const { supabase } = await import("@/lib/supabase");
    const { data: row } = await supabase.from("site_featured_game").select("*").eq("id", 1).maybeSingle();
    return (row as FeaturedGame) ?? FEATURED_DEFAULTS;
  });
  const projectsLoader = useLoader<ProjectRow[]>(() => loadTable("site_projects"));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  if (loading || !data) return <Spinner />;
  if (error) return <ErrorMsg text={error} />;
  const projects = projectsLoader.data ?? [];
  const selected = projects.find((p) => p.id === data.project_id) ?? null;
  const preview = {
    headline: (data.custom_headline || selected?.title || "").trim(),
    description: (data.custom_description || selected?.description || "").trim(),
    imageUrl: (data.custom_image_url || selected?.cover_url || "").trim(),
    steamAppId: String(data.steam_app_id || "").trim(),
  };
  const save = async () => {
    setSaving(true); setMsg("");
    try {
      const rowToSave = { ...data, project_id: data.project_id || null };
      await adminCall({ op: "upsert", table: "site_featured_game", rows: [rowToSave] });
      setMsg("Saved");
    } catch (e: any) { setMsg(e?.message ?? "Save failed"); }
    finally { setSaving(false); }
  };
  const upd = <K extends keyof FeaturedGame>(k: K, v: FeaturedGame[K]) => setData({ ...data, [k]: v });
  return (
    <div className="space-y-4">
      <PanelHeader title="Featured Game" onSave={save} saving={saving} msg={msg} />
      <div className="rounded-lg border border-border bg-card p-4">
        <Label className="mb-3 block text-xs uppercase tracking-wider text-muted-foreground">Live preview</Label>
        <FeaturedGameCard value={preview} />
        {!data.enabled && (
          <p className="mt-2 text-xs text-muted-foreground">Currently disabled — will not render on the public site.</p>
        )}
      </div>
      <div className="grid gap-4 rounded-lg border border-border bg-card p-4">
        <ToggleField
          label="Enabled"
          description="Show the Featured Game section between Home and Projects."
          value={data.enabled}
          onChange={(v) => upd("enabled", v)}
        />
        <div>
          <Label>Project</Label>
          <select
            value={data.project_id ?? ""}
            onChange={(e) => upd("project_id", e.target.value || null)}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">— Select a project —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">Image, title and description fall back to the selected project unless overridden below.</p>
        </div>
        <CoverUploader label="Custom image (optional)" hint="Leave empty to use the key art of the game." value={data.custom_image_url} onChange={(v) => upd("custom_image_url", v)} />
        <Field label="Custom headline (optional)" value={data.custom_headline} onChange={(v) => upd("custom_headline", v)} placeholder="Overrides project title" />
        <TextField label="Custom description (optional)" value={data.custom_description} onChange={(v) => upd("custom_description", v)} />
        <div>
          <Field label="Steam App ID" value={data.steam_app_id} onChange={(v) => upd("steam_app_id", v)} placeholder="e.g. 4321130" />
          <p className="mt-1 text-xs text-muted-foreground">Enter only the numeric Steam App ID, not the full embed code.</p>
        </div>
      </div>
    </div>
  );
}



function ToggleField({ label, description, value, onChange }: { label: string; description?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span className="flex-1">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${value ? "bg-primary" : "bg-muted"}`}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-background shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-16 cursor-pointer rounded-md border border-input bg-background"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="w-32" />
      </div>
    </div>
  );
}

function PreviewPane({ children }: { children: React.ReactNode }) {
  return <aside className="admin-preview"><Label className="mb-3 block">Live preview</Label><div className="public-landing"><div className="landing-shell">{children}</div></div></aside>;
}

function HeaderPanel({ onDirty }: { onDirty: (dirty: boolean) => void }) {
  const settingsLoader = useLoader<LandingSettingsRow>(loadSettings);
  const linksLoader = useLoader<LinkRow[]>(() => loadTable("site_header_links"));
  const [saving, setSaving] = useState(false); const [msg, setMsg] = useState("");
  { const e = firstError(settingsLoader, linksLoader); if (e) return <ErrorMsg text={e} />; }
  if (!settingsLoader.data || !linksLoader.data) return <Spinner />;
  const settings = settingsLoader.data; const links = linksLoader.data;
  const updateSettings = (patch: Partial<LandingSettingsRow>) => { onDirty(true); settingsLoader.setData({ ...settings, ...patch }); };
  const updateLink = (i: number, patch: Partial<LinkRow>) => { onDirty(true); linksLoader.setData(links.map((row, index) => index === i ? { ...row, ...patch } : row)); };
  const save = async () => { setSaving(true); setMsg(""); try { await Promise.all([adminCall({ op: "upsert", table: "site_landing_settings", rows: [settings] }), adminCall({ op: "upsert", table: "site_header_links", rows: links.map((row, i) => ({ ...row, sort_order: i })) })]); onDirty(false); setMsg("Saved"); } catch (e: any) { setMsg(e?.message ?? "Save failed"); } finally { setSaving(false); } };
  return <div className="admin-editor-layout"><div className="space-y-4"><PanelHeader title="Header" onSave={save} saving={saving} msg={msg} /><div className="admin-card space-y-4"><CoverUploader contain label="Banner logo" hint="The big logo in the hanging banner at the top left. Leave empty to use the default DFG logo." value={settings.header_banner_logo_url} onChange={(v) => updateSettings({ header_banner_logo_url: v })} /><CoverUploader contain label="Small logo (after scrolling)" hint="Shown in the slim menu bar once visitors scroll down. Leave empty to use the default logo." value={settings.header_sticky_logo_url} onChange={(v) => updateSettings({ header_sticky_logo_url: v })} /><Field label="Studio line" hint="Small text under the banner logo." value={settings.header_studio_line} onChange={(v) => updateSettings({ header_studio_line: v })} /><Field label="Founded line" hint="For example: EST. 2021" value={settings.header_established_line} onChange={(v) => updateSettings({ header_established_line: v })} /><Field label="Discord button label" value={settings.discord_button_label} onChange={(v) => updateSettings({ discord_button_label: v })} /><Field label="Discord invite link" placeholder="https://discord.gg/…" value={settings.discord_button_url} onChange={(v) => updateSettings({ discord_button_url: v })} /></div><div className="space-y-2"><h3 className="admin-subhead">Menu links</h3>{links.length === 0 && <p className="admin-hint">No custom links yet, so the default menu (Home, Games, About Us, Contact) is shown.</p>}{links.map((link, i) => <div className="admin-card grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto_auto]" key={link.id ?? i}><Field label="Label" value={link.label} onChange={(v) => updateLink(i, { label: v })} /><Field label="Goes to" placeholder="#about or https://…" value={link.url} onChange={(v) => updateLink(i, { url: v })} /><ToggleField label="Visible" value={link.visible !== false} onChange={(v) => updateLink(i, { visible: v })} /><div><Button variant="ghost" size="icon" disabled={i === 0} onClick={() => { onDirty(true); linksLoader.setData(arrayMove(links, i, i - 1)); }}><ArrowUp /></Button><Button variant="ghost" size="icon" disabled={i === links.length - 1} onClick={() => { onDirty(true); linksLoader.setData(arrayMove(links, i, i + 1)); }}><ArrowDown /></Button></div><Button variant="ghost" size="icon" onClick={() => { onDirty(true); linksLoader.setData(links.filter((_, index) => index !== i)); }}><Trash2 /></Button></div>)}<Button variant="outline" onClick={() => { onDirty(true); linksLoader.setData([...links, { label: "", url: "", sort_order: links.length, visible: true }]); }}><Plus className="mr-2 h-4 w-4" />Add link</Button></div></div><PreviewPane><div className="admin-header-preview"><strong>{settings.header_studio_line}</strong><nav>{links.filter((link) => link.visible !== false).map((link, i) => <span key={i}>{link.label}</span>)}</nav><button>{settings.discord_button_label}</button></div></PreviewPane></div>;
}

function MissionPanel({ onDirty }: { onDirty: (dirty: boolean) => void }) {
  const settingsLoader = useLoader<LandingSettingsRow>(loadSettings); const linesLoader = useLoader<MissionLineRow[]>(() => loadTable("site_mission_lines"));
  const [saving, setSaving] = useState(false); const [msg, setMsg] = useState("");
  { const e = firstError(settingsLoader, linesLoader); if (e) return <ErrorMsg text={e} />; }
  if (!settingsLoader.data || !linesLoader.data) return <Spinner />;
  const settings = settingsLoader.data; const lines = linesLoader.data;
  const setSettings = (patch: Partial<LandingSettingsRow>) => { onDirty(true); settingsLoader.setData({ ...settings, ...patch }); };
  const save = async () => { setSaving(true); try { await Promise.all([adminCall({ op: "upsert", table: "site_landing_settings", rows: [settings] }), adminCall({ op: "upsert", table: "site_mission_lines", rows: lines.map((line, i) => ({ ...line, sort_order: i })) })]); setMsg("Saved"); onDirty(false); } catch (e: any) { setMsg(e?.message ?? "Save failed"); } finally { setSaving(false); } };
  return <div className="admin-editor-layout"><div className="space-y-4"><PanelHeader title="Mission" onSave={save} saving={saving} msg={msg} /><div className="admin-card space-y-4"><ToggleField label="Section visible" value={settings.mission_visible} onChange={(v) => setSettings({ mission_visible: v })} /><TextField rows={6} label="Mission text" hint="You can use simple HTML like <strong> or <br>." value={settings.mission_text} onChange={(v) => setSettings({ mission_text: v })} /><Field label="Sign-off" value={settings.mission_signoff} onChange={(v) => setSettings({ mission_signoff: v })} /></div>{lines.map((line, i) => <div className="admin-card grid gap-3 sm:grid-cols-[1fr_220px_auto]" key={line.id ?? i}><Field label={`Headline line ${i + 1}`} value={line.text} onChange={(v) => { onDirty(true); linesLoader.setData(lines.map((x, n) => n === i ? { ...x, text: v } : x)); }} /><div><Label>Style</Label><select className="mt-1 h-10 w-full border border-input bg-background px-3" value={line.style} onChange={(e) => { onDirty(true); linesLoader.setData(lines.map((x, n) => n === i ? { ...x, style: e.target.value as MissionLineRow['style'] } : x)); }}><option value="white_black">White on black</option><option value="black_orange">Black on orange</option></select></div><Button variant="ghost" size="icon" onClick={() => { onDirty(true); linesLoader.setData(lines.filter((_, n) => n !== i)); }}><Trash2 /></Button></div>)}<Button variant="outline" onClick={() => { onDirty(true); linesLoader.setData([...lines, { text: "", style: "white_black", sort_order: lines.length }]); }}><Plus className="mr-2 h-4 w-4" />Add line</Button></div><PreviewPane><MissionSection lines={lines} missionText={settings.mission_text} signoff={settings.mission_signoff} /></PreviewPane></div>;
}

function ContactPanel({ onDirty }: { onDirty: (dirty: boolean) => void }) {
  const [contactSocials, setContactSocials] = useState<SocialLink[]>([]);
  useEffect(() => { loadTable<SocialLink>("site_social_links").then(setContactSocials).catch(() => setContactSocials([])); }, []);
  const loader = useLoader<LandingSettingsRow>(loadSettings); const [saving, setSaving] = useState(false); const [msg, setMsg] = useState("");
  if (loader.error) return <ErrorMsg text={loader.error} />;
  if (!loader.data) return <Spinner />; const data = loader.data;
  const update = (patch: Partial<LandingSettingsRow>) => { onDirty(true); loader.setData({ ...data, ...patch }); };
  const save = async () => { setSaving(true); try { await adminCall({ op: "upsert", table: "site_landing_settings", rows: [data] }); setMsg("Saved"); onDirty(false); } catch (e: any) { setMsg(e?.message ?? "Save failed"); } finally { setSaving(false); } };
  return <div className="admin-editor-layout"><div className="space-y-4"><PanelHeader title="Contact" onSave={save} saving={saving} msg={msg} /><div className="admin-card space-y-4"><Field label="Section headline" value={data.contact_heading} onChange={(v) => update({ contact_heading: v })} /><Field label="Direct contact line" value={data.contact_direct_text} onChange={(v) => update({ contact_direct_text: v })} /><Field label="Email" value={data.contact_email} onChange={(v) => update({ contact_email: v })} /><p className="text-sm text-muted-foreground">The public form fields, validation, inquiry types, and sending logic remain unchanged.</p></div></div><PreviewPane><ContactSection socialLinks={contactSocials} heading={data.contact_heading} directText={data.contact_direct_text} email={data.contact_email} preview /></PreviewPane></div>;
}

function FooterPanel({ onDirty }: { onDirty: (dirty: boolean) => void }) {
  const settingsLoader = useLoader<LandingSettingsRow>(loadSettings); const linksLoader = useLoader<LinkRow[]>(() => loadTable("site_footer_links")); const [saving, setSaving] = useState(false); const [msg, setMsg] = useState("");
  { const e = firstError(settingsLoader, linksLoader); if (e) return <ErrorMsg text={e} />; }
  if (!settingsLoader.data || !linksLoader.data) return <Spinner />; const settings = settingsLoader.data; const links = linksLoader.data;
  const update = (patch: Partial<LandingSettingsRow>) => { onDirty(true); settingsLoader.setData({ ...settings, ...patch }); };
  const save = async () => { setSaving(true); try { await Promise.all([adminCall({ op: "upsert", table: "site_landing_settings", rows: [settings] }), adminCall({ op: "upsert", table: "site_footer_links", rows: links.map((row, i) => ({ ...row, sort_order: i })) })]); setMsg("Saved"); onDirty(false); } catch (e: any) { setMsg(e?.message ?? "Save failed"); } finally { setSaving(false); } };
  return <div className="admin-editor-layout"><div className="space-y-4"><PanelHeader title="Footer" onSave={save} saving={saving} msg={msg} /><div className="admin-card space-y-4"><CoverUploader contain label="Footer logo" hint="Small logo at the bottom of every page. Square, transparent PNG." value={settings.footer_logo_url} onChange={(v) => update({ footer_logo_url: v })} /><Field label="Copyright" value={settings.footer_copyright} onChange={(v) => update({ footer_copyright: v })} />{links.map((link, i) => <div className="grid gap-3 sm:grid-cols-2" key={link.id ?? i}><Field label="Legal link label" value={link.label} onChange={(v) => { onDirty(true); linksLoader.setData(links.map((x, n) => n === i ? { ...x, label: v } : x)); }} /><Field label="URL" value={link.url} onChange={(v) => { onDirty(true); linksLoader.setData(links.map((x, n) => n === i ? { ...x, url: v } : x)); }} /></div>)}</div></div><PreviewPane><footer className="admin-footer-preview">{settings.footer_logo_url && <img src={settings.footer_logo_url} alt="" />}<span>{links.map((x) => x.label).join("  ·  ")}</span><small>{settings.footer_copyright}</small></footer></PreviewPane></div>;
}

function SocialsPanel({ onDirty }: { onDirty?: (dirty: boolean) => void }) {
  const { data, loading, error, setData } = useLoader<SocialLink[]>(() => loadTable<SocialLink>("site_social_links"));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [newPlatform, setNewPlatform] = useState("discord");
  if (error) return <ErrorMsg text={error} />;
  if (loading || !data) return <Spinner />;
  const rows = data;
  const change = (next: SocialLink[]) => { onDirty?.(true); setData(next.map((r, i) => ({ ...r, sort_order: i }))); };
  const update = (i: number, patch: Partial<SocialLink>) => change(rows.map((r, n) => (n === i ? { ...r, ...patch } : r)));
  const ids = rows.map((r, i) => r.id ?? `new-${i}`);
  const save = async () => {
    setSaving(true); setMsg("");
    try {
      const res = await adminCall({ op: "upsert", table: "site_social_links", rows: rows.map((r, i) => ({ ...r, sort_order: i })) });
      if (res?.rows) setData([...(res.rows as SocialLink[])].sort((x, y) => x.sort_order - y.sort_order));
      setMsg("Saved"); onDirty?.(false);
    } catch (e: any) { setMsg(e?.message ?? "Save failed"); }
    finally { setSaving(false); }
  };
  const remove = async (i: number) => {
    const row = rows[i];
    if (!confirm(`Delete the ${platformLabel(row)} link?`)) return;
    try { if (row.id) await adminCall({ op: "delete", table: "site_social_links", id: row.id }); change(rows.filter((_, n) => n !== i)); }
    catch (e: any) { setMsg(e?.message ?? "Delete failed"); }
  };
  const add = () => change([...rows, { platform: newPlatform, label: newPlatform === "custom" ? "" : (SOCIAL_PLATFORMS.find((p) => p.key === newPlatform)?.label ?? ""), url: "", icon_url: "", visible: true, sort_order: rows.length }]);
  return (
    <div className="admin-editor-layout">
      <div className="space-y-4">
        <PanelHeader title="Socials" onSave={save} saving={saving} msg={msg} />
        <div className="admin-card space-y-3">
          <DndContext collisionDetection={closestCenter} onDragEnd={({ active, over }) => { if (!over || active.id === over.id) return; const o = ids.indexOf(String(active.id)); const n = ids.indexOf(String(over.id)); if (o < 0 || n < 0) return; change(arrayMove(rows, o, n)); }}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              {rows.map((row, i) => (
                <SortableAdminCard key={ids[i]} id={ids[i]}>
                  <div className="admin-card space-y-3 pr-10">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center bg-primary text-primary-foreground"><SocialIcon link={row} size={22} /></span>
                      <select value={row.platform} onChange={(e) => update(i, { platform: e.target.value, label: e.target.value === "custom" ? row.label : (SOCIAL_PLATFORMS.find((p) => p.key === e.target.value)?.label ?? "") })} className="h-10 border px-2 text-sm">
                        {SOCIAL_PLATFORMS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                      </select>
                      <div className="ml-auto flex items-center gap-2">
                        <Button variant="ghost" size="icon" title={row.visible ? "Visible" : "Hidden"} onClick={() => update(i, { visible: !row.visible })}>{row.visible ? <Eye /> : <EyeOff />}</Button>
                        <Button variant="ghost" size="icon" title="Delete" onClick={() => remove(i)}><Trash2 /></Button>
                      </div>
                    </div>
                    {row.platform === "custom" && (
                      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                        <Field label="Label" value={row.label} onChange={(v) => update(i, { label: v })} />
                        <IconUploadButton onUploaded={(icon_url) => update(i, { icon_url })} />
                      </div>
                    )}
                    <Field label="URL" value={row.url} onChange={(v) => update(i, { url: v })} placeholder="https://" />
                  </div>
                </SortableAdminCard>
              ))}
            </SortableContext>
          </DndContext>
          {rows.length === 0 && <p className="text-sm text-muted-foreground">No social links yet.</p>}
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <select value={newPlatform} onChange={(e) => setNewPlatform(e.target.value)} className="h-9 border px-2 text-sm">
              {SOCIAL_PLATFORMS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
            <Button variant="outline" size="sm" onClick={add}><Plus className="mr-2 h-4 w-4" />Add link</Button>
          </div>
        </div>
      </div>
      <PreviewPane><div className="public-landing" style={{ padding: 24 }}><SocialIconLinks links={rows} /></div></PreviewPane>
    </div>
  );
}

function LinksPanel({ table, title }: { table: string; title: string }) {
  const { data, loading, error, reload, setData } = useLoader<LinkRow[]>(() => loadTable(table), [table]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  if (loading) return <Spinner />;
  if (error) return <ErrorMsg text={error} />;
  const rows = data ?? [];
  const update = (i: number, patch: Partial<LinkRow>) => setData(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const addRow = () => setData([...rows, { label: "", url: "", sort_order: rows.length }]);
  const removeRow = async (i: number) => {
    const row = rows[i];
    if (row.id && !confirm("Delete this link?")) return;
    if (row.id) await adminCall({ op: "delete", table, id: row.id });
    setData(rows.filter((_, idx) => idx !== i));
  };
  const saveAll = async () => {
    setSaving(true); setMsg("");
    try { await adminCall({ op: "upsert", table, rows }); setMsg("Saved"); await reload(); }
    catch (e: any) { setMsg(e?.message ?? "Save failed"); }
    finally { setSaving(false); }
  };
  return (
    <div className="space-y-4">
      <PanelHeader title={title} onAdd={addRow} onSave={saveAll} saving={saving} msg={msg} />
      {rows.map((r, i) => (
        <div key={r.id ?? `new-${i}`} className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-3">
          <Field label="Label" value={r.label} onChange={(v) => update(i, { label: v })} />
          <Field label="URL" value={r.url} onChange={(v) => update(i, { url: v })} />
          <NumField label="Sort" value={r.sort_order} onChange={(v) => update(i, { sort_order: v })} />
          <div className="flex items-end justify-end sm:col-span-3">
            <Button variant="ghost" size="sm" onClick={() => removeRow(i)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function MessagesPanel({ onCount }: { onCount?: (count: number) => void }) {
  const [filter, setFilter] = useState<string>("all");
  const { data, loading, error, reload } = useLoader<Submission[]>(async () => {
    const res = await adminCall({ op: "list_submissions" });
    return res.rows as Submission[];
  });
  useEffect(() => { if (data) onCount?.(data.length); }, [data, onCount]);
  if (loading) return <Spinner />;
  if (error) return <ErrorMsg text={error} />;
  const all = [...(data ?? [])].sort((x, y) => y.created_at.localeCompare(x.created_at));
  const rows = filter === "all" ? all : all.filter((r) => (r.inquiry_type || "other") === filter);
  const del = async (id: string) => {
    if (!confirm("Delete this message? This can't be undone.")) return;
    await adminCall({ op: "delete_submission", id });
    await reload();
  };
  const filterOptions = [
    { value: "all", label: "All", count: all.length },
    ...Object.entries(INQUIRY_META).map(([value, m]) => ({
      value,
      label: m.label,
      count: all.filter((r) => (r.inquiry_type || "other") === value).length,
    })),
  ];
  return (
    <div className="space-y-4">
      <div className="admin-filter-row" role="tablist" aria-label="Filter messages">
        {filterOptions.map((o) => (
          <button key={o.value} type="button" role="tab" aria-selected={filter === o.value} onClick={() => setFilter(o.value)} className={filter === o.value ? "is-active" : ""}>
            {o.label} <b>{o.count}</b>
          </button>
        ))}
      </div>
      {rows.length === 0 && <div className="admin-empty"><MessagesSquare /><p>No messages here yet.</p></div>}
      {rows.map((r) => {
        const meta = INQUIRY_META[r.inquiry_type] ?? INQUIRY_META.other;
        return (
          <article key={r.id} className="admin-card admin-message">
            <header>
              <span className={`admin-pill ${meta.className}`}>{meta.label}</span>
              <h3>{r.subject}</h3>
              <time>{new Date(r.created_at).toLocaleString()}</time>
            </header>
            <p className="admin-message-from">{r.name} · <a href={`mailto:${r.email}`}>{r.email}</a></p>
            <pre>{r.message}</pre>
            <footer>
              <Button asChild size="sm"><a href={`mailto:${r.email}?subject=${encodeURIComponent(`Re: ${r.subject}`)}`}><Reply className="mr-2 h-4 w-4" />Reply by email</a></Button>
              <Button variant="ghost" size="sm" onClick={() => del(r.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
            </footer>
          </article>
        );
      })}
    </div>
  );
}

function PanelHeader({ title, onAdd, addLabel = "Add", onSave, saving, msg }: { title: string; onAdd?: () => void; addLabel?: string; onSave: () => void; saving: boolean; msg: string }) {
  const [shownMsg, setShownMsg] = useState(msg);
  useEffect(() => {
    setShownMsg(msg);
    if (msg !== "Saved") return;
    const timer = window.setTimeout(() => setShownMsg(""), 3000);
    return () => window.clearTimeout(timer);
  }, [msg]);
  const ok = shownMsg === "Saved";
  return (
    <div className="admin-panel-bar">
      <h2>{title}</h2>
      <div className="admin-panel-actions">
        {shownMsg && <span className={`admin-save-msg ${ok ? "is-ok" : "is-error"}`}>{ok ? <><Check className="h-4 w-4" /> Saved</> : shownMsg}</span>}
        {onAdd && <Button variant="outline" size="sm" onClick={onAdd}><Plus className="mr-2 h-4 w-4" /> {addLabel}</Button>}
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, className, placeholder, hint }: { label: string; value: string; onChange: (v: string) => void; className?: string; placeholder?: string; hint?: string }) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      {hint && <p className="admin-hint">{hint}</p>}
      <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1" />
    </div>
  );
}
function TextField({ label, value, onChange, className, hint, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; className?: string; hint?: string; rows?: number }) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      {hint && <p className="admin-hint">{hint}</p>}
      <Textarea rows={rows} value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="mt-1" />
    </div>
  );
}
function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type="number" value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} className="mt-1" />
    </div>
  );
}
function Spinner() {
  return <div className="grid place-items-center py-12 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>;
}
function ErrorMsg({ text }: { text: string }) {
  return <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{text}</div>;
}

// -----------------------------------------------------------------------------
// PRESS KIT EDITOR (per project)
// -----------------------------------------------------------------------------

type PressKitRow = {
  project_id: string;
  genre: string; platforms: string; release_date: string; price: string;
  one_line_pitch: string; long_description: string;
  developer: string; publisher: string; studio_location: string;
  steam_url: string; discord_url: string; other_social_urls: string;
  press_contact_email: string;
  key_art_url: string; game_logo_url: string; studio_logo_url: string;
  trailer_url: string; system_requirements: string; content_warnings: string;
  press_kit_zip_url: string;
};

type ScreenshotRow = { id?: string; project_id: string; url: string; caption: string; sort_order: number };

const emptyPressKit = (projectId: string): PressKitRow => ({
  project_id: projectId,
  genre: "", platforms: "", release_date: "", price: "",
  one_line_pitch: "", long_description: "",
  developer: "", publisher: "", studio_location: "",
  steam_url: "", discord_url: "", other_social_urls: "",
  press_contact_email: "",
  key_art_url: "", game_logo_url: "", studio_logo_url: "",
  trailer_url: "", system_requirements: "", content_warnings: "",
  press_kit_zip_url: "",
});

function PressKitDialog({ project, onClose }: { project: ProjectRow; onClose: () => void }) {
  const projectId = project.id!;
  const [kit, setKit] = useState<PressKitRow | null>(null);
  const [shots, setShots] = useState<ScreenshotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { supabase } = await import("@/lib/supabase");
        const [kitRes, shotsRes] = await Promise.all([
          supabase.from("site_press_kits").select("*").eq("project_id", projectId).maybeSingle(),
          supabase.from("site_press_screenshots").select("*").eq("project_id", projectId).order("sort_order"),
        ]);
        setKit((kitRes.data as PressKitRow) ?? emptyPressKit(projectId));
        setShots((shotsRes.data ?? []) as ScreenshotRow[]);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load press kit");
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  const upd = <K extends keyof PressKitRow>(k: K, v: PressKitRow[K]) => setKit((prev) => prev ? { ...prev, [k]: v } : prev);

  const save = async () => {
    if (!kit) return;
    setSaving(true); setMsg("");
    try {
      await adminCall({ op: "upsert", table: "site_press_kits", rows: [kit] });
      if (shots.length > 0) {
        const rows = shots.map((s, i) => ({ ...s, project_id: projectId, sort_order: i }));
        await adminCall({ op: "upsert", table: "site_press_screenshots", rows });
      }
      setMsg("Saved");
    } catch (e: any) {
      setMsg(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteShot = async (i: number) => {
    const s = shots[i];
    if (s.id) {
      if (!confirm("Delete this screenshot?")) return;
      try { await adminCall({ op: "delete", table: "site_press_screenshots", id: s.id }); }
      catch (e: any) { setMsg(e?.message ?? "Delete failed"); return; }
    }
    setShots(shots.filter((_, idx) => idx !== i));
  };

  const moveShot = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= shots.length) return;
    const next = [...shots];
    [next[i], next[j]] = [next[j], next[i]];
    setShots(next);
  };

  const addScreenshotFromUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const uploaded: ScreenshotRow[] = [];
    for (const f of Array.from(files)) {
      try {
        const url = await uploadPressAsset(f, "press_image");
        uploaded.push({ project_id: projectId, url, caption: "", sort_order: shots.length + uploaded.length });
      } catch (e: any) {
        setMsg(e?.message ?? "Upload failed");
      }
    }
    if (uploaded.length > 0) setShots([...shots, ...uploaded]);
  };

  const pressUrl = `/press/${slugify(project.title)}`;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="font-display text-xl font-bold">Press Kit — {project.title}</h2>
            <a href={pressUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
              <ExternalLink className="h-3 w-3" /> Live preview: {pressUrl}
            </a>
          </div>
          <div className="flex items-center gap-2">
            {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
            <Button size="sm" onClick={save} disabled={saving || loading}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && <Spinner />}
          {error && <ErrorMsg text={error} />}
          {kit && !loading && (
            <div className="space-y-6">
              <section className="grid gap-3 sm:grid-cols-2">
                <TextField label="One-line pitch" value={kit.one_line_pitch} onChange={(v) => upd("one_line_pitch", v)} className="sm:col-span-2" />
                <TextField label="Long description" value={kit.long_description} onChange={(v) => upd("long_description", v)} className="sm:col-span-2" />
                <Field label="Developer" value={kit.developer} onChange={(v) => upd("developer", v)} />
                <Field label="Publisher" value={kit.publisher} onChange={(v) => upd("publisher", v)} />
                <Field label="Studio location" value={kit.studio_location} onChange={(v) => upd("studio_location", v)} />
                <Field label="Genre" value={kit.genre} onChange={(v) => upd("genre", v)} />
                <Field label="Platforms" value={kit.platforms} onChange={(v) => upd("platforms", v)} placeholder="Windows, macOS, Steam Deck" />
                <Field label="Release date" value={kit.release_date} onChange={(v) => upd("release_date", v)} placeholder="Q2 2026 / TBA" />
                <Field label="Price" value={kit.price} onChange={(v) => upd("price", v)} placeholder="$9.99 / Free" />
                <Field label="Press contact email" value={kit.press_contact_email} onChange={(v) => upd("press_contact_email", v)} />
                <Field label="Steam URL" value={kit.steam_url} onChange={(v) => upd("steam_url", v)} />
                <Field label="Discord URL" value={kit.discord_url} onChange={(v) => upd("discord_url", v)} />
                <TextField label="Other social URLs (one per line)" value={kit.other_social_urls} onChange={(v) => upd("other_social_urls", v)} className="sm:col-span-2" />
                <Field label="Trailer URL (YouTube/Vimeo)" value={kit.trailer_url} onChange={(v) => upd("trailer_url", v)} className="sm:col-span-2" />
              </section>

              <section className="grid gap-4 sm:grid-cols-3">
                <PressUpload label="Key art" value={kit.key_art_url} kind="press_image" onChange={(v) => upd("key_art_url", v)} />
                <PressUpload label="Game logo (PNG)" value={kit.game_logo_url} kind="press_logo" onChange={(v) => upd("game_logo_url", v)} />
                <PressUpload label="Studio logo (PNG)" value={kit.studio_logo_url} kind="press_logo" onChange={(v) => upd("studio_logo_url", v)} />
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between">
                  <Label>Screenshots</Label>
                  <MultiUploadButton onFiles={addScreenshotFromUpload} />
                </div>
                {shots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No screenshots yet. Upload one or more images.</p>
                ) : (
                  <ul className="grid gap-2">
                    {shots.map((s, i) => (
                      <li key={s.id ?? `new-${i}`} className="flex items-center gap-3 rounded-md border border-border bg-card p-2">
                        <div className="h-14 w-24 shrink-0 overflow-hidden rounded bg-surface-2">
                          {s.url ? <img src={s.url} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-muted-foreground"><ImageIcon className="h-4 w-4" /></div>}
                        </div>
                        <Input value={s.caption} onChange={(e) => setShots(shots.map((r, idx) => idx === i ? { ...r, caption: e.target.value } : r))} placeholder="Caption (optional)" className="flex-1" />
                        <Button variant="ghost" size="icon" onClick={() => moveShot(i, -1)} aria-label="Move up"><ArrowUp className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => moveShot(i, 1)} aria-label="Move down"><ArrowDown className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteShot(i)} aria-label="Delete" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="grid gap-3 sm:grid-cols-2">
                <TextField label="System requirements (optional)" value={kit.system_requirements} onChange={(v) => upd("system_requirements", v)} />
                <TextField label="Content warnings (optional)" value={kit.content_warnings} onChange={(v) => upd("content_warnings", v)} />
              </section>

              <section>
                <ZipUpload value={kit.press_kit_zip_url} onChange={(v) => upd("press_kit_zip_url", v)} />
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PressUpload({ label, value, kind, onChange }: { label: string; value: string; kind: "press_image" | "press_logo"; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const accept = kind === "press_logo" ? "image/png,image/webp,image/svg+xml" : "image/jpeg,image/png,image/webp,image/gif";
  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    setErr("");
    if (f.size > 10 * 1024 * 1024) { setErr("Max 10 MB."); return; }
    setUploading(true);
    try { onChange(await uploadPressAsset(f, kind)); }
    catch (ex: any) { setErr(ex?.message ?? "Upload failed"); }
    finally { setUploading(false); }
  };
  const onDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    const transfer = new DataTransfer(); transfer.items.add(file);
    await onPick({ target: { files: transfer.files, value: "" } } as React.ChangeEvent<HTMLInputElement>);
  };
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2 grid aspect-video place-items-center overflow-hidden rounded-md border border-border bg-surface-2">
        {value ? <img src={value} alt="" className="h-full w-full object-contain" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
      </div>
      <input ref={inputRef} type="file" accept={accept} onChange={onPick} className="hidden" />
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading} className="mt-2 w-full">
        {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…</> : <><Upload className="mr-2 h-4 w-4" /> {value ? "Replace" : "Upload"}</>}
      </Button>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="or paste URL" className="mt-2 text-xs" />
      {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
    </div>
  );
}

function MultiUploadButton({ onFiles }: { onFiles: (files: FileList | null) => Promise<void> | void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={async (e) => { setBusy(true); await onFiles(e.target.files); e.target.value = ""; setBusy(false); }} />
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Add screenshots
      </Button>
    </>
  );
}

function ZipUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    if (f.size > 500 * 1024 * 1024) { setErr("Max 500 MB."); return; }
    setErr(""); setUploading(true);
    try { onChange(await uploadPressAsset(f, "press_zip")); }
    catch (ex: any) { setErr(ex?.message ?? "Upload failed"); }
    finally { setUploading(false); }
  };
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <Label>Press Kit ZIP (optional)</Label>
      <p className="mt-1 text-xs text-muted-foreground">A single ZIP bundle downloadable from the "Download Full Press Kit" button.</p>
      <input ref={inputRef} type="file" accept=".zip,application/zip" onChange={onPick} className="hidden" />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…</> : <><Upload className="mr-2 h-4 w-4" /> {value ? "Replace ZIP" : "Upload ZIP"}</>}
        </Button>
        {value && (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
            <ExternalLink className="h-3 w-3" /> View current ZIP
          </a>
        )}
      </div>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="or paste URL" className="mt-2 text-xs" />
      {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
    </div>
  );
}

// -----------------------------------------------------------------------------
// GAME INFO PAGE EDITOR (per project) — block-based
// -----------------------------------------------------------------------------

type BlockRow = {
  id?: string;
  project_id: string;
  block_type: string;
  sort_order: number;
  visible: boolean;
  content: any;
  _dirty?: boolean;
};

const BLOCK_TYPES: { type: string; label: string; description: string }[] = [
  { type: "hero", label: "Hero", description: "Big background image with title, subtitle, and optional CTA." },
  { type: "text", label: "Text", description: "Heading, rich text body, optional side image." },
  { type: "gallery", label: "Image Gallery", description: "Multiple images with lightbox and reordering." },
  { type: "free_image", label: "Free Image", description: "Single image (roadmap/infographic) with size and caption." },
  { type: "steam", label: "Steam Widget", description: "Embed the official Steam wishlist/buy widget." },
  { type: "store_bar", label: "Store Bar", description: "Game description, status, platforms, and main store button." },
  { type: "features", label: "Feature List", description: "Grid of icon + title + description items." },
  { type: "video", label: "Video / Trailer", description: "Embedded YouTube or Vimeo video." },
  { type: "quote", label: "Quote / Testimonial", description: "Featured quote with attribution." },
];

const defaultContent = (type: string): any => {
  switch (type) {
    case "hero":       return { title: "", subtitle: "", image_url: "", cta_label: "", cta_url: "", trailer_url: "", background: "black", background_color: "#000000" };
    case "text":       return { heading: "", heading_style: "normal", body: "", image_url: "", image_position: "none", background: "black", background_color: "#000000" };
    case "gallery":    return { heading: "", images: [] as string[], background_color: "" };
    case "free_image": return { image_url: "", caption: "", size: "large", zoomable: true, background_color: "" };
    case "steam":      return { app_id: "", label: "GET IT ON STEAM", background: "black", background_color: "#000000" };
    case "store_bar":  return { use_game_data: true, description: "", status: "", platforms: [], button_label: "", button_url: "", bar_color: "#e8702a", background: "black", background_color: "#000000" };
    case "features":   return { heading: "", columns: 3, items: [] as any[], background_color: "" };
    case "video":      return { url: "", poster_url: "", background: "black", background_color: "#000000" };
    case "quote":      return { quote: "", attribution: "", source: "", source_url: "", background: "black", background_color: "#000000" };
    default:           return { background_color: "" };
  }
};

type BlockBackground = "black" | "dark" | "orange";
const backgroundHex = (value: BlockBackground) => value === "orange" ? "#e8702a" : value === "dark" ? "#1c1c1c" : "#000000";
const backgroundPreset = (value: unknown): BlockBackground => {
  const color = String(value || "").toLowerCase();
  if (color === "#e8702a") return "orange";
  if (color === "#1c1c1c" || color === "#242424") return "dark";
  return "black";
};

function BackgroundSelect({ value, onChange }: { value: BlockBackground; onChange: (value: BlockBackground) => void }) {
  return <div className="pt-2"><Label>Block background</Label><div className="background-options">{(["black", "dark", "orange"] as BlockBackground[]).map((option) => <Button key={option} type="button" variant={value === option ? "default" : "outline"} size="sm" onClick={() => onChange(option)}>{option === "dark" ? "Dark grey" : option}</Button>)}</div></div>;
}

function GamePageDialog({ project, platforms, onClose }: { project: ProjectRow; platforms: PlatformRow[]; onClose: () => void }) {
  const projectId = project.id ?? "";
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { supabase } = await import("@/lib/supabase");
        const { data, error } = await supabase
          .from("site_game_page_blocks")
          .select("*")
          .eq("project_id", projectId)
          .order("sort_order");
        if (error) throw error;
        setBlocks((data ?? []).map((b: any) => ({ ...b, content: b.content ?? {} })) as BlockRow[]);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load game page");
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  const patch = (i: number, p: Partial<BlockRow>) => { setDirty(true); setBlocks(blocks.map((b, idx) => idx === i ? { ...b, ...p, _dirty: true } : b)); };
  const patchContent = (i: number, c: any) => patch(i, { content: { ...blocks[i].content, ...c } });

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    setBlocks(next.map((b, idx) => ({ ...b, sort_order: idx, _dirty: true })));
    setDirty(true);
    if (openIdx === i) setOpenIdx(j);
    else if (openIdx === j) setOpenIdx(i);
  };

  const remove = (i: number) => {
    if (!confirm("Delete this block?")) return;
    const b = blocks[i];
    if (b.id) setDeletedIds([...deletedIds, b.id]);
    setBlocks(blocks.filter((_, idx) => idx !== i).map((b, idx) => ({ ...b, sort_order: idx, _dirty: true })));
    setDirty(true);
    if (openIdx === i) setOpenIdx(null);
  };

  const add = (type: string) => {
    setBlocks([...blocks, { project_id: projectId, block_type: type, sort_order: blocks.length, visible: true, content: defaultContent(type), _dirty: true }]);
    setDirty(true);
    setAddOpen(false);
    setOpenIdx(blocks.length);
  };

  const save = async () => {
    setSaving(true); setMsg("");
    try {
      for (const id of deletedIds) {
        await adminCall({ op: "delete", table: "site_game_page_blocks", id });
      }
      const rows = blocks.map((b, i) => {
        const { _dirty, ...rest } = b;
        return { ...rest, sort_order: i };
      });
      if (rows.length > 0) {
        const res = await adminCall({ op: "upsert", table: "site_game_page_blocks", rows });
        // refresh with returned ids
        if (res?.rows) setBlocks((res.rows as any[]).sort((a, b) => a.sort_order - b.sort_order).map((b: any) => ({ ...b, content: b.content ?? {} })));
      }
      setDeletedIds([]);
      setMsg("Saved");
      setDirty(false);
    } catch (e: any) {
      setMsg(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const gameUrl = `/games/${slugify(project.title)}`;
  const close = () => { if (!dirty || confirm("You have unsaved changes. Close the editor?")) onClose(); };
  const duplicate = (i: number) => {
    const source = blocks[i];
    const copy: BlockRow = { ...source, id: undefined, content: structuredClone(source.content || {}), sort_order: i + 1, _dirty: true };
    const next = [...blocks]; next.splice(i + 1, 0, copy);
    setBlocks(next.map((block, index) => ({ ...block, sort_order: index, _dirty: true })));
    setOpenIdx(i + 1); setDirty(true);
  };
  const previewProject: GameProject = {
    id: projectId, title: project.title, description: project.description, cover_url: project.cover_url,
    key_art_url: project.key_art_url, trailer_url: project.trailer_url, status: project.status,
    button_label: project.button_label, button_url: project.button_url, info_bar_color: project.info_bar_color,
    more_info_enabled: !!project.more_info_enabled, visible: project.visible, platforms,
  };

  return (
    <div className="game-editor-page fixed inset-0 z-50 flex flex-col bg-background" role="dialog" aria-modal="true">
        <div className="game-editor-header flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="font-display text-xl font-bold">Game Info Page: {project.title}</h2>
            <a href={gameUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
              <ExternalLink className="h-3 w-3" /> Preview page: {gameUrl}
            </a>
          </div>
          <div className="flex items-center gap-2">
            {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
            <Button size="sm" onClick={save} disabled={saving || loading}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
            </Button>
            <Button variant="ghost" size="icon" onClick={close} aria-label="Close"><X className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="game-editor-body flex-1 overflow-y-auto px-6 py-5">
          {loading && <Spinner />}
          {error && <ErrorMsg text={error} />}
          {!loading && !error && (
            <div className="game-editor-columns">
              <div className="space-y-3">
              {blocks.length === 0 && (
                <p className="text-sm text-muted-foreground">No blocks yet. Click "Add block" to start.</p>
              )}
              <DndContext collisionDetection={closestCenter} onDragEnd={({ active, over }) => { if (!over || active.id === over.id) return; const ids = blocks.map((block, index) => block.id ?? `new-${index}`); const oldIndex = ids.indexOf(String(active.id)); const newIndex = ids.indexOf(String(over.id)); if (oldIndex < 0 || newIndex < 0) return; setBlocks(arrayMove(blocks, oldIndex, newIndex).map((block, index) => ({ ...block, sort_order: index, _dirty: true }))); setDirty(true); }}>
              <SortableContext items={blocks.map((block, index) => block.id ?? `new-${index}`)} strategy={verticalListSortingStrategy}>
              {blocks.map((b, i) => {
                const meta = BLOCK_TYPES.find((t) => t.type === b.block_type);
                const open = openIdx === i;
                return (
                  <SortableAdminCard key={b.id ?? `new-${i}`} id={b.id ?? `new-${i}`}>
                  <div className={`${b.visible ? "" : "opacity-70"}`}>
                    <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setOpenIdx(open ? null : i)}
                        className="flex flex-1 items-center gap-3 text-left"
                      >
                        <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-primary">
                          {meta?.label ?? b.block_type}
                        </span>
                        <span className="truncate text-sm text-muted-foreground">{blockSummary(b)}</span>
                      </button>
                      <Button variant="ghost" size="icon" onClick={() => patch(i, { visible: !b.visible })} aria-label="Toggle visibility" title={b.visible ? "Hide" : "Show"}>
                        {b.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => duplicate(i)} aria-label="Duplicate block" title="Duplicate"><Copy className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(i)} aria-label="Delete" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    {open && (
                      <div className="space-y-3 px-4 py-4">
                        <BlockEditor block={b} onContent={(c) => patchContent(i, c)} />
                        <BackgroundSelect value={b.content?.background || backgroundPreset(b.content?.background_color)} onChange={(background) => patchContent(i, { background, background_color: backgroundHex(background) })} />
                      </div>
                    )}
                  </div>
                  </SortableAdminCard>
                );
              })}
              </SortableContext></DndContext>
              <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add block</Button>
              </div>
              <aside className="game-editor-preview"><Label>Live page preview</Label><div className="game-editor-preview-frame"><GamePageCanvas project={previewProject} blocks={blocks as GameBlock[]} preview /></div></aside>
            </div>
          )}
        </div>

      {addOpen && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setAddOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h3 className="font-display text-base font-bold">Add a block</h3>
              <Button variant="ghost" size="icon" onClick={() => setAddOpen(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-2 overflow-y-auto p-4 sm:grid-cols-2">
              {BLOCK_TYPES.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => add(t.type)}
                  className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/60 hover:bg-muted"
                >
                  <div className="font-display text-sm font-bold">{t.label}</div>
                  <div className="text-xs text-muted-foreground">{t.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function blockSummary(b: BlockRow): string {
  const c = b.content || {};
  switch (b.block_type) {
    case "hero":       return c.title || "Untitled hero";
    case "text":       return c.heading || (c.body ? String(c.body).slice(0, 60) : "Text block");
    case "gallery":    return `${(Array.isArray(c.images) ? c.images.length : 0)} image(s)`;
    case "free_image": return c.caption || "Image";
    case "steam":      return c.app_id ? `App ${c.app_id}` : "No App ID";
    case "store_bar":  return c.use_game_data !== false ? "Using game data" : c.status || "Custom store bar";
    case "features":   return `${(Array.isArray(c.items) ? c.items.length : 0)} feature(s)`;
    case "video":      return c.url || "No URL";
    case "quote":      return c.quote ? String(c.quote).slice(0, 60) : "Empty quote";
    default:           return "";
  }
}

function BlockEditor({ block, onContent }: { block: BlockRow; onContent: (c: any) => void }) {
  const c = block.content || {};
  switch (block.block_type) {
    case "hero":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title" value={c.title ?? ""} onChange={(v) => onContent({ title: v })} className="sm:col-span-2" />
          <TextField label="Subtitle" value={c.subtitle ?? ""} onChange={(v) => onContent({ subtitle: v })} className="sm:col-span-2" />
          <div className="sm:col-span-2">
            <ImageInput label="Background image" value={c.image_url ?? ""} onChange={(v) => onContent({ image_url: v })} />
          </div>
          <Field label="CTA label (optional)" value={c.cta_label ?? ""} onChange={(v) => onContent({ cta_label: v })} />
          <Field label="CTA URL (optional)" value={c.cta_url ?? ""} onChange={(v) => onContent({ cta_url: v })} />
          <Field label="YouTube trailer URL (optional)" value={c.trailer_url ?? ""} onChange={(v) => onContent({ trailer_url: v })} className="sm:col-span-2" />
        </div>
      );

    case "text":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Heading (optional)" value={c.heading ?? ""} onChange={(v) => onContent({ heading: v })} className="sm:col-span-2" />
          <div><Label>Headline style</Label><select value={c.heading_style ?? "normal"} onChange={(e) => onContent({ heading_style: e.target.value })} className="mt-1 flex h-10 w-full border border-input bg-background px-3 text-sm"><option value="normal">Normal</option><option value="stacked">Stacked Blocks</option></select></div>
          <TextField label="Body" value={c.body ?? ""} onChange={(v) => onContent({ body: v })} className="sm:col-span-2" />
          <div>
            <Label>Image position</Label>
            <select
              value={c.image_position ?? "none"}
              onChange={(e) => onContent({ image_position: e.target.value })}
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="none">None</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>
          <div>
            <ImageInput label="Image (optional)" value={c.image_url ?? ""} onChange={(v) => onContent({ image_url: v })} />
          </div>
        </div>
      );

    case "gallery": {
      const images: { url: string; caption: string }[] = Array.isArray(c.images) ? c.images.map((image: any) => typeof image === "string" ? { url: image, caption: "" } : { url: image?.url || "", caption: image?.caption || "" }) : [];
      const setImages = (next: { url: string; caption: string }[]) => onContent({ images: next });
      const moveImg = (i: number, dir: -1 | 1) => {
        const j = i + dir;
        if (j < 0 || j >= images.length) return;
        const next = [...images];
        [next[i], next[j]] = [next[j], next[i]];
        setImages(next);
      };
      return (
        <div className="space-y-3">
          <Field label="Heading (optional)" value={c.heading ?? ""} onChange={(v) => onContent({ heading: v })} />
          <MultiImageUpload
            onFiles={async (files) => {
              const urls: string[] = [];
              for (const f of Array.from(files ?? [])) {
                try { urls.push(await uploadPressAsset(f, "press_image")); } catch {}
              }
              if (urls.length) setImages([...images, ...urls.map((url) => ({ url, caption: "" }))]);
            }}
          />
          {images.length === 0 ? (
            <p className="text-sm text-muted-foreground">No images yet.</p>
          ) : (
            <ul className="grid gap-2">
              {images.map((image, i) => (
                <li key={`${image.url}-${i}`} className="grid items-center gap-3 border border-border bg-background/40 p-2 sm:grid-cols-[96px_1fr_auto]">
                  <div className="h-14 w-24 shrink-0 overflow-hidden rounded bg-surface-2">
                    <img src={image.url} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="grid gap-2"><Input value={image.url} onChange={(e) => setImages(images.map((item, idx) => idx === i ? { ...item, url: e.target.value } : item))} className="text-xs" /><Input value={image.caption} onChange={(e) => setImages(images.map((item, idx) => idx === i ? { ...item, caption: e.target.value } : item))} placeholder="Optional caption" /></div>
                  <div><Button variant="ghost" size="icon" onClick={() => moveImg(i, -1)} aria-label="Move up"><ArrowUp className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => moveImg(i, 1)} aria-label="Move down"><ArrowDown className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => setImages(images.filter((_, idx) => idx !== i))} aria-label="Delete" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></div>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    case "free_image":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <ImageInput label="Image" value={c.image_url ?? ""} onChange={(v) => onContent({ image_url: v })} />
          </div>
          <div>
            <Label>Display size</Label>
            <select
              value={c.size === "full" || c.size === "full_width" ? "full" : "contained"}
              onChange={(e) => onContent({ size: e.target.value })}
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="contained">Contained</option>
              <option value="full">Full width</option>
            </select>
          </div>
          <label className="flex items-end gap-2 pb-2">
            <input type="checkbox" className="h-4 w-4 accent-primary" checked={c.zoomable !== false} onChange={(e) => onContent({ zoomable: e.target.checked })} />
            <span className="text-sm">Click to zoom</span>
          </label>
          <TextField label="Caption (optional)" value={c.caption ?? ""} onChange={(v) => onContent({ caption: v })} className="sm:col-span-2" />
        </div>
      );

    case "steam":
      return (
        <div className="grid gap-3">
          <Field label="Steam App ID" value={c.app_id ?? ""} onChange={(v) => onContent({ app_id: v })} placeholder="e.g. 730" />
          <Field label="Section label" value={c.label ?? "GET IT ON STEAM"} onChange={(v) => onContent({ label: v })} />
          <p className="text-xs text-muted-foreground">Renders <code>https://store.steampowered.com/widget/&lt;APP_ID&gt;/</code>.</p>
        </div>
      );

    case "store_bar": {
      const platforms: any[] = Array.isArray(c.platforms) ? c.platforms : [];
      const setPlatforms = (next: any[]) => onContent({ platforms: next });
      return <div className="space-y-3"><ToggleField label="Use game data" value={c.use_game_data !== false} onChange={(value) => onContent({ use_game_data: value })} />{c.use_game_data === false && <><TextField label="Description" value={c.description ?? ""} onChange={(value) => onContent({ description: value })} /><Field label="Status" value={c.status ?? ""} onChange={(value) => onContent({ status: value })} /><div className="grid gap-3 sm:grid-cols-2"><Field label="Button label" value={c.button_label ?? ""} onChange={(value) => onContent({ button_label: value })} /><Field label="Button URL" value={c.button_url ?? ""} onChange={(value) => onContent({ button_url: value })} /></div><div className="space-y-2"><Label>Platform tiles</Label>{platforms.map((platform, index) => <div key={index} className="grid gap-2 border border-border p-3 sm:grid-cols-2"><Field label="Name" value={platform.name ?? ""} onChange={(value) => setPlatforms(platforms.map((item, i) => i === index ? { ...item, name: value } : item))} /><Field label="Store URL" value={platform.store_url ?? ""} onChange={(value) => setPlatforms(platforms.map((item, i) => i === index ? { ...item, store_url: value } : item))} /><div className="flex items-end gap-2">{platform.logo_url && <img src={platform.logo_url} alt="" className="h-10 w-10 object-contain" />}<IconUploadButton onUploaded={(logo_url) => setPlatforms(platforms.map((item, i) => i === index ? { ...item, logo_url } : item))} /><Button variant="ghost" size="sm" onClick={() => setPlatforms(platforms.map((item, i) => i === index ? { ...item, logo_url: "" } : item))}>Remove logo</Button></div><Button variant="ghost" size="icon" onClick={() => setPlatforms(platforms.filter((_, i) => i !== index))}><Trash2 /></Button></div>)}<Button variant="outline" size="sm" onClick={() => setPlatforms([...platforms, { name: "", logo_url: "", store_url: "" }])}><Plus className="mr-2 h-4 w-4" />Add platform</Button></div></>}<ColorField label="Bar color" value={c.bar_color || "#e8702a"} onChange={(value) => onContent({ bar_color: value })} /></div>;
    }

    case "features": {
      const items: any[] = Array.isArray(c.items) ? c.items : [];
      const setItems = (next: any[]) => onContent({ items: next });
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Heading (optional)" value={c.heading ?? ""} onChange={(v) => onContent({ heading: v })} />
            <div>
              <Label>Columns</Label>
              <select
                value={String(c.columns ?? 3)}
                onChange={(e) => onContent({ columns: Number(e.target.value) })}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid gap-2 rounded-md border border-border bg-background/40 p-3 sm:grid-cols-[80px_1fr_1fr_auto]">
                <div>
                  <Label className="text-xs">Icon</Label>
                  {it.icon_url ? (
                    <img src={it.icon_url} alt="" className="mt-1 h-10 w-10 object-contain" />
                  ) : (
                    <div className="mt-1 grid h-10 w-10 place-items-center rounded bg-surface-2 text-muted-foreground"><ImageIcon className="h-4 w-4" /></div>
                  )}
                </div>
                <Field label="Title" value={it.title ?? ""} onChange={(v) => setItems(items.map((x, idx) => idx === i ? { ...x, title: v } : x))} />
                <Field label="Description" value={it.description ?? ""} onChange={(v) => setItems(items.map((x, idx) => idx === i ? { ...x, description: v } : x))} />
                <div className="flex items-end gap-1">
                  <IconUploadButton onUploaded={(url) => setItems(items.map((x, idx) => idx === i ? { ...x, icon_url: url } : x))} />
                  <Button variant="ghost" size="icon" onClick={() => setItems(items.filter((_, idx) => idx !== i))} aria-label="Delete" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setItems([...items, { title: "", description: "", icon_url: "" }])}>
              <Plus className="mr-2 h-4 w-4" /> Add feature
            </Button>
          </div>
        </div>
      );
    }

    case "video":
      return (
        <div className="grid gap-3"><Field label="YouTube or Vimeo URL" value={c.url ?? ""} onChange={(v) => onContent({ url: v })} placeholder="https://youtube.com/watch?v=..." /><ImageInput label="Poster image (optional)" value={c.poster_url ?? ""} onChange={(poster_url) => onContent({ poster_url })} /></div>
      );

    case "quote":
      return (
        <div className="grid gap-3">
          <TextField label="Quote" value={c.quote ?? ""} onChange={(v) => onContent({ quote: v })} />
          <Field label="Attribution" value={c.attribution ?? ""} onChange={(v) => onContent({ attribution: v })} placeholder="Name / Publication" />
          <Field label="Source" value={c.source ?? ""} onChange={(v) => onContent({ source: v })} />
          <Field label="Source URL" value={c.source_url ?? ""} onChange={(v) => onContent({ source_url: v })} />
        </div>
      );

    default:
      return <p className="text-sm text-muted-foreground">Unknown block type.</p>;
  }
}

function ImageInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) { setErr("Max 15 MB."); return; }
    setErr(""); setUploading(true);
    try { onChange(await uploadPressAsset(f, "press_image")); }
    catch (ex: any) { setErr(ex?.message ?? "Upload failed"); }
    finally { setUploading(false); }
  };
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2 grid aspect-video max-h-56 place-items-center overflow-hidden rounded-md border border-border bg-surface-2">
        {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={pick} className="hidden" />
      <div className="mt-2 flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…</> : <><Upload className="mr-2 h-4 w-4" /> {value ? "Replace" : "Upload"}</>}
        </Button>
        {value && <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>Clear</Button>}
      </div>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="or paste URL" className="mt-2 text-xs" />
      {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
    </div>
  );
}

function MultiImageUpload({ onFiles }: { onFiles: (files: FileList | null) => Promise<void> | void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={async (e) => { setBusy(true); await onFiles(e.target.files); e.target.value = ""; setBusy(false); }} />
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Add images
      </Button>
    </>
  );
}

function IconUploadButton({ onUploaded }: { onUploaded: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    setBusy(true);
    try { onUploaded(await uploadPressAsset(f, "press_logo")); }
    catch {}
    finally { setBusy(false); }
  };
  return (
    <>
      <input ref={inputRef} type="file" accept="image/png,image/webp,image/svg+xml" onChange={pick} className="hidden" />
      <Button type="button" variant="ghost" size="icon" onClick={() => inputRef.current?.click()} aria-label="Upload icon" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
      </Button>
    </>
  );
}


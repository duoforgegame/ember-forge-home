import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, LogOut, Trash2, Plus, Save, Upload, ImageIcon, FileText, ArrowUp, ArrowDown, ExternalLink, X, Layers, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { adminLogin, adminCall, getToken, clearToken, uploadProjectCover, uploadPressAsset, slugify } from "@/lib/api";
import { statusBadgeStyle } from "@/pages/Landing";
import { AnnouncementBannerPreview } from "@/components/AnnouncementBanner";
import { FeaturedGameCard } from "@/components/FeaturedGameCard";

type ProjectRow = { id?: string; title: string; description: string; cover_url: string; status: string; button_label: string; button_url: string; sort_order: number; press_kit_enabled?: boolean; more_info_enabled?: boolean };
type TeamRow = { id?: string; name: string; role: string; bio: string; sort_order: number };
type LinkRow = { id?: string; label: string; url: string; sort_order: number };
type Socials = { id: number; twitter: string; tiktok: string; instagram: string; discord: string; youtube: string };
type About = { id: number; intro_html: string };
type Submission = { id: string; name: string; email: string; subject: string; message: string; inquiry_type: string; created_at: string };

const INQUIRY_META: Record<string, { label: string; className: string }> = {
  player:    { label: "Player",               className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
  press:     { label: "Press / Media",        className: "border-sky-500/40 bg-sky-500/10 text-sky-300" },
  publisher: { label: "Publisher / Business", className: "border-primary/50 bg-primary/15 text-primary" },
  other:     { label: "Other",                className: "border-border bg-muted/40 text-muted-foreground" },
};
type StatusColor = { status: string; color: string };

const DEFAULT_STATUSES = ["Play Now", "In Development", "Coming Soon", "Prototype"] as const;

const TABS = ["Projects", "Featured", "Team", "About", "Socials", "Header", "Footer", "Status colors", "Legal", "Banner", "Messages"] as const;
type Tab = (typeof TABS)[number];

export default function Admin() {
  const [authed, setAuthed] = useState<boolean>(!!getToken());
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
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
        <h1 className="font-display text-xl font-bold">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter the admin password to continue.</p>
        <div className="mt-5 space-y-2">
          <Label htmlFor="pwd">Password</Label>
          <Input id="pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus autoComplete="current-password" />
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={loading} className="mt-5 w-full">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Login
        </Button>
      </form>
    </div>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("Projects");
  const logout = () => { clearToken(); onLogout(); };
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <h1 className="font-display text-lg font-bold">Duo Forge — Admin</h1>
          <Button variant="ghost" size="sm" onClick={logout}><LogOut className="mr-2 h-4 w-4" /> Log out</Button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {tab === "Projects" && <ProjectsPanel />}
        {tab === "Featured" && <FeaturedGamePanel />}
        {tab === "Team" && <TeamPanel />}
        {tab === "About" && <AboutPanel />}
        {tab === "Socials" && <SocialsPanel />}
        {tab === "Header" && <LinksPanel table="site_header_links" title="Header links" />}
        {tab === "Footer" && <LinksPanel table="site_footer_links" title="Footer links" />}
        {tab === "Status colors" && <StatusColorsPanel />}
        {tab === "Legal" && <LegalPanel />}
        {tab === "Banner" && <AnnouncementPanel />}
        {tab === "Messages" && <MessagesPanel />}
      </main>
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
  if (error) throw error;
  return (data ?? []) as T[];
}

function ProjectsPanel() {
  const { data, loading, error, reload, setData } = useLoader<ProjectRow[]>(() => loadTable("site_projects"));
  const colorsLoader = useLoader<StatusColor[]>(async () => {
    const { supabase } = await import("@/lib/supabase");
    const { data } = await supabase.from("site_status_colors").select("*");
    return (data ?? []) as StatusColor[];
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [pressKitFor, setPressKitFor] = useState<ProjectRow | null>(null);
  const [gamePageFor, setGamePageFor] = useState<ProjectRow | null>(null);
  if (loading) return <Spinner />;
  if (error) return <ErrorMsg text={error} />;
  const rows = data ?? [];
  const colorMap: Record<string, string> = {
    "Play Now": "#10b981", "In Development": "#f59e0b", "Coming Soon": "#0ea5e9", Prototype: "#a1a1aa",
  };
  for (const c of colorsLoader.data ?? []) colorMap[c.status] = c.color;

  const update = (i: number, patch: Partial<ProjectRow>) => setData(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const addRow = () => setData([...rows, { title: "", description: "", cover_url: "", status: "In Development", button_label: "", button_url: "", sort_order: rows.length, press_kit_enabled: false, more_info_enabled: false }]);
  const removeRow = async (i: number) => {
    const row = rows[i];
    if (row.id && !confirm("Delete this project?")) return;
    if (row.id) await adminCall({ op: "delete", table: "site_projects", id: row.id });
    setData(rows.filter((_, idx) => idx !== i));
  };
  const saveAll = async () => {
    setSaving(true); setMsg("");
    try { await adminCall({ op: "upsert", table: "site_projects", rows }); setMsg("Saved"); await reload(); }
    catch (e: any) { setMsg(e?.message ?? "Save failed"); }
    finally { setSaving(false); }
  };
  return (
    <div className="space-y-4">
      <PanelHeader title="Projects" onAdd={addRow} onSave={saveAll} saving={saving} msg={msg} />
      {rows.map((r, i) => (
        <div key={r.id ?? `new-${i}`} className="rounded-lg border border-border bg-card p-4">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Title" value={r.title} onChange={(v) => update(i, { title: v })} />
              <StatusSelect value={r.status} options={Object.keys(colorMap)} onChange={(v) => update(i, { status: v })} />
              <div className="sm:col-span-2">
                <CoverUploader value={r.cover_url} onChange={(v) => update(i, { cover_url: v })} />
              </div>
              <Field label="Button label" value={r.button_label} onChange={(v) => update(i, { button_label: v })} />
              <Field label="Button URL" value={r.button_url} onChange={(v) => update(i, { button_url: v })} />
              <TextField label="Description" value={r.description} onChange={(v) => update(i, { description: v })} className="sm:col-span-2" />
              <NumField label="Sort order" value={r.sort_order} onChange={(v) => update(i, { sort_order: v })} />
              <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/60 bg-background/40 p-3">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!!r.press_kit_enabled}
                    onChange={(e) => update(i, { press_kit_enabled: e.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-sm font-medium">Press Kit enabled</span>
                  <span className="text-xs text-muted-foreground">Shows a press-kit icon on the public card and enables <code>/press/{slugify(r.title || "slug")}</code>.</span>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!r.id || !r.press_kit_enabled}
                  onClick={() => setPressKitFor(r)}
                  title={!r.id ? "Save the project first" : !r.press_kit_enabled ? "Enable press kit first" : "Edit press kit"}
                >
                  <FileText className="mr-2 h-4 w-4" /> Edit Press Kit
                </Button>
              </div>
              <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/60 bg-background/40 p-3">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!!r.more_info_enabled}
                    onChange={(e) => update(i, { more_info_enabled: e.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-sm font-medium">Game Info Page enabled</span>
                  <span className="text-xs text-muted-foreground">Shows a "More info" link on the card and enables <code>/games/{slugify(r.title || "slug")}</code>.</span>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!r.id || !r.more_info_enabled}
                  onClick={() => setGamePageFor(r)}
                  title={!r.id ? "Save the project first" : !r.more_info_enabled ? "Enable Game Page first" : "Edit game page"}
                >
                  <Layers className="mr-2 h-4 w-4" /> Edit Game Page
                </Button>
              </div>
              <div className="flex items-end justify-end sm:col-span-2">
                <Button variant="ghost" size="sm" onClick={() => removeRow(i)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
              </div>
            </div>
            <div>
              <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Live preview</Label>
              <ProjectCardPreview project={r} statusColor={colorMap[r.status] ?? "#a1a1aa"} />
            </div>
          </div>
        </div>
      ))}
      {pressKitFor?.id && (
        <PressKitDialog
          project={pressKitFor}
          onClose={() => setPressKitFor(null)}
        />
      )}
      {gamePageFor?.id && (
        <GamePageDialog project={gamePageFor} onClose={() => setGamePageFor(null)} />
      )}
    </div>
  );
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

function CoverUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
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

  return (
    <div>
      <Label>Cover image</Label>
      <p className="mt-1 text-xs text-muted-foreground">Recommended: 1280×720 (16:9), JPG/PNG/WebP, max 5 MB.</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <div className="grid h-20 w-36 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-surface-2">
          {value ? (
            <img src={value} alt="Cover preview" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onPick} className="hidden" />
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…</> : <><Upload className="mr-2 h-4 w-4" /> {value ? "Replace image" : "Upload image"}</>}
          </Button>
          <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="…or paste an image URL" className="w-full sm:w-96" />
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

function AboutPanel() {
  const { data, loading, error, setData } = useLoader<About>(async () => {
    const { supabase } = await import("@/lib/supabase");
    const { data: row } = await supabase.from("site_about").select("*").eq("id", 1).maybeSingle();
    return (row as About) ?? { id: 1, intro_html: "" };
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  if (loading || !data) return <Spinner />;
  if (error) return <ErrorMsg text={error} />;
  const save = async () => {
    setSaving(true); setMsg("");
    try { await adminCall({ op: "upsert", table: "site_about", rows: [data] }); setMsg("Saved"); }
    catch (e: any) { setMsg(e?.message ?? "Save failed"); }
    finally { setSaving(false); }
  };
  return (
    <div className="space-y-4">
      <PanelHeader title="About" onSave={save} saving={saving} msg={msg} />
      <div className="rounded-lg border border-border bg-card p-4">
        <Label>About intro (HTML allowed)</Label>
        <Textarea rows={10} value={data.intro_html} onChange={(e) => setData({ ...data, intro_html: e.target.value })} className="mt-2" />
      </div>
    </div>
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
        <CoverUploader value={data.custom_image_url} onChange={(v) => upd("custom_image_url", v)} />
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

function SocialsPanel() {
  const { data, loading, error, setData } = useLoader<Socials>(async () => {
    const { supabase } = await import("@/lib/supabase");
    const { data: row } = await supabase.from("site_socials").select("*").eq("id", 1).maybeSingle();
    return (row as Socials) ?? { id: 1, twitter: "", tiktok: "", instagram: "", discord: "", youtube: "" };
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  if (loading || !data) return <Spinner />;
  if (error) return <ErrorMsg text={error} />;
  const save = async () => {
    setSaving(true); setMsg("");
    try { await adminCall({ op: "upsert", table: "site_socials", rows: [data] }); setMsg("Saved"); }
    catch (e: any) { setMsg(e?.message ?? "Save failed"); }
    finally { setSaving(false); }
  };
  const upd = (k: keyof Socials, v: string) => setData({ ...data, [k]: v });
  return (
    <div className="space-y-4">
      <PanelHeader title="Socials" onSave={save} saving={saving} msg={msg} />
      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
        <Field label="Twitter / X" value={data.twitter} onChange={(v) => upd("twitter", v)} />
        <Field label="TikTok" value={data.tiktok} onChange={(v) => upd("tiktok", v)} />
        <Field label="Instagram" value={data.instagram} onChange={(v) => upd("instagram", v)} />
        <Field label="Discord" value={data.discord} onChange={(v) => upd("discord", v)} />
        <Field label="YouTube" value={data.youtube} onChange={(v) => upd("youtube", v)} />
      </div>
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

function MessagesPanel() {
  const [filter, setFilter] = useState<string>("all");
  const { data, loading, error, reload } = useLoader<Submission[]>(async () => {
    const res = await adminCall({ op: "list_submissions" });
    return res.rows as Submission[];
  });
  if (loading) return <Spinner />;
  if (error) return <ErrorMsg text={error} />;
  const all = data ?? [];
  const rows = filter === "all" ? all : all.filter((r) => (r.inquiry_type || "other") === filter);
  const del = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    await adminCall({ op: "delete_submission", id });
    await reload();
  };
  const filterOptions = [
    { value: "all", label: `All (${all.length})` },
    ...Object.entries(INQUIRY_META).map(([value, m]) => ({
      value,
      label: `${m.label} (${all.filter((r) => (r.inquiry_type || "other") === value).length})`,
    })),
  ];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">Messages ({rows.length})</h2>
        <div className="flex flex-wrap gap-1.5">
          {filterOptions.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setFilter(o.value)}
              className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                filter === o.value
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">No messages.</p>}
      {rows.map((r) => {
        const meta = INQUIRY_META[r.inquiry_type] ?? INQUIRY_META.other;
        return (
          <div key={r.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.className}`}>
                    {meta.label}
                  </span>
                  <span className="font-semibold">{r.subject}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{r.name} &lt;{r.email}&gt; · {new Date(r.created_at).toLocaleString()}</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => del(r.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
            </div>
            <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-foreground/90">{r.message}</pre>
          </div>
        );
      })}
    </div>
  );
}

function PanelHeader({ title, onAdd, onSave, saving, msg }: { title: string; onAdd?: () => void; onSave: () => void; saving: boolean; msg: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <div className="flex items-center gap-2">
        {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
        {onAdd && <Button variant="outline" size="sm" onClick={onAdd}><Plus className="mr-2 h-4 w-4" /> Add</Button>}
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save
        </Button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, className, placeholder }: { label: string; value: string; onChange: (v: string) => void; className?: string; placeholder?: string }) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1" />
    </div>
  );
}
function TextField({ label, value, onChange, className }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <Textarea rows={3} value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="mt-1" />
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
  { type: "features", label: "Feature List", description: "Grid of icon + title + description items." },
  { type: "video", label: "Video / Trailer", description: "Embedded YouTube or Vimeo video." },
  { type: "quote", label: "Quote / Testimonial", description: "Featured quote with attribution." },
];

const defaultContent = (type: string): any => {
  switch (type) {
    case "hero":       return { title: "", subtitle: "", image_url: "", cta_label: "", cta_url: "", overlay_color: "#000000", overlay_opacity: 0.5, background_color: "" };
    case "text":       return { heading: "", body: "", image_url: "", image_position: "none", background_color: "" };
    case "gallery":    return { heading: "", images: [] as string[], background_color: "" };
    case "free_image": return { image_url: "", caption: "", size: "large", zoomable: true, background_color: "" };
    case "steam":      return { app_id: "", background_color: "" };
    case "features":   return { heading: "", columns: 3, items: [] as any[], background_color: "" };
    case "video":      return { url: "", background_color: "" };
    case "quote":      return { quote: "", attribution: "", background_color: "" };
    default:           return { background_color: "" };
  }
};

function GamePageDialog({ project, onClose }: { project: ProjectRow; onClose: () => void }) {
  const projectId = project.id!;
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

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

  const patch = (i: number, p: Partial<BlockRow>) => setBlocks(blocks.map((b, idx) => idx === i ? { ...b, ...p, _dirty: true } : b));
  const patchContent = (i: number, c: any) => patch(i, { content: { ...blocks[i].content, ...c } });

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    setBlocks(next.map((b, idx) => ({ ...b, sort_order: idx, _dirty: true })));
    if (openIdx === i) setOpenIdx(j);
    else if (openIdx === j) setOpenIdx(i);
  };

  const remove = (i: number) => {
    if (!confirm("Delete this block?")) return;
    const b = blocks[i];
    if (b.id) setDeletedIds([...deletedIds, b.id]);
    setBlocks(blocks.filter((_, idx) => idx !== i).map((b, idx) => ({ ...b, sort_order: idx, _dirty: true })));
    if (openIdx === i) setOpenIdx(null);
  };

  const add = (type: string) => {
    setBlocks([...blocks, { project_id: projectId, block_type: type, sort_order: blocks.length, visible: true, content: defaultContent(type), _dirty: true }]);
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
    } catch (e: any) {
      setMsg(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const gameUrl = `/games/${slugify(project.title)}`;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="font-display text-xl font-bold">Game Info Page — {project.title}</h2>
            <a href={gameUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
              <ExternalLink className="h-3 w-3" /> Preview page: {gameUrl}
            </a>
          </div>
          <div className="flex items-center gap-2">
            {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
            <Button size="sm" onClick={save} disabled={saving || loading}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && <Spinner />}
          {error && <ErrorMsg text={error} />}
          {!loading && !error && (
            <div className="space-y-3">
              {blocks.length === 0 && (
                <p className="text-sm text-muted-foreground">No blocks yet. Click "Add block" to start.</p>
              )}
              {blocks.map((b, i) => {
                const meta = BLOCK_TYPES.find((t) => t.type === b.block_type);
                const open = openIdx === i;
                return (
                  <div key={b.id ?? `new-${i}`} className={`rounded-lg border ${b.visible ? "border-border" : "border-border/50 opacity-70"} bg-card`}>
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
                      <Button variant="ghost" size="icon" onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(i)} aria-label="Delete" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    {open && (
                      <div className="space-y-3 px-4 py-4">
                        <BlockEditor block={b} onContent={(c) => patchContent(i, c)} />
                        <div className="pt-2">
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Background color (hex)</Label>
                          <div className="mt-1 flex items-center gap-2">
                            <input
                              type="color"
                              value={/^#[0-9a-fA-F]{6}$/.test(b.content?.background_color || "") ? b.content.background_color : "#000000"}
                              onChange={(e) => patchContent(i, { background_color: e.target.value })}
                              className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
                            />
                            <Input
                              value={b.content?.background_color ?? ""}
                              onChange={(e) => patchContent(i, { background_color: e.target.value })}
                              placeholder="e.g. #0b0b0f or empty for transparent"
                              className="max-w-xs"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-border px-6 py-4">
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add block
          </Button>
        </div>
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
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Overlay color</Label>
            <div className="mt-1 flex items-center gap-2">
              <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(c.overlay_color || "") ? c.overlay_color : "#000000"} onChange={(e) => onContent({ overlay_color: e.target.value })} className="h-9 w-12 cursor-pointer rounded border border-border" />
              <Input value={c.overlay_color ?? ""} onChange={(e) => onContent({ overlay_color: e.target.value })} placeholder="#000000" />
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Overlay opacity ({Math.round((c.overlay_opacity ?? 0.5) * 100)}%)</Label>
            <input type="range" min={0} max={1} step={0.05} value={c.overlay_opacity ?? 0.5} onChange={(e) => onContent({ overlay_opacity: Number(e.target.value) })} className="mt-2 w-full accent-primary" />
          </div>
        </div>
      );

    case "text":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Heading (optional)" value={c.heading ?? ""} onChange={(v) => onContent({ heading: v })} className="sm:col-span-2" />
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
      const images: string[] = Array.isArray(c.images) ? c.images : [];
      const setImages = (next: string[]) => onContent({ images: next });
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
              if (urls.length) setImages([...images, ...urls]);
            }}
          />
          {images.length === 0 ? (
            <p className="text-sm text-muted-foreground">No images yet.</p>
          ) : (
            <ul className="grid gap-2">
              {images.map((url, i) => (
                <li key={`${url}-${i}`} className="flex items-center gap-3 rounded-md border border-border bg-background/40 p-2">
                  <div className="h-14 w-24 shrink-0 overflow-hidden rounded bg-surface-2">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </div>
                  <Input value={url} onChange={(e) => setImages(images.map((u, idx) => idx === i ? e.target.value : u))} className="flex-1 text-xs" />
                  <Button variant="ghost" size="icon" onClick={() => moveImg(i, -1)} aria-label="Move up"><ArrowUp className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => moveImg(i, 1)} aria-label="Move down"><ArrowDown className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setImages(images.filter((_, idx) => idx !== i))} aria-label="Delete" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
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
              value={c.size ?? "large"}
              onChange={(e) => onContent({ size: e.target.value })}
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
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
          <p className="text-xs text-muted-foreground">Renders <code>https://store.steampowered.com/widget/&lt;APP_ID&gt;/</code>.</p>
        </div>
      );

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
        <Field label="YouTube or Vimeo URL" value={c.url ?? ""} onChange={(v) => onContent({ url: v })} placeholder="https://youtube.com/watch?v=…" />
      );

    case "quote":
      return (
        <div className="grid gap-3">
          <TextField label="Quote" value={c.quote ?? ""} onChange={(v) => onContent({ quote: v })} />
          <Field label="Attribution" value={c.attribution ?? ""} onChange={(v) => onContent({ attribution: v })} placeholder="Name / Publication" />
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


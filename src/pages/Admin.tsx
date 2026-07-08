import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, LogOut, Trash2, Plus, Save, Upload, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { adminLogin, adminCall, getToken, clearToken, uploadProjectCover } from "@/lib/api";
import { statusBadgeStyle } from "@/pages/Landing";
import { AnnouncementBannerPreview } from "@/components/AnnouncementBanner";

type ProjectRow = { id?: string; title: string; description: string; cover_url: string; status: string; button_label: string; button_url: string; sort_order: number; press_kit_enabled?: boolean };
type TeamRow = { id?: string; name: string; role: string; bio: string; sort_order: number };
type LinkRow = { id?: string; label: string; url: string; sort_order: number };
type Socials = { id: number; twitter: string; tiktok: string; instagram: string; discord: string; youtube: string };
type About = { id: number; intro_html: string };
type Submission = { id: string; name: string; email: string; subject: string; message: string; created_at: string };
type StatusColor = { status: string; color: string };

const DEFAULT_STATUSES = ["Play Now", "In Development", "Coming Soon", "Prototype"] as const;

const TABS = ["Projects", "Team", "About", "Socials", "Header", "Footer", "Status colors", "Legal", "Banner", "Messages"] as const;
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
  if (loading) return <Spinner />;
  if (error) return <ErrorMsg text={error} />;
  const rows = data ?? [];
  const colorMap: Record<string, string> = {
    "Play Now": "#10b981", "In Development": "#f59e0b", "Coming Soon": "#0ea5e9", Prototype: "#a1a1aa",
  };
  for (const c of colorsLoader.data ?? []) colorMap[c.status] = c.color;

  const update = (i: number, patch: Partial<ProjectRow>) => setData(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const addRow = () => setData([...rows, { title: "", description: "", cover_url: "", status: "In Development", button_label: "", button_url: "", sort_order: rows.length }]);
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
  const { data, loading, error, reload } = useLoader<Submission[]>(async () => {
    const res = await adminCall({ op: "list_submissions" });
    return res.rows as Submission[];
  });
  if (loading) return <Spinner />;
  if (error) return <ErrorMsg text={error} />;
  const rows = data ?? [];
  const del = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    await adminCall({ op: "delete_submission", id });
    await reload();
  };
  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-bold">Messages ({rows.length})</h2>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
      {rows.map((r) => (
        <div key={r.id} className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className="font-semibold">{r.subject}</div>
              <div className="text-xs text-muted-foreground">{r.name} &lt;{r.email}&gt; · {new Date(r.created_at).toLocaleString()}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => del(r.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
          </div>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-foreground/90">{r.message}</pre>
        </div>
      ))}
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

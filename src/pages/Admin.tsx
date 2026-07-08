import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, LogOut, Trash2, Plus, Save, Upload, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { adminLogin, adminCall, getToken, clearToken, uploadProjectCover } from "@/lib/api";
import { statusBadgeStyle } from "@/pages/Landing";

type ProjectRow = { id?: string; title: string; description: string; cover_url: string; status: string; button_label: string; button_url: string; sort_order: number };
type TeamRow = { id?: string; name: string; role: string; bio: string; sort_order: number };
type LinkRow = { id?: string; label: string; url: string; sort_order: number };
type Socials = { id: number; twitter: string; tiktok: string; instagram: string; discord: string; youtube: string };
type About = { id: number; intro_html: string };
type Submission = { id: string; name: string; email: string; subject: string; message: string; created_at: string };
type StatusColor = { status: string; color: string };

const DEFAULT_STATUSES = ["Play Now", "In Development", "Coming Soon", "Prototype"] as const;

const TABS = ["Projects", "Team", "About", "Socials", "Header", "Footer", "Status colors", "Messages"] as const;
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
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  if (loading) return <Spinner />;
  if (error) return <ErrorMsg text={error} />;
  const rows = data ?? [];
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
        <div key={r.id ?? `new-${i}`} className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
          <Field label="Title" value={r.title} onChange={(v) => update(i, { title: v })} />
          <Field label="Status" value={r.status} onChange={(v) => update(i, { status: v })} placeholder="Play Now / In Development / Coming Soon / Prototype" />
          <Field label="Cover URL" value={r.cover_url} onChange={(v) => update(i, { cover_url: v })} className="sm:col-span-2" />
          <Field label="Button label" value={r.button_label} onChange={(v) => update(i, { button_label: v })} />
          <Field label="Button URL" value={r.button_url} onChange={(v) => update(i, { button_url: v })} />
          <TextField label="Description" value={r.description} onChange={(v) => update(i, { description: v })} className="sm:col-span-2" />
          <NumField label="Sort order" value={r.sort_order} onChange={(v) => update(i, { sort_order: v })} />
          <div className="flex items-end justify-end sm:col-span-2">
            <Button variant="ghost" size="sm" onClick={() => removeRow(i)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
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

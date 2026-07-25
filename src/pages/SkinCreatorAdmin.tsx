import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Trash2, Upload, Check, X, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminCall, adminLogin, getToken, clearToken, uploadPressAsset } from "@/lib/api";
import {
  fetchCategories, fetchWeapons, renderSkinWithTemplate, downloadCanvasPng,
  type SkinSubmission, type Weapon, type WeaponCategory,
} from "@/lib/skincreator";
import { SkinPreview } from "@/components/SkinPreview";

/** Rebuilds the skin (weapon template plus painted pixels) as a PNG and saves it to disk. */
async function downloadSkin(s: SkinSubmission) {
  try {
    const w = s.weapons?.canvas_width || 64;
    const h = s.weapons?.canvas_height || 32;
    const pixels = Array.isArray(s.pixel_data) ? s.pixel_data : [];
    if (!pixels.length) { toast.error("This submission has no pixel data"); return; }
    const canvas = await renderSkinWithTemplate(s.weapons?.template_image_url, pixels, w, h);
    const name = `${(s.weapons?.name || "skin").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${s.id.slice(0, 8)}.png`;
    await downloadCanvasPng(canvas, name);
  } catch (e) {
    toast.error((e as Error).message || "Download failed");
  }
}


const STATUSES = ["pending", "approved", "rejected"] as const;

export default function SkinCreatorAdmin() {
  const [authed, setAuthed] = useState(!!getToken());
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"weapons" | "submissions">("weapons");

  const login = async () => {
    setBusy(true);
    try { await adminLogin(password); setAuthed(true); setPassword(""); }
    catch (e) { toast.error((e as Error).message || "Login failed"); }
    finally { setBusy(false); }
  };

  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-card p-6">
          <h1 className="font-display text-xl font-bold">Skin Creator Admin</h1>
          <div className="space-y-1.5">
            <Label htmlFor="pw">Password</Label>
            <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} />
          </div>
          <Button className="w-full" onClick={login} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Sign in
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-24 pt-10">
      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to="/skincreator" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-3.5 w-3.5" /> Skin Creator
            </Link>
            <h1 className="mt-3 font-display text-2xl font-bold">Skin Creator Admin</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { clearToken(); setAuthed(false); }}>Sign out</Button>
        </div>

        <div className="mb-6 flex gap-2">
          {(["weapons", "submissions"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-sm border px-3 py-1.5 text-xs uppercase tracking-wider ${tab === t ? "border-primary/60 bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "weapons" ? <WeaponsPanel /> : <SubmissionsPanel />}
      </div>
    </main>
  );
}

function WeaponsPanel() {
  const [categories, setCategories] = useState<WeaponCategory[]>([]);
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [c, w] = await Promise.all([fetchCategories(), fetchWeapons()]);
      setCategories(c); setWeapons(w);
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const addCategory = async () => {
    const name = window.prompt("Category name");
    if (!name) return;
    await adminCall({ op: "upsert", table: "weapon_categories", rows: [{ name, sort_order: categories.length + 1 }] });
    load();
  };

  const addWeapon = () => {
    setWeapons([
      ...weapons,
      { id: "", category_id: categories[0]?.id ?? null, name: "New weapon", template_image_url: "", canvas_width: 64, canvas_height: 32, active: true, sort_order: weapons.length + 1 },
    ]);
  };

  const update = (i: number, patch: Partial<Weapon>) =>
    setWeapons(weapons.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));

  const saveAll = async () => {
    setSaving(true);
    try {
      await adminCall({ op: "upsert", table: "weapons", rows: weapons });
      toast.success("Weapons saved");
      load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  const remove = async (i: number) => {
    const w = weapons[i];
    if (!window.confirm(`Delete "${w.name}"?`)) return;
    if (w.id) await adminCall({ op: "delete", table: "weapons", id: w.id });
    setWeapons(weapons.filter((_, idx) => idx !== i));
  };

  const removeCategory = async (c: WeaponCategory) => {
    if (!window.confirm(`Delete category "${c.name}" and its weapons?`)) return;
    await adminCall({ op: "delete", table: "weapon_categories", id: c.id });
    load();
  };

  const uploadTemplate = async (i: number, file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5 MB"); return; }
    try {
      const url = await uploadPressAsset(file, "weapon_template" as never);
      const img = new Image();
      img.onload = () => update(i, { template_image_url: url, canvas_width: img.naturalWidth, canvas_height: img.naturalHeight });
      img.src = url;
      update(i, { template_image_url: url });
      toast.success("Template uploaded, canvas size auto-detected");
    } catch (e) { toast.error((e as Error).message); }
  };

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider">Categories</h2>
          <Button size="sm" variant="outline" onClick={addCategory}><Plus className="mr-1 h-4 w-4" /> Add</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <span key={c.id} className="flex items-center gap-2 rounded-sm border border-border px-2.5 py-1 text-xs">
              {c.name}
              <button onClick={() => removeCategory(c)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider">Weapons</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={addWeapon}><Plus className="mr-1 h-4 w-4" /> Add weapon</Button>
            <Button size="sm" onClick={saveAll} disabled={saving}>{saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Save all</Button>
          </div>
        </div>

        <div className="space-y-3">
          {weapons.map((w, i) => (
            <div key={w.id || `new-${i}`} className="grid gap-3 rounded-sm border border-border p-3 md:grid-cols-[7rem_minmax(0,1fr)]">
              <div className="flex h-24 items-center justify-center rounded-sm bg-[#111]">
                {w.template_image_url
                  ? <img src={w.template_image_url} alt="" className="max-h-full max-w-full" style={{ imageRendering: "pixelated" }} />
                  : <span className="text-[10px] text-muted-foreground">no template</span>}
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input value={w.name} onChange={(e) => update(i, { name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Category</Label>
                  <select
                    value={w.category_id ?? ""}
                    onChange={(e) => update(i, { category_id: e.target.value || null })}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">-</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Canvas W × H</Label>
                  <div className="flex gap-2">
                    <Input type="number" value={w.canvas_width} onChange={(e) => update(i, { canvas_width: Number(e.target.value) })} />
                    <Input type="number" value={w.canvas_height} onChange={(e) => update(i, { canvas_height: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Template (PNG)</Label>
                  <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:border-primary/60">
                    <Upload className="h-3.5 w-3.5" /> Upload
                    <input type="file" accept="image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadTemplate(i, f); }} />
                  </label>
                </div>
                <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-4">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" checked={w.active} onChange={(e) => update(i, { active: e.target.checked })} /> Active
                  </label>
                  <div className="w-24 space-y-1">
                    <Label className="text-xs">Order</Label>
                    <Input type="number" value={w.sort_order} onChange={(e) => update(i, { sort_order: Number(e.target.value) })} />
                  </div>
                  <Button variant="ghost" size="sm" className="ml-auto text-destructive" onClick={() => remove(i)}>
                    <Trash2 className="mr-1 h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SubmissionsPanel() {
  const [rows, setRows] = useState<SkinSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | (typeof STATUSES)[number]>("pending");

  const load = async () => {
    try {
      const { rows } = await adminCall({ op: "list_skin_submissions" });
      setRows(rows as SkinSubmission[]);
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: string) => {
    await adminCall({ op: "set_skin_status", id, status });
    setRows((r) => r.map((s) => (s.id === id ? { ...s, status } : s)));
  };
  const remove = async (id: string) => {
    if (!window.confirm("Delete this submission?")) return;
    await adminCall({ op: "delete", table: "skin_submissions", id });
    setRows((r) => r.filter((s) => s.id !== id));
  };

  const visible = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["all", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-sm border px-2.5 py-1 text-xs uppercase tracking-wider ${filter === s ? "border-primary/60 bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
          >
            {s} ({s === "all" ? rows.length : rows.filter((r) => r.status === s).length})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No submissions.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((s) => (
            <div key={s.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex gap-3">
                <div className="flex h-24 w-32 shrink-0 items-center justify-center rounded-sm bg-[#111] p-1">
                  {s.weapons && Array.isArray(s.pixel_data) && s.pixel_data.length
                    ? <SkinPreview weapon={{ ...s.weapons, template_image_url: s.weapons.template_image_url ?? "" }} pixels={s.pixel_data} scale={2} />
                    : s.preview_image_url
                      ? <img src={s.preview_image_url} alt="skin" className="max-h-full max-w-full" style={{ imageRendering: "pixelated" }} />
                      : <span className="text-[10px] text-muted-foreground">no preview</span>}
                </div>
                <div className="min-w-0 text-xs">
                  <div className="font-semibold text-foreground">{s.weapons?.name ?? "Unknown weapon"}</div>
                  <div className="text-muted-foreground">{s.player_name || "-"} · <span className="font-mono">{s.discord_name}</span></div>
                  {s.email && <div className="truncate text-muted-foreground">{s.email}</div>}
                  <div className="text-muted-foreground">{new Date(s.created_at).toLocaleString()}</div>
                  <div className="mt-1 inline-block rounded-sm border border-border px-1.5 py-0.5 uppercase tracking-wider text-muted-foreground">{s.status}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setStatus(s.id, "approved")}><Check className="mr-1 h-3.5 w-3.5" /> Approve</Button>
                <Button size="sm" variant="outline" onClick={() => setStatus(s.id, "rejected")}><X className="mr-1 h-3.5 w-3.5" /> Reject</Button>
                <Button size="sm" variant="outline" onClick={() => downloadSkin(s)}>
                  <Download className="mr-1 h-3.5 w-3.5" /> Download PNG
                </Button>

                <Button size="sm" variant="ghost" className="ml-auto text-destructive" onClick={() => remove(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

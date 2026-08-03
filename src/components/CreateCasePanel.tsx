import { useEffect, useState } from "react";
import { Loader2, Trash2, Send, Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SkinPreview } from "@/components/SkinPreview";
import { useSkinT } from "@/lib/skin-i18n";
import {
  loadCaseData, submitCase, deleteCase, RARITIES, rarityInfo,
  MAX_CASE_ITEMS, MIN_CASE_ITEMS,
  type CaseRarity, type CaseSkin, type PlayerCase,
} from "@/lib/skincases";

const STATUS_STYLES: Record<string, string> = {
  pending: "border-amber-500/60 bg-amber-500/10 text-amber-400",
  approved: "border-emerald-500/60 bg-emerald-500/10 text-emerald-400",
  rejected: "border-destructive/60 bg-destructive/10 text-destructive",
};
const STATUS_KEYS: Record<string, string> = {
  pending: "statusPending",
  approved: "statusApproved",
  rejected: "statusRejected",
};

function SkinThumb({ skin, scale = 3 }: { skin: CaseSkin | null; scale?: number }) {
  if (!skin) return null;
  if (skin.weapons && skin.pixel_data?.length) {
    return (
      <SkinPreview
        weapon={{ ...skin.weapons, template_image_url: skin.weapons.template_image_url ?? "" }}
        pixels={skin.pixel_data}
        scale={scale}
      />
    );
  }
  if (skin.preview_image_url) {
    return <img src={skin.preview_image_url} alt="" className="max-h-full max-w-full" style={{ imageRendering: "pixelated" }} />;
  }
  return null;
}

type Selected = { skin: CaseSkin; rarity: CaseRarity };

export function CreateCasePanel() {
  const { t } = useSkinT();
  const [loading, setLoading] = useState(true);
  const [skins, setSkins] = useState<CaseSkin[]>([]);
  const [cases, setCases] = useState<PlayerCase[]>([]);
  const [caseName, setCaseName] = useState("");
  const [selected, setSelected] = useState<Selected[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PlayerCase | null>(null);

  useEffect(() => {
    loadCaseData()
      .then(({ skins, cases }) => { setSkins(skins); setCases(cases); })
      .catch((e) => toast.error((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const addSkin = (skin: CaseSkin) => {
    if (selected.some((s) => s.skin.id === skin.id)) return;
    if (selected.length >= MAX_CASE_ITEMS) { toast.error(t("caseFull")); return; }
    setSelected((s) => [...s, { skin, rarity: "mil_spec" }]);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const id = e.dataTransfer.getData("text/plain");
    const skin = skins.find((s) => s.id === id);
    if (skin) addSkin(skin);
  };

  const submit = async () => {
    if (!caseName.trim()) { toast.error(t("caseNameRequired")); return; }
    setBusy(true);
    try {
      await submitCase(caseName.trim(), selected.map((s) => ({ skin_submission_id: s.skin.id, rarity: s.rarity })));
      toast.success(t("caseSubmitted"));
      setCaseName("");
      setSelected([]);
      const fresh = await loadCaseData();
      setCases(fresh.cases);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      await deleteCase(pendingDelete.id);
      setCases((c) => c.filter((x) => x.id !== pendingDelete.id));
      setPendingDelete(null);
      toast.success(t("caseDeleted"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}…</div>;
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-lg border border-border bg-card p-4">
        <div className="space-y-1.5">
          <Label htmlFor="case-name">{t("caseNameLabel")}</Label>
          <Input
            id="case-name"
            value={caseName}
            maxLength={80}
            placeholder={t("caseNamePlaceholder")}
            onChange={(e) => setCaseName(e.target.value)}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{t("yourApprovedSkins")}</h3>
            {skins.length === 0 ? (
              <p className="rounded-sm border border-border p-4 text-sm text-muted-foreground">{t("caseNoApprovedSkins")}</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {skins.map((s) => {
                  const used = selected.some((x) => x.skin.id === s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      draggable={!used}
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", s.id)}
                      onClick={() => addSkin(s)}
                      disabled={used}
                      className={`rounded-sm border p-2 text-left transition ${used ? "border-border/50 opacity-40" : "cursor-grab border-border hover:border-primary/60"}`}
                    >
                      <div className="flex h-20 items-center justify-center bg-[#111] p-1">
                        <SkinThumb skin={s} scale={2} />
                      </div>
                      <div className="mt-1 truncate text-xs font-medium">{s.skin_name || s.weapons?.name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{s.weapons?.name}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground">{t("caseContents")}</h3>
              <span className="text-xs tabular-nums text-muted-foreground">{selected.length}/{MAX_CASE_ITEMS} {t("skinsWord")}</span>
            </div>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`min-h-[10rem] space-y-2 rounded-sm border border-dashed p-2 ${dragOver ? "border-primary bg-primary/5" : "border-border"}`}
            >
              {selected.length === 0 ? (
                <p className="flex h-32 items-center justify-center text-center text-sm text-muted-foreground">{t("dragSkinsHere")}</p>
              ) : (
                selected.map((item, i) => (
                  <div key={item.skin.id} className="flex items-center gap-3 rounded-sm border border-border bg-background p-2">
                    <div className="flex h-12 w-20 shrink-0 items-center justify-center bg-[#111] p-1">
                      <SkinThumb skin={item.skin} scale={1} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium">{item.skin.skin_name || item.skin.weapons?.name}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: rarityInfo(item.rarity)?.color }} />
                        <select
                          value={item.rarity}
                          onChange={(e) =>
                            setSelected((s) => s.map((x, idx) => (idx === i ? { ...x, rarity: e.target.value as CaseRarity } : x)))
                          }
                          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                        >
                          {RARITIES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setSelected((s) => s.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            <Button className="mt-3 w-full" onClick={submit} disabled={busy || selected.length < MIN_CASE_ITEMS}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {t("submitCase")}
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground">{t("mySubmittedCases")}</h3>
        {cases.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">{t("noCasesYet")}</p>
        ) : (
          <div className="space-y-3">
            {cases.map((c) => (
              <article key={c.id} className="rounded-lg border border-border bg-card p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">{c.case_name}</span>
                  <span className={`rounded-sm border px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${STATUS_STYLES[c.status] ?? "border-border text-muted-foreground"}`}>
                    {STATUS_KEYS[c.status] ? t(STATUS_KEYS[c.status]) : c.status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {c.skin_creator_case_items?.length ?? 0} {t("skinsWord")} · {new Date(c.created_at).toLocaleDateString()}
                  </span>
                  <Button size="sm" variant="ghost" className="ml-auto text-destructive" onClick={() => setPendingDelete(c)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[...(c.skin_creator_case_items ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((it) => (
                    <div key={it.id} className="w-28 rounded-sm border border-border p-1">
                      <div className="flex h-16 items-center justify-center bg-[#111] p-1">
                        <SkinThumb skin={it.skin_submissions} scale={1} />
                      </div>
                      <div className="mt-1 truncate text-[11px]">{it.skin_submissions?.skin_name || it.skin_submissions?.weapons?.name}</div>
                      <div className="flex items-center gap-1 text-[10px]" style={{ color: rarityInfo(it.rarity)?.color }}>
                        <span className="h-2 w-2 rounded-full" style={{ background: rarityInfo(it.rarity)?.color }} />
                        {rarityInfo(it.rarity)?.label ?? it.rarity}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <AlertDialog open={!!pendingDelete}>
        <AlertDialogContent onEscapeKeyDown={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteCaseTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteCaseBody")} {pendingDelete?.case_name ? `"${pendingDelete.case_name}"` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy} onClick={() => setPendingDelete(null)}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDelete(); }} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{t("deleteDraftConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

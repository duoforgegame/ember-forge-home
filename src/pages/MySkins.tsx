import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSkinUser, listMySubmissions, type MySubmission } from "@/lib/skinauth";
import { SkinPreview } from "@/components/SkinPreview";
import { SkinLanguageSwitcher } from "@/components/SkinLanguageSwitcher";
import { useSkinT } from "@/lib/skin-i18n";

const STATUS_STYLES: Record<string, string> = {
  pending: "border-amber-500/60 bg-amber-500/10 text-amber-400",
  approved: "border-emerald-500/60 bg-emerald-500/10 text-emerald-400",
  rejected: "border-destructive/60 bg-destructive/10 text-destructive",
  in_game: "border-primary/60 bg-primary/10 text-primary",
};

const STATUS_KEYS: Record<string, string> = {
  pending: "statusPending",
  approved: "statusApproved",
  rejected: "statusRejected",
  in_game: "statusInGame",
};

export default function MySkins() {
  const { t } = useSkinT();
  const user = getSkinUser();
  const [rows, setRows] = useState<MySubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    listMySubmissions()
      .then(setRows)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-background pb-24 pt-10">
      <div className="mx-auto w-full max-w-5xl px-4">
        <div className="flex items-start justify-between gap-4">
          <Link to="/skincreator" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-3.5 w-3.5" /> {t("skinCreator")}
          </Link>
          <SkinLanguageSwitcher />
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">
          {t("mySkinsTitle1")} <span className="text-primary">{t("mySkinsTitle2")}</span>
        </h1>

        {!user ? (
          <div className="mt-8 rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">{t("signInToSeeSubmissions")}</p>
            <Button asChild className="mt-4"><Link to="/skincreator">{t("goToSkinCreator")}</Link></Button>
          </div>
        ) : loading ? (
          <div className="mt-8 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}…</div>
        ) : error ? (
          <p className="mt-8 text-sm text-destructive">{error}</p>
        ) : rows.length === 0 ? (
          <div className="mt-8 rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">{t("noSubmissionsYet")}</p>
            <Button asChild className="mt-4"><Link to="/skincreator">{t("createFirstSkin")}</Link></Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((s) => (
              <article key={s.id} className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="flex h-36 items-center justify-center bg-[#111] p-3">
                  {s.weapons && s.pixel_data?.length
                    ? <SkinPreview weapon={{ ...s.weapons, template_image_url: s.weapons.template_image_url ?? "" }} pixels={s.pixel_data} scale={4} />
                    : s.preview_image_url
                      ? <img src={s.preview_image_url} alt={`Skin for ${s.weapons?.name ?? "weapon"}`} className="max-h-full max-w-full" style={{ imageRendering: "pixelated" }} />
                      : <span className="text-[11px] text-muted-foreground">{t("noPreview")}</span>}
                </div>

                <div className="space-y-1.5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{s.skin_name || s.weapons?.name || t("unknownWeapon")}</span>
                    <span className={`rounded-sm border px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${STATUS_STYLES[s.status] ?? "border-border text-muted-foreground"}`}>
                      {STATUS_KEYS[s.status] ? t(STATUS_KEYS[s.status]) : s.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

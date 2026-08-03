import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PixelEditor } from "@/components/PixelEditor";
import { SkinAccountBar } from "@/components/SkinAccountBar";
import { SkinPreview } from "@/components/SkinPreview";
import { SkinLanguageSwitcher } from "@/components/SkinLanguageSwitcher";
import { CommunityGallery } from "@/components/CommunityGallery";
import { HowItWorksDialog } from "@/components/HowItWorksDialog";
import { Turnstile, resetTurnstile } from "@/components/Turnstile";
import { useSkinT } from "@/lib/skin-i18n";

import {
  fetchCategories, fetchWeapons, submitSkin, uploadPreviewPng,
  type PixelDatum, type Weapon, type WeaponCategory,
} from "@/lib/skincreator";

type Step = "categories" | "weapons" | "editor" | "submit" | "done";

export default function SkinCreator() {
  const { t } = useSkinT();
  const location = useLocation();
  const resumeDraft = (location.state as { draft?: { id: string; name: string | null; weapon_template_id: string | null; canvas_data: PixelDatum[] | null } } | null)?.draft ?? null;
  const [step, setStep] = useState<Step>("categories");
  const [categories, setCategories] = useState<WeaponCategory[]>([]);
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<WeaponCategory | null>(null);
  const [weapon, setWeapon] = useState<Weapon | null>(null);
  const [result, setResult] = useState<{ dataUrl: string; pixels: PixelDatum[] } | null>(null);
  const [form, setForm] = useState({ skin_name: "", player_name: "", email: "" });
  const [sending, setSending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [draft, setDraft] = useState(resumeDraft);

  useEffect(() => {
    (async () => {
      try {
        const [cats, wps] = await Promise.all([fetchCategories(), fetchWeapons()]);
        setCategories(cats);
        const active = wps.filter((w) => w.active);
        setWeapons(active);
        if (resumeDraft?.weapon_template_id) {
          const target = wps.find((w) => w.id === resumeDraft.weapon_template_id);
          if (target) {
            setCategory(cats.find((c) => c.id === target.category_id) ?? null);
            setWeapon(target);
            setStep("editor");
          }
        }
      } catch (e) {
        toast.error((e as Error).message || t("couldNotLoadWeapons"));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const inCategory = useMemo(
    () => weapons.filter((w) => w.category_id === category?.id),
    [weapons, category],
  );
  const countFor = (id: string) => weapons.filter((w) => w.category_id === id).length;

  const handleSubmit = async () => {
    if (!weapon || !result) return;
    if (!form.skin_name.trim()) { toast.error(t("skinNameRequired")); return; }
    if (!captchaToken) { toast.error(t("completeCaptcha")); return; }
    setSending(true);
    try {
      let previewUrl = "";
      try {
        previewUrl = await uploadPreviewPng(
          result.dataUrl,
          `${weapon.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}.png`,
        );
      } catch (e) {
        toast.error(`${t("previewUploadFailed")}: ${(e as Error).message}. ${t("savingAnyway")}`);
      }
      await submitSkin({
        weapon_id: weapon.id,
        pixel_data: result.pixels,
        preview_image_url: previewUrl,
        skin_name: form.skin_name,
        player_name: form.player_name,
        email: form.email,
        turnstile_token: captchaToken,
      });
      setStep("done");
    } catch (e) {
      // Turnstile tokens are single use, hand the user a fresh one for the retry.
      setCaptchaToken("");
      resetTurnstile();
      toast.error((e as Error).message || t("submissionFailed"));
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-background pb-24 pt-10">
      <div className="mx-auto w-full max-w-6xl px-4">
        <header className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <Link to="/" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-3.5 w-3.5" /> {t("backToSite")}
            </Link>
            <div className="flex items-center gap-2">
              <HowItWorksDialog />
              <SkinLanguageSwitcher />
            </div>
          </div>

          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t("title1")} <span className="text-primary">{t("title2")}</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("intro")}</p>

        </header>

        <SkinAccountBar />


        {/* Stepper */}
        <ol className="mb-8 flex flex-wrap gap-2 text-[11px] uppercase tracking-wider">
          {(["categories", "weapons", "editor", "submit"] as Step[]).map((s, i) => {
            const order: Step[] = ["categories", "weapons", "editor", "submit"];
            const current = order.indexOf(step === "done" ? "submit" : step);
            const active = i <= current;
            return (
              <li key={s} className={`rounded-sm border px-2.5 py-1 ${active ? "border-primary/60 bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                {i + 1}. {s === "categories" ? t("stepCategory") : s === "weapons" ? t("stepWeapon") : s === "editor" ? t("stepDesign") : t("stepSubmit")}
              </li>
            );
          })}
        </ol>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}…</div>
        ) : step === "categories" ? (
          categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noCategories")}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setCategory(c); setStep("weapons"); }}
                  className="group rounded-lg border border-border bg-card p-5 text-left transition-colors hover:border-primary/60"
                >
                  <div className="font-display text-lg font-semibold group-hover:text-primary">{c.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {countFor(c.id)} {countFor(c.id) === 1 ? t("weaponCountOne") : t("weaponCountMany")}
                  </div>
                </button>
              ))}
            </div>
          )
        ) : step === "weapons" ? (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setStep("categories")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> {category?.name}
            </Button>
            {inCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noWeapons")}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {inCategory.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => { setDraft(null); setResult(null); setWeapon(w); setStep("editor"); }}
                    className="group overflow-hidden rounded-lg border border-border bg-card text-left transition-colors hover:border-primary/60"
                  >
                    <div className="flex h-32 items-center justify-center bg-[#111] p-3">
                      {w.template_image_url ? (
                        <img src={w.template_image_url} alt={w.name} className="max-h-full max-w-full" style={{ imageRendering: "pixelated" }} />
                      ) : (
                        <Sparkles className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="p-3">
                      <div className="text-sm font-semibold group-hover:text-primary">{w.name}</div>
                      <div className="text-xs text-muted-foreground">{w.canvas_width}×{w.canvas_height} px</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : step === "editor" && weapon ? (
          <PixelEditor
            key={draft?.id ?? weapon.id}
            weapon={weapon}
            initialPixels={draft?.weapon_template_id === weapon.id ? draft?.canvas_data ?? null : result?.pixels ?? null}
            initialDraftId={draft?.weapon_template_id === weapon.id ? draft?.id ?? null : null}
            initialDraftName={draft?.weapon_template_id === weapon.id ? draft?.name ?? null : null}
            onBack={() => { setDraft(null); setStep("weapons"); }}
            onFinish={(r) => { setResult(r); setStep("submit"); }}
          />

        ) : step === "submit" && weapon && result ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">{t("preview")}</div>
              <div className="flex items-center justify-center overflow-auto rounded-sm bg-[#111] p-6">
                <SkinPreview weapon={weapon} pixels={result.pixels} scale={6} />
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                {weapon.name} · {result.pixels.length} {t("paintedPixels")}
              </div>

              <Button variant="ghost" size="sm" className="mt-3" onClick={() => setStep("editor")}>
                <ArrowLeft className="mr-2 h-4 w-4" /> {t("keepEditing")}
              </Button>
            </div>

            <div className="space-y-4 rounded-lg border border-border bg-card p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("yourDetails")}</div>
              <div className="space-y-1.5">
                <Label htmlFor="sc-skin-name">{t("skinNameLabel")}</Label>
                <Input id="sc-skin-name" value={form.skin_name} maxLength={80} onChange={(e) => setForm({ ...form, skin_name: e.target.value })} placeholder={t("skinNamePlaceholder")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sc-player">{t("yourNameLabel")}</Label>
                <Input id="sc-player" value={form.player_name} maxLength={80} onChange={(e) => setForm({ ...form, player_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sc-email">{t("emailLabel")}</Label>
                <Input id="sc-email" type="email" value={form.email} maxLength={255} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="pt-1">
                <Turnstile onToken={setCaptchaToken} />
              </div>
              <Button onClick={handleSubmit} disabled={sending || !form.skin_name.trim() || !captchaToken} className="w-full">
                {sending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("submitting")}…</> : t("submitSkin")}
              </Button>
              <p className="text-[11px] text-muted-foreground">{t("submitConsent")}</p>
            </div>
          </div>
        ) : step === "done" ? (
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-8 text-center">
            <h2 className="font-display text-2xl font-bold">{t("doneTitle")}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t("doneBody")}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => { setResult(null); setWeapon(null); setStep("categories"); setForm({ skin_name: "", player_name: form.player_name, email: form.email }); }}
              >
                {t("createAnother")}
              </Button>
              <Button asChild><Link to="/">{t("backToSiteBtn")}</Link></Button>
            </div>
          </div>
        ) : null}

        <CommunityGallery />
      </div>

    </main>
  );
}

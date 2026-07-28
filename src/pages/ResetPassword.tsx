import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmPasswordReset } from "@/lib/skinauth";
import { SkinLanguageSwitcher } from "@/components/SkinLanguageSwitcher";
import { useSkinT } from "@/lib/skin-i18n";

export default function ResetPassword() {
  const { t } = useSkinT();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (password.length < 8) { toast.error(t("passwordTooShort")); return; }
    if (password !== confirm) { toast.error(t("passwordsNoMatch")); return; }
    setBusy(true);
    try {
      await confirmPasswordReset(token, password);
      setDone(true);
    } catch (e) {
      toast.error((e as Error).message || t("linkInvalid"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-background pb-24 pt-10">
      <div className="mx-auto w-full max-w-md px-4">
        <div className="flex items-start justify-between gap-4">
          <Link to="/skincreator" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-3.5 w-3.5" /> {t("skinCreator")}
          </Link>
          <SkinLanguageSwitcher />
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">
          {t("newPassword1")} <span className="text-primary">{t("newPassword2")}</span>
        </h1>

        <div className="mt-6 space-y-4 rounded-lg border border-border bg-card p-5">
          {!token ? (
            <p className="text-sm text-destructive">{t("linkInvalid")}</p>
          ) : done ? (
            <>
              <p className="text-sm text-muted-foreground">{t("passwordChanged")}</p>
              <Button asChild className="w-full"><Link to="/skincreator">{t("goToSkinCreator")}</Link></Button>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="rp-pass">{t("newPasswordLabel")}</Label>
                <Input id="rp-pass" type="password" value={password} maxLength={200} autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rp-confirm">{t("confirmPassword")}</Label>
                <Input
                  id="rp-confirm" type="password" value={confirm} maxLength={200} autoComplete="new-password"
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
              </div>
              <Button className="w-full" onClick={submit} disabled={busy || !password || !confirm}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {t("savePassword")}
              </Button>
              <p className="text-[11px] text-muted-foreground">{t("resetLinkNote")}</p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, LogIn, LogOut, UserPlus, Images } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getSkinUser, requestPasswordReset, skinLogin, skinLogout, skinRegister, type SkinUser } from "@/lib/skinauth";
import { useSkinT } from "@/lib/skin-i18n";

type Mode = "login" | "register" | "forgot" | null;

export function SkinAccountBar({ onUserChange }: { onUserChange?: (u: SkinUser | null) => void }) {
  const { t } = useSkinT();
  const [user, setUser] = useState<SkinUser | null>(() => getSkinUser());
  const [mode, setMode] = useState<Mode>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const apply = (u: SkinUser | null) => { setUser(u); onUserChange?.(u); };

  const close = () => { setMode(null); setPassword(""); setConfirm(""); setResetSent(false); };

  const submit = async () => {
    if (mode === "register" && password !== confirm) { toast.error(t("passwordsNoMatch")); return; }
    setBusy(true);
    try {
      const u = mode === "register"
        ? await skinRegister(username.trim(), password, email.trim() || undefined)
        : await skinLogin(username.trim(), password);
      apply(u);
      toast.success(mode === "register" ? `${t("accountCreated")}, ${u.username}!` : `${t("welcomeBack")}, ${u.username}!`);
      close();
    } catch (e) {
      toast.error((e as Error).message || t("somethingWrong"));
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async () => {
    setBusy(true);
    try {
      await requestPasswordReset(identifier.trim());
      setResetSent(true);
    } catch (e) {
      toast.error((e as Error).message || t("somethingWrong"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card/60 p-3 text-sm">
        {user ? (
          <>
            <span className="text-muted-foreground">
              {t("signedInAs")} <span className="font-semibold text-foreground">{user.username}</span>
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link to="/skincreator/my-skins"><Images className="mr-1.5 h-3.5 w-3.5" /> {t("mySkins")}</Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { skinLogout(); apply(null); }}>
                <LogOut className="mr-1.5 h-3.5 w-3.5" /> {t("signOut")}
              </Button>
            </div>
          </>
        ) : (
          <>
            <span className="text-muted-foreground">
              {t("guestLine1")} <span className="font-semibold text-foreground">{t("guestAsGuest")}</span>
              {t("guestLine2")}
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setMode("login")}>
                <LogIn className="mr-1.5 h-3.5 w-3.5" /> {t("signIn")}
              </Button>
              <Button size="sm" onClick={() => setMode("register")}>
                <UserPlus className="mr-1.5 h-3.5 w-3.5" /> {t("createAccount")}
              </Button>
            </div>
          </>
        )}
      </div>

      <Dialog open={mode !== null} onOpenChange={(o) => (o ? null : close())}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {mode === "register" ? t("createAccount") : mode === "forgot" ? t("forgotPassword") : t("signIn")}
            </DialogTitle>
            <DialogDescription>
              {resetSent
                ? t("resetSentShort")
                : mode === "forgot"
                ? t("resetDescription")
                : t("signInDescription")}
            </DialogDescription>
          </DialogHeader>

          {mode === "forgot" ? (
            <div className="space-y-3">
              {resetSent ? (
                <>
                  <p className="text-sm text-muted-foreground">{t("resetSentLong")}</p>
                  <Button className="w-full" variant="outline" onClick={() => { setResetSent(false); setMode("login"); }}>
                    {t("backToSignIn")}
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="sa-ident">{t("usernameOrEmail")}</Label>
                    <Input
                      id="sa-ident" value={identifier} maxLength={255}
                      onChange={(e) => setIdentifier(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && identifier.trim() && sendReset()}
                    />
                  </div>
                  <Button className="w-full" onClick={sendReset} disabled={busy || !identifier.trim()}>
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {t("sendResetLink")}
                  </Button>
                  <button className="w-full text-center text-xs text-muted-foreground hover:text-primary" onClick={() => setMode("login")}>
                    {t("backToSignIn")}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="sa-user">{t("username")}</Label>
                <Input id="sa-user" value={username} maxLength={24} autoComplete="username" onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sa-pass">{t("password")}</Label>
                <Input
                  id="sa-pass" type="password" value={password} maxLength={200}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && mode !== "register") submit(); }}
                />
              </div>
              {mode === "register" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="sa-confirm">{t("confirmPassword")}</Label>
                    <Input id="sa-confirm" type="password" value={confirm} maxLength={200} autoComplete="new-password" onChange={(e) => setConfirm(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sa-email">{t("emailOptionalReset")}</Label>
                    <Input
                      id="sa-email" type="email" value={email} maxLength={255} autoComplete="email"
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submit()}
                    />
                    <p className="text-[11px] text-muted-foreground">{t("noEmailWarning")}</p>
                  </div>
                </>
              )}
              <Button className="w-full" onClick={submit} disabled={busy || !username.trim() || !password}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {mode === "register" ? t("createAccount") : t("signIn")}
              </Button>
              {mode === "login" && (
                <button className="w-full text-center text-xs text-muted-foreground hover:text-primary" onClick={() => setMode("forgot")}>
                  {t("forgotPassword")}
                </button>
              )}
              <button
                className="w-full text-center text-xs text-muted-foreground hover:text-primary"
                onClick={() => setMode(mode === "register" ? "login" : "register")}
              >
                {mode === "register" ? t("haveAccount") : t("noAccountYet")}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, LogIn, LogOut, UserPlus, Images } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getSkinUser, requestPasswordReset, skinLogin, skinLogout, skinRegister, type SkinUser } from "@/lib/skinauth";

type Mode = "login" | "register" | "forgot" | null;

export function SkinAccountBar({ onUserChange }: { onUserChange?: (u: SkinUser | null) => void }) {
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
    if (mode === "register" && password !== confirm) { toast.error("Passwords do not match"); return; }
    setBusy(true);
    try {
      const u = mode === "register"
        ? await skinRegister(username.trim(), password, email.trim() || undefined)
        : await skinLogin(username.trim(), password);
      apply(u);
      toast.success(mode === "register" ? `Account created — welcome, ${u.username}!` : `Welcome back, ${u.username}!`);
      close();
    } catch (e) {
      toast.error((e as Error).message || "Something went wrong");
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
      toast.error((e as Error).message || "Something went wrong");
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
              Signed in as <span className="font-semibold text-foreground">{user.username}</span>
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link to="/skincreator/my-skins"><Images className="mr-1.5 h-3.5 w-3.5" /> My skins</Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { skinLogout(); apply(null); }}>
                <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign out
              </Button>
            </div>
          </>
        ) : (
          <>
            <span className="text-muted-foreground">
              You are creating <span className="font-semibold text-foreground">as a guest</span> — no account needed.
              Create one to track the status of your submissions.
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setMode("login")}>
                <LogIn className="mr-1.5 h-3.5 w-3.5" /> Sign in
              </Button>
              <Button size="sm" onClick={() => setMode("register")}>
                <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Create account
              </Button>
            </div>
          </>
        )}
      </div>

      <Dialog open={mode !== null} onOpenChange={(o) => (o ? null : close())}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {mode === "register" ? "Create account" : mode === "forgot" ? "Passwort vergessen?" : "Sign in"}
            </DialogTitle>
            <DialogDescription>
              {mode === "forgot"
                ? "Gib deinen Username oder deine E-Mail ein — wir schicken dir einen Reset-Link, falls eine E-Mail hinterlegt ist."
                : "No email required — just a username and password so you can follow your submissions."}
            </DialogDescription>
          </DialogHeader>

          {mode === "forgot" ? (
            <div className="space-y-3">
              {resetSent ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Falls ein Account mit einer hinterlegten E-Mail existiert, ist der Reset-Link jetzt unterwegs.
                    Der Link ist 1 Stunde gültig.
                  </p>
                  <Button className="w-full" variant="outline" onClick={() => { setResetSent(false); setMode("login"); }}>
                    Zurück zum Login
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="sa-ident">Username oder E-Mail</Label>
                    <Input
                      id="sa-ident" value={identifier} maxLength={255}
                      onChange={(e) => setIdentifier(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && identifier.trim() && sendReset()}
                    />
                  </div>
                  <Button className="w-full" onClick={sendReset} disabled={busy || !identifier.trim()}>
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Reset-Link senden
                  </Button>
                  <button className="w-full text-center text-xs text-muted-foreground hover:text-primary" onClick={() => setMode("login")}>
                    Zurück zum Login
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="sa-user">Username</Label>
                <Input id="sa-user" value={username} maxLength={24} autoComplete="username" onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sa-pass">Password</Label>
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
                    <Label htmlFor="sa-confirm">Confirm password</Label>
                    <Input id="sa-confirm" type="password" value={confirm} maxLength={200} autoComplete="new-password" onChange={(e) => setConfirm(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sa-email">E-Mail (optional, für Passwort-Reset)</Label>
                    <Input
                      id="sa-email" type="email" value={email} maxLength={255} autoComplete="email"
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submit()}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Ohne E-Mail kann dein Passwort bei Verlust nicht zurückgesetzt werden.
                    </p>
                  </div>
                </>
              )}
              <Button className="w-full" onClick={submit} disabled={busy || !username.trim() || !password}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {mode === "register" ? "Create account" : "Sign in"}
              </Button>
              {mode === "login" && (
                <button className="w-full text-center text-xs text-muted-foreground hover:text-primary" onClick={() => setMode("forgot")}>
                  Passwort vergessen?
                </button>
              )}
              <button
                className="w-full text-center text-xs text-muted-foreground hover:text-primary"
                onClick={() => setMode(mode === "register" ? "login" : "register")}
              >
                {mode === "register" ? "Already have an account? Sign in" : "No account yet? Create one"}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

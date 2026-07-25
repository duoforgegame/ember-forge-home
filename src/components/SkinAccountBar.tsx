import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, LogIn, LogOut, UserPlus, Images } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getSkinUser, skinLogin, skinLogout, skinRegister, type SkinUser } from "@/lib/skinauth";

type Mode = "login" | "register" | null;

export function SkinAccountBar({ onUserChange }: { onUserChange?: (u: SkinUser | null) => void }) {
  const [user, setUser] = useState<SkinUser | null>(() => getSkinUser());
  const [mode, setMode] = useState<Mode>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const apply = (u: SkinUser | null) => { setUser(u); onUserChange?.(u); };

  const close = () => { setMode(null); setPassword(""); setConfirm(""); };

  const submit = async () => {
    if (mode === "register" && password !== confirm) { toast.error("Passwords do not match"); return; }
    setBusy(true);
    try {
      const u = mode === "register" ? await skinRegister(username.trim(), password) : await skinLogin(username.trim(), password);
      apply(u);
      toast.success(mode === "register" ? `Account created — welcome, ${u.username}!` : `Welcome back, ${u.username}!`);
      close();
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
            <DialogTitle>{mode === "register" ? "Create account" : "Sign in"}</DialogTitle>
            <DialogDescription>
              No email required — just a username and password so you can follow your submissions.
            </DialogDescription>
          </DialogHeader>
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
              <div className="space-y-1.5">
                <Label htmlFor="sa-confirm">Confirm password</Label>
                <Input id="sa-confirm" type="password" value={confirm} maxLength={200} autoComplete="new-password" onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
              </div>
            )}
            <Button className="w-full" onClick={submit} disabled={busy || !username.trim() || !password}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {mode === "register" ? "Create account" : "Sign in"}
            </Button>
            <button
              className="w-full text-center text-xs text-muted-foreground hover:text-primary"
              onClick={() => setMode(mode === "register" ? "login" : "register")}
            >
              {mode === "register" ? "Already have an account? Sign in" : "No account yet? Create one"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

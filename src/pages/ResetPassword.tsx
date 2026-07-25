import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmPasswordReset } from "@/lib/skinauth";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    setBusy(true);
    try {
      await confirmPasswordReset(token, password);
      setDone(true);
    } catch (e) {
      toast.error((e as Error).message || "Link invalid or expired");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-background pb-24 pt-10">
      <div className="mx-auto w-full max-w-md px-4">
        <Link to="/skincreator" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" /> Skin Creator
        </Link>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">
          New <span className="text-primary">password</span>
        </h1>

        <div className="mt-6 space-y-4 rounded-lg border border-border bg-card p-5">
          {!token ? (
            <p className="text-sm text-destructive">Link invalid or expired.</p>
          ) : done ? (
            <>
              <p className="text-sm text-muted-foreground">
                Your password has been changed. You can now sign in to the Skin Creator with the new password.
              </p>
              <Button asChild className="w-full"><Link to="/skincreator">Go to Skin Creator</Link></Button>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="rp-pass">New password</Label>
                <Input id="rp-pass" type="password" value={password} maxLength={200} autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rp-confirm">Confirm password</Label>
                <Input
                  id="rp-confirm" type="password" value={confirm} maxLength={200} autoComplete="new-password"
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
              </div>
              <Button className="w-full" onClick={submit} disabled={busy || !password || !confirm}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Save password
              </Button>
              <p className="text-[11px] text-muted-foreground">The reset link is valid for 1 hour and can only be used once.</p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

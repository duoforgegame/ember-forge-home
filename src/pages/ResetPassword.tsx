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
    if (password.length < 8) { toast.error("Das Passwort muss mindestens 8 Zeichen haben"); return; }
    if (password !== confirm) { toast.error("Die Passwörter stimmen nicht überein"); return; }
    setBusy(true);
    try {
      await confirmPasswordReset(token, password);
      setDone(true);
    } catch (e) {
      toast.error((e as Error).message || "Link ungültig oder abgelaufen");
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
          Neues <span className="text-primary">Passwort</span>
        </h1>

        <div className="mt-6 space-y-4 rounded-lg border border-border bg-card p-5">
          {!token ? (
            <p className="text-sm text-destructive">Link ungültig oder abgelaufen.</p>
          ) : done ? (
            <>
              <p className="text-sm text-muted-foreground">
                Dein Passwort wurde geändert. Du kannst dich jetzt im Skin Creator mit dem neuen Passwort anmelden.
              </p>
              <Button asChild className="w-full"><Link to="/skincreator">Zum Skin Creator</Link></Button>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="rp-pass">Neues Passwort</Label>
                <Input id="rp-pass" type="password" value={password} maxLength={200} autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rp-confirm">Passwort bestätigen</Label>
                <Input
                  id="rp-confirm" type="password" value={confirm} maxLength={200} autoComplete="new-password"
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
              </div>
              <Button className="w-full" onClick={submit} disabled={busy || !password || !confirm}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Passwort speichern
              </Button>
              <p className="text-[11px] text-muted-foreground">Der Reset-Link ist 1 Stunde gültig und kann nur einmal verwendet werden.</p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

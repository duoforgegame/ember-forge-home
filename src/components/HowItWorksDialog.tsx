import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSkinT } from "@/lib/skin-i18n";

export function HowItWorksDialog() {
  const [open, setOpen] = useState(false);
  const { t } = useSkinT();

  const steps = [1, 2, 3, 4, 5].map((n) => ({
    title: t(`hiwStep${n}Title`),
    body: t(`hiwStep${n}Body`),
  }));

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <HelpCircle className="mr-2 h-4 w-4" /> {t("howItWorks")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("hiwTitle")}</DialogTitle>
            <DialogDescription>{t("hiwDescription")}</DialogDescription>
          </DialogHeader>

          <ol className="space-y-4">
            {steps.map((s) => (
              <li key={s.title}>
                <div className="text-sm font-semibold text-primary">{s.title}</div>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>

          <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
            <div className="text-sm font-semibold">{t("hiwGoodToKnow")}</div>
            <p className="mt-1 text-sm text-muted-foreground">{t("hiwGoodToKnowBody")}</p>
          </div>

          <div className="rounded-md border border-border bg-muted/30 p-3">
            <div className="text-sm font-semibold">{t("hiwAccountTitle")}</div>
            <p className="mt-1 text-sm text-muted-foreground">{t("hiwAccountBody")}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

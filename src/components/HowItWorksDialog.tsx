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

const STEPS: { title: string; body: string }[] = [
  {
    title: "1. Pick a category",
    body: "Start by choosing a weapon category, for example Assault Rifles or Knifes.",
  },
  {
    title: "2. Choose a weapon",
    body: "Every weapon has its own canvas size and template. The template shape is what you will paint on.",
  },
  {
    title: "3. Design your skin",
    body: "Use the brush, eraser, bucket fill and color picker to paint. You can only paint inside the weapon shape, the bucket fill stops at the template's color regions. Adjust brush size and opacity, and use undo if something goes wrong. You can download your artwork as a transparent PNG at any time.",
  },
  {
    title: "4. Submit",
    body: "Give your skin a name, add your in-game or artist name and your Discord name so we can reach you. An email is optional. Then send it to the team.",
  },
  {
    title: "5. Review",
    body: "Our team reviews every submission. If you created an account, you can follow the status of your skins under My Skins. Approved skins appear in the Community Gallery at the bottom of this page.",
  },
];

export function HowItWorksDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <HelpCircle className="mr-2 h-4 w-4" /> How it works
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>How the Skin Creator works</DialogTitle>
            <DialogDescription>
              A short guide from your first pixel to the Community Gallery.
            </DialogDescription>
          </DialogHeader>

          <ol className="space-y-4">
            {STEPS.map((s) => (
              <li key={s.title}>
                <div className="text-sm font-semibold text-primary">{s.title}</div>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>

          <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
            <div className="text-sm font-semibold">Good to know</div>
            <p className="mt-1 text-sm text-muted-foreground">
              An approved skin does not automatically make it into the game. Approval means your
              submission passed our review and can be shown in the Community Gallery. Which skins are
              actually added to Unboxed depends on the game's art direction, balance and technical
              requirements, so only a part of the approved skins will end up in the game.
            </p>
          </div>

          <div className="rounded-md border border-border bg-muted/30 p-3">
            <div className="text-sm font-semibold">Account or guest</div>
            <p className="mt-1 text-sm text-muted-foreground">
              You can submit as a guest without signing up. With a free account (username and
              password, email optional) you can track your submissions and their status.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

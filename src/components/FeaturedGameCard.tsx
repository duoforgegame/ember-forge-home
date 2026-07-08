import { ImageIcon } from "lucide-react";

export type FeaturedGameView = {
  headline: string;
  description: string;
  imageUrl: string;
  steamAppId: string;
};

function sanitizeAppId(raw: string): string {
  return String(raw || "").replace(/[^0-9]/g, "");
}

export function FeaturedGameCard({ value }: { value: FeaturedGameView }) {
  const appId = sanitizeAppId(value.steamAppId);
  const hasImage = !!value.imageUrl;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/40 bg-card shadow-glow">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, oklch(0.68 0.17 45 / 0.35), transparent 55%), radial-gradient(circle at 85% 90%, oklch(0.78 0.18 55 / 0.25), transparent 60%)",
        }}
      />
      <div className="relative grid gap-0 lg:grid-cols-[1.1fr,1fr]">
        <div className="relative aspect-video w-full overflow-hidden bg-surface-2 lg:aspect-auto lg:min-h-[24rem]">
          {hasImage ? (
            <img
              src={value.imageUrl}
              alt={value.headline || "Featured game"}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted-foreground">
              <ImageIcon className="h-10 w-10" />
            </div>
          )}
          <span className="absolute left-4 top-4 rounded-md border border-primary/50 bg-background/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary backdrop-blur-sm">
            Featured Game
          </span>
        </div>
        <div className="flex flex-col justify-center gap-5 p-6 sm:p-8 lg:p-10">
          <div>
            <h3 className="font-display text-2xl font-black uppercase tracking-wide sm:text-3xl lg:text-4xl">
              {value.headline || "Untitled"}
            </h3>
            <span className="mt-3 block h-1 w-16 rounded-full bg-primary shadow-glow-sm" />
          </div>
          {value.description && (
            <p className="text-base leading-relaxed text-muted-foreground">{value.description}</p>
          )}
          {appId ? (
            <div className="overflow-hidden rounded-lg border border-border bg-surface-2/60">
              <iframe
                src={`https://store.steampowered.com/widget/${appId}/`}
                title={`Steam widget ${appId}`}
                frameBorder={0}
                className="w-full"
                style={{ height: 190 }}
              />
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-border bg-background/40 px-3 py-2 text-xs text-muted-foreground">
              Add a Steam App ID to show the Steam widget here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

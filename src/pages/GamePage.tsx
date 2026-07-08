import { useEffect, useMemo, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, X, Check } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/api";

type Project = { id: string; title: string; cover_url: string; more_info_enabled: boolean };
type Block = {
  id: string;
  project_id: string;
  block_type: string;
  sort_order: number;
  visible: boolean;
  content: any;
};

function toEmbedUrl(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (u.hostname === "youtu.be") return `https://www.youtube.com/embed${u.pathname}`;
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {}
  return null;
}

function safeColor(c: any, fallback = "transparent"): string {
  if (typeof c !== "string") return fallback;
  const t = c.trim();
  if (!t) return fallback;
  return t;
}

export default function GamePage() {
  const { slug = "" } = useParams();
  const [lightbox, setLightbox] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["game-page", slug],
    queryFn: async () => {
      const { data: projects } = await supabase
        .from("site_projects")
        .select("id, title, cover_url, more_info_enabled");
      const project = ((projects ?? []) as Project[]).find((p) => slugify(p.title) === slug);
      if (!project) return { project: null, blocks: [] as Block[] };
      const { data: blocks } = await supabase
        .from("site_game_page_blocks")
        .select("*")
        .eq("project_id", project.id)
        .eq("visible", true)
        .order("sort_order");
      return { project, blocks: (blocks ?? []) as Block[] };
    },
  });

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLightbox(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  if (isLoading) {
    return (
      <div className="relative min-h-screen">
        <Header />
        <main className="mx-auto max-w-5xl px-4 pt-32 pb-16 sm:px-6">
          <div className="h-8 w-48 animate-pulse rounded-md bg-surface-2" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !data?.project) return <Navigate to="/" replace />;
  if (!data.project.more_info_enabled) return <Navigate to="/" replace />;

  const { project, blocks } = data;

  return (
    <div className="relative min-h-screen">
      <Header />
      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Link to="/#projects" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to projects
          </Link>
        </div>

        {blocks.length === 0 && (
          <div className="mx-auto mt-10 max-w-3xl px-4 text-center text-muted-foreground sm:px-6">
            <h1 className="font-display text-3xl font-black uppercase tracking-wide text-foreground">{project.title}</h1>
            <p className="mt-4">No content has been added to this page yet.</p>
          </div>
        )}

        <div className="mt-6 flex flex-col">
          {blocks.map((b) => (
            <BlockRenderer key={b.id} block={b} projectTitle={project.title} onZoom={setLightbox} />
          ))}
        </div>
      </main>
      <Footer />

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[70] grid place-items-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 rounded-md bg-black/60 p-2 text-white hover:bg-black"
          >
            <X className="h-5 w-5" />
          </button>
          <img src={lightbox} alt="" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  );
}

function BlockRenderer({ block, projectTitle, onZoom }: { block: Block; projectTitle: string; onZoom: (url: string) => void }) {
  const c = block.content || {};
  const bg = safeColor(c.background_color, "transparent");

  switch (block.block_type) {
    case "hero": {
      const overlay = safeColor(c.overlay_color, "#000000");
      const opacity = typeof c.overlay_opacity === "number" ? Math.max(0, Math.min(1, c.overlay_opacity)) : 0.5;
      return (
        <section className="relative overflow-hidden" style={{ backgroundColor: bg }}>
          <div className="relative min-h-[60vh] w-full">
            {c.image_url && (
              <img src={c.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
            <div className="absolute inset-0" style={{ backgroundColor: overlay, opacity }} />
            <div className="relative mx-auto flex min-h-[60vh] max-w-5xl flex-col items-center justify-center px-6 py-24 text-center">
              {c.title && <h1 className="font-display text-4xl font-black uppercase tracking-wide text-white sm:text-6xl">{c.title}</h1>}
              {c.subtitle && <p className="mt-4 max-w-2xl text-lg text-white/85">{c.subtitle}</p>}
              {c.cta_label && c.cta_url && (
                <Button asChild className="mt-8 bg-primary font-semibold text-primary-foreground hover:bg-primary-glow hover:shadow-glow-sm">
                  <a href={c.cta_url} target="_blank" rel="noopener noreferrer">{c.cta_label}</a>
                </Button>
              )}
            </div>
          </div>
        </section>
      );
    }

    case "text": {
      const layout = c.image_position === "left" || c.image_position === "right" ? c.image_position : "none";
      const hasImage = !!c.image_url && layout !== "none";
      return (
        <section className="w-full" style={{ backgroundColor: bg }}>
          <div className="mx-auto max-w-5xl px-6 py-14">
            <div className={`grid gap-8 ${hasImage ? "md:grid-cols-2 md:items-center" : ""}`}>
              {hasImage && layout === "left" && (
                <img src={c.image_url} alt="" className="w-full rounded-xl object-cover" />
              )}
              <div>
                {c.heading && <h2 className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">{c.heading}</h2>}
                {c.heading && <span className="mt-2 mb-4 block h-1 w-14 rounded-full bg-primary shadow-glow-sm" />}
                {c.body && <div className="whitespace-pre-line text-base leading-relaxed text-muted-foreground">{c.body}</div>}
              </div>
              {hasImage && layout === "right" && (
                <img src={c.image_url} alt="" className="w-full rounded-xl object-cover" />
              )}
            </div>
          </div>
        </section>
      );
    }

    case "gallery": {
      const images: string[] = Array.isArray(c.images)
        ? c.images.filter((u: any) => typeof u === "string" && u.trim() !== "")
        : [];
      if (images.length === 0) return null;
      return (
        <section className="w-full" style={{ backgroundColor: bg }}>
          <div className="mx-auto max-w-6xl px-6 py-14">
            {c.heading && (
              <>
                <h2 className="font-display text-2xl font-bold uppercase tracking-wide">{c.heading}</h2>
                <span className="mt-2 mb-6 block h-1 w-14 rounded-full bg-primary shadow-glow-sm" />
              </>
            )}
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {images.map((url, i) => (
                <button
                  key={`${url}-${i}`}
                  type="button"
                  onClick={() => onZoom(url)}
                  className="group relative aspect-video overflow-hidden rounded-lg border border-border bg-surface-2"
                >
                  <img src={url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                </button>
              ))}
            </div>
          </div>
        </section>
      );
    }

    case "free_image": {
      if (!c.image_url) return null;
      const sizeMap: Record<string, string> = {
        small: "max-w-md",
        medium: "max-w-2xl",
        large: "max-w-4xl",
        full: "max-w-none",
      };
      const cls = sizeMap[c.size as string] ?? "max-w-3xl";
      const zoomable = c.zoomable !== false;
      return (
        <section className="w-full" style={{ backgroundColor: bg }}>
          <div className="mx-auto max-w-6xl px-6 py-14">
            <div className={`mx-auto ${cls}`}>
              {zoomable ? (
                <button
                  type="button"
                  onClick={() => onZoom(c.image_url)}
                  className="group block w-full overflow-hidden rounded-xl border border-border bg-surface-2"
                >
                  <img src={c.image_url} alt={c.caption || ""} className="h-auto w-full transition-transform group-hover:scale-[1.01]" />
                </button>
              ) : (
                <img src={c.image_url} alt={c.caption || ""} className="h-auto w-full rounded-xl border border-border bg-surface-2" />
              )}
              {c.caption && (
                <p className="mt-3 text-center text-sm text-muted-foreground">{c.caption}</p>
              )}
            </div>
          </div>
        </section>
      );
    }

    case "steam": {
      const appId = String(c.app_id || "").replace(/[^0-9]/g, "");
      if (!appId) return null;
      const src = `https://store.steampowered.com/widget/${appId}/`;
      return (
        <section className="w-full" style={{ backgroundColor: bg }}>
          <div className="mx-auto max-w-3xl px-6 py-14">
            <iframe
              src={src}
              title={`Steam widget ${appId}`}
              frameBorder={0}
              className="w-full"
              style={{ height: 190 }}
            />
          </div>
        </section>
      );
    }

    case "features": {
      const items: any[] = Array.isArray(c.items) ? c.items : [];
      const validItems = items.filter((it) => it && (it.title || it.description));
      if (validItems.length === 0) return null;
      const cols = c.columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 md:grid-cols-3";
      return (
        <section className="w-full" style={{ backgroundColor: bg }}>
          <div className="mx-auto max-w-6xl px-6 py-14">
            {c.heading && (
              <>
                <h2 className="font-display text-2xl font-bold uppercase tracking-wide">{c.heading}</h2>
                <span className="mt-2 mb-6 block h-1 w-14 rounded-full bg-primary shadow-glow-sm" />
              </>
            )}
            <div className={`grid gap-5 ${cols}`}>
              {validItems.map((it, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50">
                  <div className="mb-3 grid h-10 w-10 place-items-center rounded-md bg-primary/15 text-primary">
                    {it.icon_url ? (
                      <img src={it.icon_url} alt="" className="h-6 w-6 object-contain" />
                    ) : (
                      <Check className="h-5 w-5" />
                    )}
                  </div>
                  {it.title && <h3 className="font-display text-lg font-bold">{it.title}</h3>}
                  {it.description && <p className="mt-1 text-sm text-muted-foreground">{it.description}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }

    case "video": {
      const embed = toEmbedUrl(c.url || "");
      if (!embed) return null;
      return (
        <section className="w-full" style={{ backgroundColor: bg }}>
          <div className="mx-auto max-w-5xl px-6 py-14">
            <div className="aspect-video overflow-hidden rounded-xl border border-border bg-black">
              <iframe
                src={embed}
                title={`${projectTitle} video`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          </div>
        </section>
      );
    }

    case "quote": {
      if (!c.quote) return null;
      return (
        <section className="w-full" style={{ backgroundColor: bg }}>
          <div className="mx-auto max-w-3xl px-6 py-14 text-center">
            <blockquote className="font-display text-2xl italic leading-snug text-foreground sm:text-3xl">
              &ldquo;{c.quote}&rdquo;
            </blockquote>
            {c.attribution && (
              <p className="mt-4 text-sm uppercase tracking-wider text-primary">— {c.attribution}</p>
            )}
          </div>
        </section>
      );
    }

    default:
      return null;
  }
}

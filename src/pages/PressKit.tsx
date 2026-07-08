import { useEffect, useMemo, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, ExternalLink, Mail, X } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/api";

type Project = {
  id: string;
  title: string;
  cover_url: string;
  press_kit_enabled: boolean;
};

type PressKit = {
  project_id: string;
  genre: string;
  platforms: string;
  release_date: string;
  price: string;
  one_line_pitch: string;
  long_description: string;
  developer: string;
  publisher: string;
  studio_location: string;
  steam_url: string;
  discord_url: string;
  other_social_urls: string;
  press_contact_email: string;
  key_art_url: string;
  game_logo_url: string;
  studio_logo_url: string;
  trailer_url: string;
  system_requirements: string;
  content_warnings: string;
  press_kit_zip_url: string;
};

type Screenshot = { id: string; project_id: string; url: string; caption: string; sort_order: number };

function toEmbedUrl(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    // YouTube
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    // Vimeo
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {}
  return null;
}

export default function PressKit() {
  const { slug = "" } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["press-kit", slug],
    queryFn: async () => {
      const { data: projects } = await supabase
        .from("site_projects")
        .select("id, title, cover_url, press_kit_enabled");
      const project = ((projects ?? []) as Project[]).find((p) => slugify(p.title) === slug);
      if (!project) return { project: null, kit: null, screenshots: [] as Screenshot[] };
      const [kitRes, shotsRes] = await Promise.all([
        supabase.from("site_press_kits").select("*").eq("project_id", project.id).maybeSingle(),
        supabase.from("site_press_screenshots").select("*").eq("project_id", project.id).order("sort_order"),
      ]);
      return {
        project,
        kit: (kitRes.data as PressKit) ?? null,
        screenshots: (shotsRes.data ?? []) as Screenshot[],
      };
    },
  });

  const [lightbox, setLightbox] = useState<string | null>(null);
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLightbox(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const embed = useMemo(() => toEmbedUrl(data?.kit?.trailer_url ?? ""), [data?.kit?.trailer_url]);

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
  if (!data.project.press_kit_enabled) return <Navigate to="/" replace />;

  const { project, kit, screenshots } = data;

  const socials = (kit?.other_social_urls || "")
    .split(/\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="relative min-h-screen">
      <Header />
      <main className="mx-auto max-w-5xl px-4 pt-32 pb-16 sm:px-6">
        <Link to="/#projects" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to projects
        </Link>

        {/* Hero */}
        <header className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          {(kit?.key_art_url || project.cover_url) && (
            <div className="relative aspect-video w-full bg-surface-2">
              <img
                src={kit?.key_art_url || project.cover_url}
                alt={`${project.title} key art`}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="flex flex-col gap-4 p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-4">
              {kit?.game_logo_url && (
                <img src={kit.game_logo_url} alt={`${project.title} logo`} className="h-16 w-auto object-contain" />
              )}
              <h1 className="font-display text-3xl font-black uppercase tracking-wide sm:text-4xl">{project.title}</h1>
            </div>
            {kit?.one_line_pitch && <p className="text-lg text-primary">{kit.one_line_pitch}</p>}
            {kit?.press_kit_zip_url && (
              <div>
                <Button asChild className="bg-primary font-semibold text-primary-foreground hover:bg-primary-glow hover:shadow-glow-sm">
                  <a href={kit.press_kit_zip_url} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" /> Download Full Press Kit (ZIP)
                  </a>
                </Button>
              </div>
            )}
          </div>
        </header>

        {/* Fact sheet */}
        <Section title="Fact Sheet">
          <div className="grid gap-x-6 gap-y-3 rounded-xl border border-border bg-card p-6 text-sm sm:grid-cols-2">
            <Fact k="Developer" v={kit?.developer} />
            <Fact k="Publisher" v={kit?.publisher} />
            <Fact k="Studio location" v={kit?.studio_location} />
            <Fact k="Genre" v={kit?.genre} />
            <Fact k="Platforms" v={kit?.platforms} />
            <Fact k="Release date" v={kit?.release_date} />
            <Fact k="Price" v={kit?.price} />
            <Fact k="Press contact" v={kit?.press_contact_email} isEmail />
          </div>
          {kit?.long_description && (
            <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-muted-foreground">
              {kit.long_description}
            </p>
          )}
        </Section>

        {/* Trailer */}
        {embed && (
          <Section title="Trailer">
            <div className="aspect-video overflow-hidden rounded-xl border border-border bg-black">
              <iframe
                src={embed}
                title={`${project.title} trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          </Section>
        )}

        {/* Screenshots */}
        {screenshots.length > 0 && (
          <Section title="Screenshots">
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {screenshots.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setLightbox(s.url)}
                  className="group relative aspect-video overflow-hidden rounded-lg border border-border bg-surface-2"
                >
                  <img src={s.url} alt={s.caption || "Screenshot"} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* Logos */}
        {(kit?.game_logo_url || kit?.studio_logo_url) && (
          <Section title="Logos">
            <div className="grid gap-4 sm:grid-cols-2">
              {kit?.game_logo_url && <LogoCard label="Game logo" url={kit.game_logo_url} />}
              {kit?.studio_logo_url && <LogoCard label="Studio logo" url={kit.studio_logo_url} />}
            </div>
          </Section>
        )}

        {/* Links */}
        {(kit?.steam_url || kit?.discord_url || socials.length > 0) && (
          <Section title="Links">
            <ul className="flex flex-wrap gap-2">
              {kit?.steam_url && <LinkPill href={kit.steam_url}>Steam</LinkPill>}
              {kit?.discord_url && <LinkPill href={kit.discord_url}>Discord</LinkPill>}
              {socials.map((url) => (
                <LinkPill key={url} href={url}>{new URL(url).hostname.replace(/^www\./, "")}</LinkPill>
              ))}
            </ul>
          </Section>
        )}

        {/* System requirements */}
        {kit?.system_requirements && (
          <Section title="System requirements">
            <pre className="whitespace-pre-wrap rounded-xl border border-border bg-card p-6 font-sans text-sm text-muted-foreground">{kit.system_requirements}</pre>
          </Section>
        )}

        {/* Content warnings */}
        {kit?.content_warnings && (
          <Section title="Content warnings">
            <pre className="whitespace-pre-wrap rounded-xl border border-border bg-card p-6 font-sans text-sm text-muted-foreground">{kit.content_warnings}</pre>
          </Section>
        )}

        {kit?.press_contact_email && (
          <div className="mt-16 rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">Press inquiries</p>
            <a href={`mailto:${kit.press_contact_email}`} className="mt-1 inline-flex items-center gap-2 font-display text-lg font-bold text-primary hover:underline">
              <Mail className="h-5 w-5" /> {kit.press_contact_email}
            </a>
          </div>
        )}
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
          <img src={lightbox} alt="Screenshot" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl font-bold uppercase tracking-wide">{title}</h2>
      <span className="mt-2 mb-6 block h-1 w-14 rounded-full bg-primary shadow-glow-sm" />
      {children}
    </section>
  );
}

function Fact({ k, v, isEmail }: { k: string; v?: string; isEmail?: boolean }) {
  if (!v) return null;
  return (
    <div className="flex flex-col gap-0.5 border-b border-border/50 py-2 last:border-b-0">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{k}</span>
      {isEmail ? (
        <a href={`mailto:${v}`} className="text-foreground hover:text-primary">{v}</a>
      ) : (
        <span className="text-foreground">{v}</span>
      )}
    </div>
  );
}

function LogoCard({ label, url }: { label: string; url: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="grid aspect-video place-items-center overflow-hidden rounded-md bg-[repeating-conic-gradient(#1a1a1f_0_25%,#0f0f13_0_50%)] [background-size:20px_20px]">
        <img src={url} alt={label} className="max-h-full max-w-full object-contain" />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <Button asChild size="sm" variant="outline">
          <a href={url} download target="_blank" rel="noopener noreferrer">
            <Download className="mr-2 h-4 w-4" /> Download
          </a>
        </Button>
      </div>
    </div>
  );
}

function LinkPill({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground transition hover:border-primary/60 hover:text-primary"
      >
        {children} <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </li>
  );
}

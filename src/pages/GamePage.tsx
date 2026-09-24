import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/api";

export type GamePlatform = { id?: string; name: string; logo_url: string; store_url: string; sort_order?: number };
export type GameProject = {
  id: string; title: string; description?: string; cover_url: string; key_art_url?: string;
  trailer_url?: string; status?: string; button_label?: string; button_url?: string;
  info_bar_color?: string; more_info_enabled: boolean; visible?: boolean; sort_order?: number;
  platforms?: GamePlatform[];
};
export type GameBlock = { id?: string; project_id: string; block_type: string; sort_order: number; visible: boolean; content: Record<string, any> };

const BACKGROUNDS = { black: "game-bg-black", dark: "game-bg-dark", orange: "game-bg-orange" } as const;

function backgroundKey(content: Record<string, any>): keyof typeof BACKGROUNDS {
  if (["black", "dark", "orange"].includes(content.background)) return content.background;
  const legacy = String(content.background_color || "").toLowerCase().replace(/\s/g, "");
  if (["#e8702a", "rgb(232,112,42)"].includes(legacy)) return "orange";
  if (["#1c1c1c", "#242424", "rgb(28,28,28)", "rgb(36,36,36)"].includes(legacy)) return "dark";
  return "black";
}

function embedUrl(url: string, autoplay = false): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    let result = "";
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v") || parsed.pathname.match(/\/(?:embed|shorts)\/([^/]+)/)?.[1];
      if (id) result = `https://www.youtube-nocookie.com/embed/${id}`;
    } else if (parsed.hostname === "youtu.be") result = `https://www.youtube-nocookie.com/embed${parsed.pathname}`;
    else if (parsed.hostname.includes("vimeo.com")) {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      if (id) result = `https://player.vimeo.com/video/${id}`;
    }
    return result ? `${result}${autoplay ? "?autoplay=1" : ""}` : null;
  } catch { return null; }
}

type GalleryImage = { url: string; caption: string };
function galleryImages(value: unknown): GalleryImage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === "string" && item.trim()) return [{ url: item, caption: "" }];
    if (item && typeof item === "object" && typeof item.url === "string" && item.url.trim()) return [{ url: item.url, caption: typeof item.caption === "string" ? item.caption : "" }];
    return [];
  });
}

export default function GamePage() {
  const { slug = "" } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["game-page", slug],
    queryFn: async () => {
      const [projectsResult, platformsResult] = await Promise.all([
        supabase.from("site_projects").select("*").order("sort_order"),
        supabase.from("site_game_platforms").select("*").order("sort_order"),
      ]);
      const projects = (projectsResult.data ?? []) as GameProject[];
      const platforms = (platformsResult.data ?? []) as GamePlatform[] & { project_id?: string }[];
      const project = projects.find((item) => slugify(item.title) === slug) ?? null;
      if (!project) return { project: null, projects, blocks: [] as GameBlock[] };
      project.platforms = platforms.filter((platform) => platform.project_id === project.id);
      const { data: blocks } = await supabase.from("site_game_page_blocks").select("*").eq("project_id", project.id).eq("visible", true).order("sort_order");
      return { project, projects: projects.map((item) => ({ ...item, platforms: platforms.filter((platform) => platform.project_id === item.id) })), blocks: (blocks ?? []) as GameBlock[] };
    },
  });

  if (isLoading) return <div className="public-landing min-h-screen"><div className="landing-shell min-h-screen"><Header forceCompact /><main className="game-page-loading" /></div></div>;
  if (error || !data?.project || !data.project.more_info_enabled) return <Navigate to="/" replace />;
  const eligible = data.projects.filter((item) => item.visible !== false && item.more_info_enabled);
  const currentIndex = eligible.findIndex((item) => item.id === data.project?.id);
  const nextGame = eligible.length > 1 ? eligible[(currentIndex + 1) % eligible.length] : undefined;
  return <GamePageCanvas project={data.project} blocks={data.blocks} nextGame={nextGame} />;
}

export function GamePageCanvas({ project, blocks, nextGame, preview = false }: { project: GameProject; blocks: GameBlock[]; nextGame?: GameProject; preview?: boolean }) {
  const visible = blocks.filter((block) => block.visible !== false);
  const groups = useMemo(() => visible.reduce<{ background: keyof typeof BACKGROUNDS; blocks: GameBlock[] }[]>((all, block) => {
    const background = backgroundKey(block.content || {});
    const last = all.at(-1);
    if (last?.background === background) last.blocks.push(block);
    else all.push({ background, blocks: [block] });
    return all;
  }, []), [visible]);

  return (
    <div className={`public-landing game-info-page min-h-screen ${preview ? "is-preview" : ""}`}>
      <div className="landing-shell min-h-screen">
        {!preview && <Header forceCompact />}
        <main className="game-page-main">
          {!preview && <Link to="/#home" className="all-games-link">← ALL GAMES</Link>}
          {groups.length ? groups.map((group, groupIndex) => (
            <section key={`${group.background}-${groupIndex}`} className={`game-block-group ${BACKGROUNDS[group.background]}`}>
              {group.blocks.map((block) => <GameBlockRenderer key={block.id ?? `${block.block_type}-${block.sort_order}`} block={block} project={project} />)}
            </section>
          )) : <div className="game-empty"><h1>{project.title}</h1><p>No content has been added to this page yet.</p></div>}
          {nextGame && !preview && <NextGame game={nextGame} />}
        </main>
        {!preview && <Footer />}
      </div>
    </div>
  );
}

function NextGame({ game }: { game: GameProject }) {
  const art = game.key_art_url || game.cover_url;
  return <Link to={`/games/${slugify(game.title)}`} className="next-game">
    {art && <img src={art} alt="" />}
    <span className="next-game-shade" />
    <span className="next-game-copy"><small>NEXT GAME</small><strong>{game.title}</strong></span>
  </Link>;
}

function GameBlockRenderer({ block, project }: { block: GameBlock; project: GameProject }) {
  const c = block.content || {};
  switch (block.block_type) {
    case "hero": return <HeroBlock content={c} project={project} />;
    case "steam": {
      const appId = String(c.app_id || "").replace(/[^0-9]/g, "");
      if (!appId) return null;
      return <div className="game-block game-steam"><p className="game-label">{c.label || "GET IT ON STEAM"}</p><iframe src={`https://store.steampowered.com/widget/${appId}/`} title={`Steam widget ${appId}`} /></div>;
    }
    case "store_bar": return <StoreBar content={c} project={project} />;
    case "text": return <TextBlock content={c} />;
    case "gallery": return <GalleryBlock content={c} />;
    case "free_image": {
      if (!c.image_url) return null;
      const full = c.size === "full" || c.size === "full_width";
      return <figure className={`game-block free-image ${full ? "is-full" : "is-contained"}`}><img src={c.image_url} alt={c.caption || ""} />{c.caption && <figcaption>{c.caption}</figcaption>}</figure>;
    }
    case "features": return <FeatureBlock content={c} />;
    case "video": return <VideoBlock content={c} title={project.title} />;
    case "quote": {
      if (!c.quote) return null;
      const source = <><span>{c.attribution}</span>{c.source && <span>{c.source}</span>}</>;
      return <figure className="game-block game-quote"><blockquote>“{c.quote}”</blockquote>{(c.attribution || c.source) && <figcaption>{c.source_url ? <a href={c.source_url} target="_blank" rel="noopener noreferrer">{source}</a> : source}</figcaption>}</figure>;
    }
    default: return null;
  }
}

function HeroBlock({ content: c, project }: { content: Record<string, any>; project: GameProject }) {
  const [open, setOpen] = useState(false);
  const trailer = c.trailer_url || "";
  return <div className="game-block game-page-hero">
    <div className="game-page-hero-media">{c.image_url && <img src={c.image_url} alt="" />}<span />
      {trailer && <Button size="icon" className="game-page-play" onClick={() => setOpen(true)} aria-label={`Play ${project.title} trailer`}><Play /></Button>}
      <div className="game-page-hero-copy">{c.title && <h1>{c.title}</h1>}{c.subtitle && <p>{c.subtitle}</p>}{c.cta_label && c.cta_url && <Button asChild className="game-orange-button"><a href={c.cta_url} target="_blank" rel="noopener noreferrer">{c.cta_label}</a></Button>}</div>
    </div>
    {open && <MediaLightbox embed={embedUrl(trailer, true)} label={`${project.title} trailer`} onClose={() => setOpen(false)} />}
  </div>;
}

function StoreBar({ content: c, project }: { content: Record<string, any>; project: GameProject }) {
  const useGame = c.use_game_data !== false;
  const platforms: GamePlatform[] = useGame ? project.platforms ?? [] : Array.isArray(c.platforms) ? c.platforms : [];
  const description = useGame ? project.description : c.description;
  const status = useGame ? project.status : c.status;
  const buttonLabel = useGame ? project.button_label : c.button_label;
  const buttonUrl = useGame ? project.button_url : c.button_url;
  const color = c.bar_color || (useGame ? project.info_bar_color : "");
  return <div className={`game-block game-store-bar ${color ? "" : "is-dark"}`} style={color ? { backgroundColor: color } : undefined}>
    <div className="game-store-copy">{status && <p className="game-label">{status}</p>}{description && <p>{description}</p>}</div>
    {!!platforms.length && <div className="platform-tiles">{platforms.filter((item) => item.name || item.logo_url).map((item, index) => <a key={item.id ?? index} href={item.store_url || undefined} target={item.store_url ? "_blank" : undefined} rel="noopener noreferrer" className="platform-tile">{item.logo_url && <img src={item.logo_url} alt="" />}{item.name && <span>{item.name}</span>}</a>)}</div>}
    {buttonLabel && buttonUrl && <Button asChild variant="outline" className="game-cta"><a href={buttonUrl} target="_blank" rel="noopener noreferrer">{buttonLabel}</a></Button>}
  </div>;
}

function TextBlock({ content: c }: { content: Record<string, any> }) {
  if (!c.heading && !c.body && !c.image_url) return null;
  const hasImage = c.image_url && ["left", "right"].includes(c.image_position);
  const heading = c.heading_style === "stacked" ? String(c.heading || "").split(/\n+/).filter(Boolean) : [];
  return <div className={`game-block game-text ${hasImage ? `has-image image-${c.image_position}` : ""}`}>
    {hasImage && <img src={c.image_url} alt="" />}
    <div className="game-text-copy">{heading.length ? <div className="game-stacked-heading">{heading.map((line: string, index: number) => <span key={`${line}-${index}`} className={index % 2 ? "is-orange" : ""}>{line}</span>)}</div> : c.heading && <h2>{c.heading}</h2>}{c.body && <div className="game-rich-text" dangerouslySetInnerHTML={{ __html: c.body }} />}</div>
  </div>;
}

function GalleryBlock({ content: c }: { content: Record<string, any> }) {
  const images = galleryImages(c.images);
  const [active, setActive] = useState<number | null>(null);
  const touch = useRef<number | null>(null);
  const move = (direction: number) => setActive((current) => current === null ? null : (current + direction + images.length) % images.length);
  useEffect(() => {
    if (active === null) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setActive(null); if (event.key === "ArrowLeft") move(-1); if (event.key === "ArrowRight") move(1); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [active, images.length]);
  if (!images.length) return null;
  return <div className="game-block game-gallery">{c.heading && <h2>{c.heading}</h2>}<div className="game-gallery-grid">{images.map((image, index) => <button type="button" key={`${image.url}-${index}`} onClick={() => setActive(index)}><img src={image.url} alt={image.caption || ""} loading="lazy" />{image.caption && <span>{image.caption}</span>}</button>)}</div>
    {active !== null && <div className="media-lightbox gallery-lightbox" role="dialog" aria-modal="true" onClick={() => setActive(null)} onTouchStart={(event) => { touch.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={(event) => { const end = event.changedTouches[0]?.clientX; if (touch.current !== null && end !== undefined && Math.abs(end - touch.current) > 45) move(end > touch.current ? -1 : 1); touch.current = null; }}><div className="gallery-lightbox-inner" onClick={(event) => event.stopPropagation()}><Button size="icon" variant="ghost" className="lightbox-close" onClick={() => setActive(null)} aria-label="Close gallery"><X /></Button><img src={images[active].url} alt={images[active].caption || ""} />{images[active].caption && <p>{images[active].caption}</p>}{images.length > 1 && <><Button size="icon" className="lightbox-prev" onClick={() => move(-1)} aria-label="Previous image"><ChevronLeft /></Button><Button size="icon" className="lightbox-next" onClick={() => move(1)} aria-label="Next image"><ChevronRight /></Button></>}</div></div>}
  </div>;
}

function FeatureBlock({ content: c }: { content: Record<string, any> }) {
  const items = Array.isArray(c.items) ? c.items.filter((item) => item && (item.title || item.description || item.icon_url)) : [];
  if (!items.length) return null;
  return <div className="game-block game-features">{c.heading && <h2>{c.heading}</h2>}<div className={`feature-grid columns-${c.columns === 2 ? 2 : 3}`}>{items.map((item, index) => <article key={index}>{item.icon_url ? <img src={item.icon_url} alt="" /> : <strong>{String(index + 1).padStart(2, "0")}</strong>}{item.title && <h3>{item.title}</h3>}{item.description && <p>{item.description}</p>}</article>)}</div></div>;
}

function VideoBlock({ content: c, title }: { content: Record<string, any>; title: string }) {
  const embed = embedUrl(c.url || "", true);
  const [playing, setPlaying] = useState(false);
  if (!embed) return null;
  return <div className="game-block game-video"><div className="game-video-frame">{playing ? <iframe src={embed} title={`${title} video`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /> : <button type="button" onClick={() => setPlaying(true)} aria-label="Play video">{c.poster_url && <img src={c.poster_url} alt="" />}<span><Play /></span></button>}</div></div>;
}

function MediaLightbox({ embed, label, onClose }: { embed: string | null; label: string; onClose: () => void }) {
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [onClose]);
  if (!embed) return null;
  return <div className="media-lightbox" role="dialog" aria-modal="true" onClick={onClose}><div className="video-lightbox-inner" onClick={(event) => event.stopPropagation()}><Button size="icon" variant="ghost" onClick={onClose} aria-label="Close video"><X /></Button><iframe src={embed} title={label} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /></div></div>;
}
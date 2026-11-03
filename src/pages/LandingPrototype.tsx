import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type MouseEvent,
} from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUpRight, Loader2, Send } from "lucide-react";
import { siDiscord, siSteam } from "simple-icons";
import { fetchSiteContent, sendContact, slugify } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { SocialIconLinks, type SocialLink } from "@/components/SocialIconLinks";
import logoLarge from "@/assets/dfg-logo-large.png";
import logoSmall from "@/assets/dfg-logo.png";
import coverCoinsweeper from "@/assets/cover-coinsweeper.jpg";
import coverUnboxed from "@/assets/cover-unboxed.jpg";
import "./landing-prototype.css";

/*
 * Prototype of a reworked landing page, served at /new.
 * Reads the same Supabase content as the live landing page; the fallbacks
 * below are only used when Supabase is unreachable.
 */

type ProtoGame = {
  id?: string;
  title: string;
  description: string;
  status: string;
  cover: string;
  buttonLabel: string;
  buttonUrl: string;
  href: string;
  external: boolean;
  trailerUrl: string;
};

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type TeamMember = {
  name?: string;
  gamer_tag?: string;
  real_name?: string;
  role: string;
  bio: string;
};

type ProtoTile = {
  tint: string;
  key: string;
  src: string;
  game: ProtoGame;
  fit: "cover" | "contain";
  position: string;
};

const FALLBACK_GAMES = [
  {
    title: "Coinsweeper",
    description:
      "Coinsweeper is a roguelite that combines classic Minesweeper with risk management, deck-building and gambling mechanics.",
    status: "Play Now",
    cover: coverCoinsweeper,
    buttonLabel: "Play now",
    buttonUrl: "https://store.steampowered.com/",
    trailerUrl: "",
  },
  {
    title: "Unboxed: Idle Case Tycoon",
    description:
      "Open cases, collect rare weapon skins, and build your passive income empire. Upgrade your auto-openers, fill your Vault, and dominate the Skin Market in this fast-paced idle clicker. One more case. Always one more.",
    status: "In Development",
    cover: coverUnboxed,
    buttonLabel: "Wishlist now",
    buttonUrl: "https://store.steampowered.com/",
    trailerUrl: "",
  },
];

const FALLBACK_TEAM = [
  {
    gamer_tag: "RFX",
    real_name: "Kamil",
    role: "Co-Founder, Game & Product Design",
    bio: "Responsible for game design, UI/UX and the business side of Duo Forge Games, including Steam, contracts, accounting and community management. Focuses on making sure the games look and feel polished before release.",
  },
  {
    gamer_tag: "SEVEN2K",
    real_name: "Julian",
    role: "Co-Founder, Lead Development",
    bio: "Leads development at Duo Forge Games, with a focus on game balancing and player experience. Works closely on testing and refining mechanics to make sure they feel right in practice, not just on paper.",
  },
];

const FALLBACK_ABOUT =
  "Duo Forge Games is a two-person indie studio based in Lübeck, Germany. We're brothers, and we've been building games together in Unity for the past five years. Our approach is simple: games by gamers, for gamers.";

/* Each game gets its own colour world in the games section. Later this can become an admin field. */
const GAME_THEMES = [
  { bg: "#1b0f2e", panel: "#2a1747", accent: "#ff4fd8", glow: "rgba(255, 79, 216, .35)" },
  { bg: "#1d1d1d", panel: "#2b2b2b", accent: "#e8702a", glow: "rgba(232, 112, 42, .35)" },
  { bg: "#0f2420", panel: "#173a33", accent: "#4fffc1", glow: "rgba(79, 255, 193, .3)" },
];

const CROP_POSITIONS = ["50% 50%", "15% 30%", "85% 70%", "30% 85%", "75% 20%", "50% 10%"];
const MIN_TILES = 12;

function useFonts() {
  useEffect(() => {
    const id = "proto-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Silkscreen:wght@400;700&display=swap";
    document.head.appendChild(link);
  }, []);
}

function useGameExtras(projectIds: string[]) {
  return useQuery({
    queryKey: ["proto-game-extras", projectIds],
    enabled: projectIds.length > 0,
    retry: 0,
    queryFn: async () => {
      const [shots, kits, blocks, weapons] = await Promise.all([
        supabase
          .from("site_press_screenshots")
          .select("project_id,url,sort_order")
          .in("project_id", projectIds)
          .order("sort_order"),
        supabase
          .from("site_press_kits")
          .select("project_id,key_art_url,game_logo_url")
          .in("project_id", projectIds),
        supabase
          .from("site_game_page_blocks")
          .select("project_id,block_type,content,visible")
          .in("project_id", projectIds)
          .order("sort_order"),
        supabase
          .from("weapons")
          .select("template_image_url")
          .eq("active", true)
          .order("sort_order")
          .limit(40),
      ]);
      // Screenshots from the game info page gallery and hero blocks count as tiles too.
      const blockImages: { project_id: string; url: string }[] = [];
      ((blocks.data ?? []) as Row[])
        .filter((b) => b.visible !== false)
        .forEach((b) => {
          const c = (b.content ?? {}) as Row;
          if (b.block_type === "gallery" && Array.isArray(c.images))
            c.images.forEach(
              (url: string) => url && blockImages.push({ project_id: b.project_id, url }),
            );
          if (b.block_type === "hero" && c.image_url)
            blockImages.push({ project_id: b.project_id, url: c.image_url });
        });
      return {
        screenshots: [
          ...((shots.data ?? []) as { project_id: string; url: string }[]),
          ...blockImages,
        ],
        kits: (kits.data ?? []) as {
          project_id: string;
          key_art_url: string;
          game_logo_url: string;
        }[],
        sprites: ((weapons.data ?? []) as { template_image_url: string }[])
          .map((w) => w.template_image_url)
          .filter(Boolean),
      };
    },
  });
}

function buildTiles(
  games: ProtoGame[],
  extras?: ReturnType<typeof useGameExtras>["data"],
): ProtoTile[] {
  const base: ProtoTile[] = [];
  games.forEach((game, gameIndex) => {
    const tint = GAME_THEMES[gameIndex % GAME_THEMES.length].panel;
    const sources: { src: string; fit: "cover" | "contain" }[] = [];
    if (game.cover) sources.push({ src: game.cover, fit: "cover" });
    const kit = extras?.kits.find((k) => k.project_id === game.id);
    // Press kit key art is often a transparent logo, so show it whole on the game's colour.
    if (kit?.key_art_url && kit.key_art_url !== game.cover)
      sources.push({ src: kit.key_art_url, fit: "contain" });
    if (kit?.game_logo_url) sources.push({ src: kit.game_logo_url, fit: "contain" });
    const seen = new Set(sources.map((x) => x.src));
    extras?.screenshots
      .filter((s) => s.project_id === game.id && s.url && !seen.has(s.url) && seen.add(s.url))
      .forEach((s) => sources.push({ src: s.url, fit: "cover" }));
    sources.forEach((s, i) =>
      base.push({
        key: `${game.title}-${i}`,
        src: s.src,
        fit: s.fit,
        game,
        tint,
        position: "50% 50%",
      }),
    );
  });
  if (base.length === 0) return [];

  // Interleave games so neighbouring tiles differ, then pad with alternative crops until the strip is full.
  const byGame = games.map((g) => base.filter((t) => t.game === g));
  const mixed: ProtoTile[] = [];
  for (let i = 0; mixed.length < base.length; i++)
    byGame.forEach((list) => list[i] && mixed.push(list[i]));
  const tiles = [...mixed];
  let round = 1;
  while (tiles.length < MIN_TILES) {
    mixed.forEach(
      (t) =>
        tiles.length < MIN_TILES &&
        tiles.push({
          ...t,
          key: `${t.key}-r${round}`,
          position:
            t.fit === "cover"
              ? CROP_POSITIONS[(round + tiles.length) % CROP_POSITIONS.length]
              : t.position,
        }),
    );
    round++;
  }
  return tiles;
}

export default function LandingPrototype() {
  useFonts();
  const { data } = useQuery({ queryKey: ["site-content"], queryFn: fetchSiteContent, retry: 0 });

  const games: ProtoGame[] = useMemo(() => {
    const live = (data?.projects ?? []).filter((p: Row) => p.visible !== false);
    const source = live.length
      ? live.map((p: Row) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          status: p.status,
          cover: p.key_art_url || p.cover_url,
          buttonLabel: p.button_label,
          buttonUrl: p.button_url,
          trailerUrl: p.trailer_url || "",
          moreInfo: !!p.more_info_enabled,
        }))
      : FALLBACK_GAMES.map((g) => ({ ...g, id: undefined, moreInfo: true }));
    return source.map(({ moreInfo, ...g }: Row) => {
      const internal = moreInfo || !g.buttonUrl;
      return {
        ...g,
        href: internal ? `/games/${slugify(g.title)}` : g.buttonUrl,
        external: !internal,
      } as ProtoGame;
    });
  }, [data?.projects]);

  const { data: extras } = useGameExtras(games.map((g) => g.id).filter(Boolean) as string[]);
  const tiles = useMemo(() => buildTiles(games, extras), [games, extras]);
  const team = data?.team?.length ? data.team : FALLBACK_TEAM;
  const featured = games.find((g) => g.status === "Play Now") ?? games[0];
  const discordUrl =
    data?.settings?.discord_button_url ||
    data?.socialLinks?.find((l) => l.platform === "discord" && l.visible !== false)?.url ||
    "https://discord.gg/9mJ4XA6YrB";

  return (
    <div className="proto">
      <ProtoHeader featured={featured} discordUrl={discordUrl} />
      <main>
        <ForgeHero tiles={tiles} featured={featured} sprites={extras?.sprites ?? []} />
        <GamesSection games={games} />
        <MissionBand />
        <AboutSection team={team} intro={data?.about?.intro_html} />
        <ContactBand
          discordUrl={discordUrl}
          email={data?.settings?.contact_email || "info@duoforgegames.com"}
          socialLinks={data?.socialLinks ?? []}
        />
      </main>
      <footer className="proto-footer">
        <img src={logoSmall} alt="" width={40} height={40} />
        <span>© {new Date().getFullYear()} Duo Forge Games · Lübeck, Germany</span>
        <nav>
          <Link to="/imprint">Imprint</Link>
          <Link to="/privacy">Privacy</Link>
        </nav>
      </footer>
    </div>
  );
}

function BrandIcon({ path, size = 18 }: { path: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="currentColor">
      <path d={path} />
    </svg>
  );
}

function ProtoHeader({ featured, discordUrl }: { featured?: ProtoGame; discordUrl: string }) {
  return (
    <header className="proto-header">
      <a href="#top" className="proto-brand">
        <img src={logoSmall} alt="" width={30} height={30} /> Duo Forge Games
      </a>
      <nav className="proto-nav" aria-label="Primary navigation">
        <a href="#games">Games</a>
        <a href="#about">About</a>
        <a href="#contact">Contact</a>
      </nav>
      <a
        className="proto-header-icon"
        href={discordUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Discord"
      >
        <BrandIcon path={siDiscord.path} />
      </a>
      {featured && (
        <a
          className="proto-header-cta"
          href={featured.buttonUrl || featured.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          <BrandIcon path={siSteam.path} size={16} /> <span>{featured.title}</span>
        </a>
      )}
    </header>
  );
}

// Spots stay clear of the headline (top left) and the captions (bottom corners).
const SPRITE_SPOTS = [
  { x: 60, y: 13, r: 12, s: 1.8 },
  { x: 84, y: 24, r: -10, s: 1.6 },
  { x: 93, y: 58, r: -24, s: 1.5 },
  { x: 30, y: 78, r: -8, s: 1.6 },
  { x: 58, y: 86, r: 14, s: 1.8 },
  { x: 6, y: 58, r: 18, s: 1.5 },
];

function ForgeHero({
  tiles,
  featured,
  sprites,
}: {
  tiles: ProtoTile[];
  featured?: ProtoGame;
  sprites: string[];
}) {
  // Pick an even spread of sprites so the hero shows different weapon types.
  const picked = sprites.length
    ? SPRITE_SPOTS.map((spot, i) => ({
        ...spot,
        src: sprites[Math.floor((i * sprites.length) / SPRITE_SPOTS.length)],
      }))
    : [];
  const heroRef = useRef<HTMLElement>(null);
  const [hovered, setHovered] = useState<ProtoGame | null>(null);
  const [bursts, setBursts] = useState<number[]>([]);

  const onMove = (event: MouseEvent<HTMLElement>) => {
    const el = heroRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--tilt-x", `${(-y * 14).toFixed(2)}deg`);
    el.style.setProperty("--tilt-y", `${(x * 18).toFixed(2)}deg`);
    el.style.setProperty("--shift-x", `${(x * 24).toFixed(1)}px`);
  };

  const strike = () => {
    const id = Date.now();
    setBursts((b) => [...b, id]);
    window.setTimeout(() => setBursts((b) => b.filter((x) => x !== id)), 900);
  };

  const info = hovered ?? null;

  return (
    <section
      id="top"
      ref={heroRef}
      className="forge-hero"
      onMouseMove={onMove}
      aria-label="Duo Forge Games"
    >
      <div className="forge-copy">
        <p className="pixel-label">Indie studio · Lübeck, Germany</p>
        <h1>
          Two brothers.
          <br />
          One forge.
        </h1>
        <p className="forge-sub">Games we'd play ourselves. Easy to pick up, hard to put down.</p>
      </div>

      <div className="forge-sprites" aria-hidden="true">
        {picked.map((sp, i) => (
          <img
            key={i}
            src={sp.src}
            alt=""
            style={
              {
                left: `${sp.x}%`,
                top: `${sp.y}%`,
                "--r": `${sp.r}deg`,
                "--s": sp.s,
                "--i": i,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="forge-strip" aria-label="Our games">
        <div className="forge-track">
          {[0, 1].map((copy) => (
            <div className="forge-track-set" key={copy} aria-hidden={copy === 1}>
              {tiles.map((tile) => {
                const content = (
                  <img
                    src={tile.src}
                    alt={copy === 0 ? tile.game.title : ""}
                    decoding="async"
                    style={{ objectFit: tile.fit, objectPosition: tile.position }}
                  />
                );
                const common = {
                  className: `forge-tile ${tile.fit === "contain" ? "is-logo" : ""}`,
                  onMouseEnter: () => setHovered(tile.game),
                  onMouseLeave: () => setHovered(null),
                  onFocus: () => setHovered(tile.game),
                  onBlur: () => setHovered(null),
                  tabIndex: copy === 1 ? -1 : undefined,
                  style: { "--tile-bg": tile.tint } as CSSProperties,
                  "aria-label": `${tile.game.title}: more info`,
                };
                return tile.game.external ? (
                  <a
                    key={`${copy}-${tile.key}`}
                    href={tile.game.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    {...common}
                  >
                    {content}
                  </a>
                ) : (
                  <Link key={`${copy}-${tile.key}`} to={tile.game.href} {...common}>
                    {content}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <button type="button" className="forge-logo" onClick={strike} aria-label="Strike the anvil">
        <span className="forge-logo-float">
          <img src={logoLarge} alt="Duo Forge Games" width={1589} height={1920} />
        </span>
        <span className="forge-embers" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <i key={i} style={{ "--i": i } as CSSProperties} />
          ))}
        </span>
        {bursts.map((id) => (
          <span key={id} className="forge-burst" aria-hidden="true">
            {Array.from({ length: 16 }, (_, i) => (
              <i
                key={i}
                style={
                  {
                    "--a": `${(i / 16) * 360}deg`,
                    "--d": `${90 + (i % 4) * 30}px`,
                  } as CSSProperties
                }
              />
            ))}
          </span>
        ))}
      </button>

      <div className="forge-caption forge-caption-left" aria-live="polite">
        {info ? (
          <>
            <span className="status-chip">{info.status}</span>
            <strong>{info.title}</strong>
            <span>
              Click to explore <ArrowUpRight size={14} />
            </span>
          </>
        ) : (
          <>
            <span className="status-chip is-muted">Pick a game</span>
            <strong>Our games, fresh from the anvil</strong>
            <span>Click any tile for more info</span>
          </>
        )}
      </div>

      <div className="forge-caption forge-caption-right">
        {featured && (
          <a
            href={featured.buttonUrl || featured.href}
            target="_blank"
            rel="noopener noreferrer"
            className="pixel-button"
          >
            <BrandIcon path={siSteam.path} size={16} /> {featured.buttonLabel || "View on Steam"}
          </a>
        )}
        <a href="#games" className="scroll-hint">
          Enter the forge <ArrowDown size={14} />
        </a>
      </div>
    </section>
  );
}

function GamesSection({ games }: { games: ProtoGame[] }) {
  return (
    <section id="games" className="games-world">
      <div className="games-world-intro">
        <p className="pixel-label">Our games</p>
        <h2>
          Forged in Lübeck.
          <br />
          Played everywhere.
        </h2>
      </div>
      {games.map((game, index) => {
        const theme = GAME_THEMES[index % GAME_THEMES.length];
        const style = {
          "--g-bg": theme.bg,
          "--g-panel": theme.panel,
          "--g-accent": theme.accent,
          "--g-glow": theme.glow,
        } as CSSProperties;
        const More = game.external ? (
          <a
            href={game.href}
            target="_blank"
            rel="noopener noreferrer"
            className="pixel-button is-ghost"
          >
            More info
          </a>
        ) : (
          <Link to={game.href} className="pixel-button is-ghost">
            More info
          </Link>
        );
        return (
          <article
            key={game.title}
            className={`game-world ${index % 2 ? "is-flipped" : ""}`}
            style={style}
          >
            <div className="game-world-art">
              {game.cover ? (
                <img src={game.cover} alt={`${game.title} key art`} loading="lazy" />
              ) : (
                <div className="game-world-placeholder">{game.title}</div>
              )}
            </div>
            <div className="game-world-copy">
              <span className="status-chip">{game.status}</span>
              <h3>{game.title}</h3>
              <p>{game.description}</p>
              <div className="game-world-actions">
                {game.buttonUrl && (
                  <a
                    href={game.buttonUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pixel-button"
                  >
                    <BrandIcon path={siSteam.path} size={16} />{" "}
                    {game.buttonLabel || "View on Steam"}
                  </a>
                )}
                {More}
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function MissionBand() {
  const words = ["Games by gamers", "for gamers", "just one more run", "forged with our community"];
  return (
    <section className="mission-band" aria-label="Our mission">
      <div className="mission-marquee" aria-hidden="true">
        <div>
          {[...words, ...words].map((w, i) => (
            <span key={i}>
              {w}
              <b>✦</b>
            </span>
          ))}
        </div>
      </div>
      <div className="mission-band-inner">
        <p className="mission-big">
          We make the kind of games we'd play ourselves, and every update is shaped by the people
          who play them.
        </p>
        <p className="mission-sign">From our Discord to the Steam reviews.</p>
      </div>
    </section>
  );
}

function AboutSection({ team, intro }: { team: TeamMember[]; intro?: string }) {
  return (
    <section id="about" className="about-forge">
      <div className="about-head">
        <p className="pixel-label">About us</p>
        <h2>Two people, one anvil.</h2>
        {intro ? (
          <div className="about-intro" dangerouslySetInnerHTML={{ __html: intro }} />
        ) : (
          <p className="about-intro">{FALLBACK_ABOUT}</p>
        )}
      </div>
      <div className="about-cards">
        {team.map((m: TeamMember, i: number) => {
          const tag = m.gamer_tag || m.name;
          return (
            <article key={tag} className="about-card">
              <div className={`pixel-avatar ${i % 2 ? "is-alt" : ""}`} aria-hidden="true">
                <span>{(tag || "?").slice(0, 2)}</span>
              </div>
              <div>
                <h3>
                  {tag} {m.real_name && <small>{m.real_name}</small>}
                </h3>
                <p className="pixel-label">{m.role}</p>
                <p>{m.bio}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ContactBand({
  discordUrl,
  email,
  socialLinks,
}: {
  discordUrl: string;
  email: string;
  socialLinks: SocialLink[];
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    setStatus("loading");
    try {
      await sendContact({
        name: String(fd.get("name") || "").trim(),
        email: String(fd.get("email") || "").trim(),
        subject: `Website: ${fd.get("inquiry_type")}`,
        message: String(fd.get("message") || "").trim(),
        inquiry_type: String(fd.get("inquiry_type") || "other"),
      });
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
    }
  };

  return (
    <section id="contact" className="contact-band">
      <div className="contact-band-copy">
        <p className="pixel-label">Contact</p>
        <h2>Let's forge something.</h2>
        <p>Player, press or publisher: drop us a line or come hang out on Discord.</p>
        <div className="contact-band-links">
          <a
            className="pixel-button is-dark"
            href={discordUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <BrandIcon path={siDiscord.path} size={16} /> Join our Discord
          </a>
          <a className="contact-mail" href={`mailto:${email}`}>
            {email}
          </a>
        </div>
        {socialLinks.length > 0 && (
          <div className="contact-socials">
            <SocialIconLinks links={socialLinks} />
          </div>
        )}
      </div>
      <form className="contact-band-form" onSubmit={onSubmit}>
        <div className="row">
          <label>
            Name
            <input name="name" required maxLength={100} autoComplete="name" />
          </label>
          <label>
            I am a
            <select name="inquiry_type" required defaultValue="">
              <option value="" disabled>
                Select…
              </option>
              <option value="player">Player</option>
              <option value="press">Press / Media</option>
              <option value="publisher">Publisher / Business</option>
              <option value="other">Other</option>
            </select>
          </label>
        </div>
        <label>
          Email
          <input name="email" type="email" required maxLength={255} autoComplete="email" />
        </label>
        <label>
          Message
          <textarea name="message" required rows={4} maxLength={2000} />
        </label>
        <button type="submit" className="pixel-button is-dark" disabled={status === "loading"}>
          {status === "loading" ? <Loader2 className="spin" size={16} /> : <Send size={16} />} Send
          message
        </button>
        {status === "success" && <p className="form-note">Thanks! We'll get back to you soon.</p>}
        {status === "error" && (
          <p className="form-note">Something went wrong. Please email us directly.</p>
        )}
      </form>
    </section>
  );
}

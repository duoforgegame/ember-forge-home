import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Info, Loader2, Newspaper, Play, Send, X } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SocialIconLinks } from "@/components/SocialIconLinks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  projects as fallbackProjects,
  team as fallbackTeam,
  socials as fallbackSocials,
  CONTACT_EMAIL,
  type ProjectStatus,
} from "@/lib/site-data";
import { fetchSiteContent, sendContact, slugify } from "@/lib/api";

export type PlatformView = { id?: string; name: string; logo_url: string; store_url: string; sort_order?: number };
export type ProjectView = (typeof fallbackProjects)[number] & {
  id?: string;
  pressKitEnabled?: boolean;
  moreInfoEnabled?: boolean;
  visible?: boolean;
  trailerUrl?: string;
  infoBarColor?: string;
  platforms?: PlatformView[];
};

export type LandingSettings = {
  slider_autoplay: boolean; slider_interval_seconds: number; mission_visible: boolean;
  mission_text: string; mission_signoff: string; about_heading: string;
  contact_heading: string; contact_direct_text: string; contact_email: string;
};

export function statusBadgeStyle(color: string): React.CSSProperties {
  return {
    backgroundColor: `${color}26`,
    borderColor: `${color}66`,
    color,
  };
}

export default function Landing() {
  const { data } = useQuery({ queryKey: ["site-content"], queryFn: fetchSiteContent, retry: 0 });

  const projects: ProjectView[] =
    data?.projects && data.projects.length > 0
      ? data.projects.filter((project: any) => project.visible !== false).map((project: any) => ({
          id: project.id,
          title: project.title,
          description: project.description,
          cover: project.key_art_url || project.cover_url,
          status: project.status as ProjectStatus,
          buttonLabel: project.button_label,
          buttonUrl: project.button_url,
          pressKitEnabled: !!project.press_kit_enabled,
          moreInfoEnabled: !!project.more_info_enabled,
          visible: project.visible !== false,
          trailerUrl: project.trailer_url || "",
          infoBarColor: project.info_bar_color || "",
          platforms: (data.platforms ?? []).filter((platform: any) => platform.project_id === project.id),
        }))
      : fallbackProjects.map((project) => ({ ...project, pressKitEnabled: false, moreInfoEnabled: false }));

  const team =
    data?.team && data.team.length > 0
      ? data.team.map((member: any) => ({ name: member.name, gamer_tag: member.gamer_tag, real_name: member.real_name, role: member.role, bio: member.bio }))
      : fallbackTeam;

  return (
    <div className="public-landing min-h-screen">
      <div className="landing-shell">
        <Header />
        <main>
          <GamesHero projects={projects} autoplay={data?.settings?.slider_autoplay ?? true} intervalSeconds={data?.settings?.slider_interval_seconds ?? 6} />
          {(data?.settings?.mission_visible ?? true) && <MissionSection lines={data?.missionLines} missionText={data?.settings?.mission_text || data?.about?.intro_html || ""} signoff={data?.settings?.mission_signoff} />}
          <TeamSection team={team} heading={data?.settings?.about_heading} introHtml={data?.about?.intro_html} />
          <ContactSection
            socials={data?.socials ?? fallbackSocials}
            steamUrl={projects.find((project) => /store\.steampowered\.com/i.test(project.buttonUrl))?.buttonUrl}
            heading={data?.settings?.contact_heading}
            directText={data?.settings?.contact_direct_text}
            email={data?.settings?.contact_email}
          />
        </main>
        <Footer />
      </div>
    </div>
  );
}

export function GamesHero({ projects, autoplay = false, intervalSeconds = 6, preview = false }: { projects: ProjectView[]; autoplay?: boolean; intervalSeconds?: number; preview?: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const activeProject = projects[activeIndex];

  useEffect(() => {
    if (activeIndex >= projects.length) setActiveIndex(0);
  }, [activeIndex, projects.length]);

  useEffect(() => {
    if (!autoplay || preview || projects.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActiveIndex((current) => (current + 1) % projects.length), Math.max(2, intervalSeconds) * 1000);
    return () => window.clearInterval(timer);
  }, [autoplay, intervalSeconds, preview, projects.length]);

  if (!activeProject) return null;

  const move = (direction: number) => {
    setActiveIndex((current) => (current + direction + projects.length) % projects.length);
  };

  return (
    <section id="home" className="games-hero" aria-label="Games">
      <div className="game-stage">
        <div className="game-art-frame">
          {activeProject.cover ? (
            <img
              key={activeProject.cover}
              src={activeProject.cover}
              alt={`${activeProject.title} key art`}
              className="game-art"
              width={1600}
              height={900}
            />
          ) : null}

          {activeProject.trailerUrl && (
            <Button className="game-trailer-button" size="icon" onClick={() => setTrailerOpen(true)} aria-label={`Play ${activeProject.title} trailer`}><Play /></Button>
          )}

          {projects.length > 1 && (
            <>
              <Button className="slider-arrow slider-arrow-left" size="icon" onClick={() => move(-1)} aria-label="Previous game">
                <ChevronLeft />
              </Button>
              <Button className="slider-arrow slider-arrow-right" size="icon" onClick={() => move(1)} aria-label="Next game">
                <ChevronRight />
              </Button>
              <div className="slider-dots" aria-label="Choose a game">
                {projects.map((project, index) => (
                  <Button
                    key={project.title}
                    type="button"
                    variant="ghost"
                    className={`slider-dot ${index === activeIndex ? "is-active" : ""}`}
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Show ${project.title}`}
                    aria-current={index === activeIndex ? "true" : undefined}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className={`game-info-bar ${activeProject.infoBarColor ? "" : activeIndex % 2 === 0 ? "game-info-accent" : "game-info-dark"}`} style={activeProject.infoBarColor ? { backgroundColor: activeProject.infoBarColor } : undefined}>
          <div className="game-summary">
            <p className="eyebrow">{activeProject.status}</p>
            <AutoFitGameTitle title={activeProject.title} />
            <p className="game-description">{activeProject.description}</p>
          </div>
          <div className="game-info-actions">
            {!!activeProject.platforms?.length && (
              <div className="platform-tiles">
                {activeProject.platforms.filter((platform) => platform.name || platform.logo_url).map((platform, index) => (
                  <a key={platform.id ?? `${platform.name}-${index}`} href={platform.store_url || undefined} target={platform.store_url ? "_blank" : undefined} rel="noopener noreferrer" className="platform-tile">
                    {platform.logo_url && <img src={platform.logo_url} alt="" />}
                    {platform.name && <span>{platform.name}</span>}
                  </a>
                ))}
              </div>
            )}
            <div className="game-button-row">
              {activeProject.pressKitEnabled && (
                <Button asChild variant="outline" className="game-secondary-cta game-press-cta">
                  <Link to={`/press/${slugify(activeProject.title)}`}><Newspaper /> Press kit</Link>
                </Button>
              )}
              {activeProject.moreInfoEnabled && (
                <Button asChild variant="outline" className="game-secondary-cta game-more-cta">
                  <Link to={`/games/${slugify(activeProject.title)}`}><Info /> More info</Link>
                </Button>
              )}
              {activeProject.buttonUrl && (
                <Button asChild variant="outline" className="game-cta">
                  <a href={activeProject.buttonUrl} target="_blank" rel="noopener noreferrer">
                    {activeProject.buttonLabel}
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      {trailerOpen && activeProject.trailerUrl && <TrailerLightbox url={activeProject.trailerUrl} onClose={() => setTrailerOpen(false)} />}
    </section>
  );
}

function AutoFitGameTitle({ title }: { title: string }) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const titleElement = titleRef.current;
    if (!titleElement) return;

    const fitTitle = () => {
      titleElement.style.fontSize = "";
      const startingSize = Number.parseFloat(window.getComputedStyle(titleElement).fontSize);
      if (!Number.isFinite(startingSize)) return;
      const minimumSize = startingSize * 0.6;
      let fittedSize = startingSize;
      while (titleElement.scrollWidth > titleElement.clientWidth && fittedSize > minimumSize) {
        fittedSize = Math.max(minimumSize, fittedSize - 1);
        titleElement.style.fontSize = `${fittedSize}px`;
      }
    };

    fitTitle();
    const observer = new ResizeObserver(fitTitle);
    observer.observe(titleElement);
    if (titleElement.parentElement) observer.observe(titleElement.parentElement);
    return () => observer.disconnect();
  }, [title]);

  return <h1 ref={titleRef} title={title}>{title}</h1>;
}

function TrailerLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/i);
  if (!match?.[1]) return null;
  return <div className="trailer-lightbox" role="dialog" aria-modal="true" aria-label="Game trailer" onClick={onClose}><div className="trailer-frame" onClick={(event) => event.stopPropagation()}><Button size="icon" variant="ghost" onClick={onClose} aria-label="Close trailer"><X /></Button><iframe src={`https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=1`} title="Game trailer" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /></div></div>;
}

export function MissionSection({ lines, missionText, signoff }: { lines?: { id?: string; text: string; style: string }[]; missionText?: string | null; signoff?: string | null }) {
  const displayLines = lines?.length ? lines : [{ text: "Games by", style: "white_black" }, { text: "Gamers", style: "white_black" }, { text: "For", style: "black_orange" }, { text: "Gamers", style: "black_orange" }];
  return (
    <section id="projects" className="mission-section">
      <div className="mission-grid">
        <div className="mission-lockup" aria-label="Games by gamers, for gamers">
          {displayLines.filter((line) => line.text).map((line, index) => <span key={line.id ?? index} className={line.style === "black_orange" ? "is-orange" : ""}>{line.text}</span>)}
        </div>
        <div className="mission-copy">
          {missionText ? (
            <div dangerouslySetInnerHTML={{ __html: missionText }} />
          ) : (
            <p>Duo Forge Games is a two-person indie studio from Lübeck. We are brothers, and every game we make is shaped together with the players who test it.</p>
          )}
          <span className="mission-rule" />
           {signoff && <p className="mission-signoff">{signoff}</p>}
        </div>
      </div>
    </section>
  );
}

export function TeamSection({ team, heading = "About us", introHtml }: { team: any[]; heading?: string; introHtml?: string }) {
  return (
    <section id="about" className="team-section">
      {heading && <h2 className="section-heading">{heading}</h2>}
      {introHtml && <div className="about-intro" dangerouslySetInnerHTML={{ __html: introHtml }} />}
      <div className="team-grid">
        {team.map((member) => (
          <article key={member.name} className="team-profile">
            <h3>{member.gamer_tag || member.name}{member.real_name && <small>{member.real_name}</small>}</h3>
            <p className="eyebrow">{member.role}</p>
            <p className="team-bio">{member.bio}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export const INQUIRY_TYPES = [
  { value: "player", label: "Player" },
  { value: "press", label: "Press / Media" },
  { value: "publisher", label: "Publisher / Business" },
  { value: "other", label: "Other" },
] as const;

const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  subject: z.string().trim().min(1).max(150),
  message: z.string().trim().min(1).max(2000),
  inquiry_type: z.enum(["player", "press", "publisher", "other"], {
    errorMap: () => ({ message: "Please select an inquiry type" }),
  }),
});

export function ContactSection({ socials, steamUrl, heading = "Contact", directText = "Or reach us directly at", email = CONTACT_EMAIL, preview = false }: { socials: typeof fallbackSocials & Record<string, any>; steamUrl?: string; heading?: string; directText?: string; email?: string; preview?: boolean }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [inquiryType, setInquiryType] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (preview) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const parsed = contactSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      subject: formData.get("subject"),
      message: formData.get("message"),
      inquiry_type: formData.get("inquiry_type"),
    });
    if (!parsed.success) {
      setStatus("error");
      setErrorMsg(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      await sendContact(parsed.data);
      setStatus("success");
      form.reset();
      setInquiryType("");
    } catch (error) {
      console.error(error);
      setStatus("error");
      setErrorMsg("Something went wrong. Please email us directly.");
    }
  };

  return (
    <section id="contact" className="contact-section">
      {heading && <h2 className="section-heading">{heading}</h2>}
      <form onSubmit={onSubmit} className="contact-form">
        <div className="contact-grid">
          <div className="field-group">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required maxLength={100} autoComplete="name" />
          </div>
          <div className="field-group">
            <Label htmlFor="inquiry_type">I am a</Label>
            <select id="inquiry_type" name="inquiry_type" required value={inquiryType} onChange={(event) => setInquiryType(event.target.value)}>
              <option value="" disabled>Select...</option>
              {INQUIRY_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </div>
          <div className="field-group">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required maxLength={255} autoComplete="email" />
          </div>
          <div className="field-group">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" name="subject" required maxLength={150} />
          </div>
          <div className="field-group contact-message">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" name="message" required rows={7} maxLength={2000} />
          </div>
        </div>

        {status === "success" && (
          <div className="form-notice form-success"><CheckCircle2 /><span>Thanks! Your message has been sent. We will get back to you soon.</span></div>
        )}
        {status === "error" && (
          <div className="form-notice form-error"><AlertCircle /><span>{errorMsg}</span></div>
        )}

        <Button type="submit" disabled={status === "loading"} className="contact-submit">
          {status === "loading" ? <><Loader2 className="animate-spin" /> Sending...</> : <><Send /> Send message</>}
        </Button>
      </form>

      <div className="contact-direct">
         {(directText || email) && <p>{directText} {email && <a href={`mailto:${email}`}>{email}</a>}</p>}
         <SocialIconLinks socials={{ ...socials, steam: steamUrl }} />
      </div>
    </section>
  );
}
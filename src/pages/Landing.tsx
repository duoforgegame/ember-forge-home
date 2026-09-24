import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Info, Loader2, Newspaper, Send } from "lucide-react";
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

type ProjectView = (typeof fallbackProjects)[number] & {
  pressKitEnabled?: boolean;
  moreInfoEnabled?: boolean;
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
      ? data.projects.map((project: any) => ({
          title: project.title,
          description: project.description,
          cover: project.cover_url,
          status: project.status as ProjectStatus,
          buttonLabel: project.button_label,
          buttonUrl: project.button_url,
          pressKitEnabled: !!project.press_kit_enabled,
          moreInfoEnabled: !!project.more_info_enabled,
        }))
      : fallbackProjects.map((project) => ({ ...project, pressKitEnabled: false, moreInfoEnabled: false }));

  const team =
    data?.team && data.team.length > 0
      ? data.team.map((member: any) => ({ name: member.name, role: member.role, bio: member.bio }))
      : fallbackTeam;

  return (
    <div className="public-landing min-h-screen">
      <div className="landing-shell">
        <Header />
        <main>
          <GamesHero projects={projects} />
          <MissionSection aboutText={data?.about?.intro_html ?? null} />
          <TeamSection team={team} />
          <ContactSection
            socials={data?.socials ?? fallbackSocials}
            steamUrl={projects.find((project) => /store\.steampowered\.com/i.test(project.buttonUrl))?.buttonUrl}
          />
        </main>
        <Footer />
      </div>
    </div>
  );
}

function GamesHero({ projects }: { projects: ProjectView[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeProject = projects[activeIndex];

  useEffect(() => {
    if (activeIndex >= projects.length) setActiveIndex(0);
  }, [activeIndex, projects.length]);

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
          ) : (
            <div className="game-art-placeholder">KEY ART PLACEHOLDER</div>
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

        <div className={`game-info-bar ${activeIndex % 2 === 0 ? "game-info-accent" : "game-info-dark"}`}>
          <div className="game-summary">
            <p className="eyebrow">{activeProject.status}</p>
            <h1>{activeProject.title}</h1>
            <p>{activeProject.description}</p>
            {(activeProject.moreInfoEnabled || activeProject.pressKitEnabled) && (
              <div className="game-secondary-links">
                {activeProject.moreInfoEnabled && (
                  <Link to={`/games/${slugify(activeProject.title)}`}><Info /> More info</Link>
                )}
                {activeProject.pressKitEnabled && (
                  <Link to={`/press/${slugify(activeProject.title)}`}><Newspaper /> Press kit</Link>
                )}
              </div>
            )}
          </div>
          {activeProject.buttonUrl && (
            <Button asChild variant="outline" className="game-cta">
              <a href={activeProject.buttonUrl} target="_blank" rel="noopener noreferrer">
                {activeProject.buttonLabel}
              </a>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

function MissionSection({ aboutText }: { aboutText: string | null }) {
  return (
    <section id="projects" className="mission-section">
      <div className="mission-grid">
        <div className="mission-lockup" aria-label="Games by gamers, for gamers">
          <span>Games by</span>
          <span>Gamers</span>
          <span>For</span>
          <span>Gamers</span>
        </div>
        <div className="mission-copy">
          {aboutText ? (
            <div dangerouslySetInnerHTML={{ __html: aboutText }} />
          ) : (
            <p>Duo Forge Games is a two-person indie studio from Lübeck. We are brothers, and every game we make is shaped together with the players who test it.</p>
          )}
          <span className="mission-rule" />
          <p className="mission-signoff">Forged together with our community.</p>
        </div>
      </div>
    </section>
  );
}

function TeamSection({ team }: { team: typeof fallbackTeam }) {
  return (
    <section id="about" className="team-section">
      <h2 className="section-heading">About us</h2>
      <div className="team-grid">
        {team.map((member) => (
          <article key={member.name} className="team-profile">
            <h3>{member.name}</h3>
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

function ContactSection({ socials, steamUrl }: { socials: typeof fallbackSocials; steamUrl?: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [inquiryType, setInquiryType] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
      <h2 className="section-heading">Contact</h2>
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
        <p>Or reach us directly at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
        <SocialIconLinks socials={{ ...socials, steam: steamUrl }} />
      </div>
    </section>
  );
}
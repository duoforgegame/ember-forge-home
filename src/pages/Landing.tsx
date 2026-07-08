import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, Send, Loader2, CheckCircle2, AlertCircle, Newspaper, Info } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Embers } from "@/components/Embers";
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
import { FeaturedGameCard, type FeaturedGameView } from "@/components/FeaturedGameCard";
import logoLarge from "@/assets/dfg-logo-large.png";

const DEFAULT_STATUS_COLORS: Record<string, string> = {
  "Play Now": "#10b981",
  "In Development": "#f59e0b",
  "Coming Soon": "#0ea5e9",
  Prototype: "#a1a1aa",
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

  const projects =
    data?.projects && data.projects.length > 0
      ? data.projects.map((p: any) => ({
          title: p.title,
          description: p.description,
          cover: p.cover_url,
          status: p.status as ProjectStatus,
          buttonLabel: p.button_label,
          buttonUrl: p.button_url,
          pressKitEnabled: !!p.press_kit_enabled,
          moreInfoEnabled: !!p.more_info_enabled,
        }))
      : fallbackProjects.map((p) => ({ ...p, pressKitEnabled: false, moreInfoEnabled: false }));

  const team =
    data?.team && data.team.length > 0
      ? data.team.map((t: any) => ({ name: t.name, role: t.role, bio: t.bio }))
      : fallbackTeam;

  const socials = data?.socials ?? fallbackSocials;
  const aboutText: string | null = data?.about?.intro_html ?? null;

  const statusColorMap: Record<string, string> = { ...DEFAULT_STATUS_COLORS };
  for (const c of data?.statusColors ?? []) statusColorMap[c.status] = c.color;

  return (
    <div className="relative min-h-screen">
      <Header />
      <main>
        <HomeSection />
        <ProjectsSection projects={projects} statusColorMap={statusColorMap} />
        <AboutSection team={team} aboutText={aboutText} />
        <ContactSection socials={socials} />
      </main>
      <Footer />
    </div>
  );
}

function HomeSection() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      setTilt({ x: nx * 10, y: -ny * 8 });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);
  return (
    <section id="home" className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <Embers />
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <div className="relative" style={{ perspective: "1200px" }}>
          <SwirlingParticles />
          <img
            src={logoLarge}
            alt="Duo Forge Games logo"
            className="relative z-10 h-[21rem] w-auto drop-shadow-[0_0_60px_oklch(0.68_0.17_45_/_0.5)] transition-transform duration-300 ease-out will-change-transform sm:h-[27rem] md:h-[32rem]"
            width={672}
            height={840}
            style={{ transform: `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`, transformStyle: "preserve-3d" }}
          />
        </div>
        <a
          href="#projects"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" });
          }}
          className="mt-8 text-muted-foreground transition-colors hover:text-primary"
          aria-label="Scroll to projects"
        >
          <ArrowDown className="h-6 w-6 animate-bounce" />
        </a>
      </div>
    </section>
  );
}

function SwirlingParticles() {
  const particles = Array.from({ length: 28 }, (_, i) => {
    const angle = (i / 28) * Math.PI * 2;
    const radius = 44 + (i % 4) * 6;
    return {
      key: i,
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius,
      delay: (i * 0.2) % 4,
      duration: 3 + (i % 5),
      size: 7 + (i % 4) * 2,
    };
  });
  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
      {particles.map((p) => (
        <span
          key={p.key}
          className="absolute rounded-full bg-primary-glow animate-orbit"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            boxShadow: "0 0 24px oklch(0.78 0.18 55 / 0.95), 0 0 48px oklch(0.68 0.17 45 / 0.6)",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration + 6}s`,
          }}
        />
      ))}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-12 flex flex-col items-center text-center">
      <h2 className="font-display text-3xl font-black uppercase tracking-wide sm:text-5xl">{children}</h2>
      <span className="mt-3 h-1 w-20 rounded-full bg-primary shadow-glow-sm" />
    </div>
  );
}

type ProjectView = (typeof fallbackProjects)[number] & { pressKitEnabled?: boolean; moreInfoEnabled?: boolean };

function ProjectsSection({ projects, statusColorMap }: { projects: ProjectView[]; statusColorMap: Record<string, string> }) {
  return (
    <section id="projects" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionTitle>Our Forge</SectionTitle>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <article
              key={p.title}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-glow"
            >
              <div className="relative aspect-video overflow-hidden bg-surface-2">
                <img
                  src={p.cover}
                  alt={`${p.title} cover art`}
                  loading="lazy"
                  width={1280}
                  height={720}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span
                  className="absolute left-3 top-3 rounded-md border px-2.5 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm"
                  style={statusBadgeStyle(statusColorMap[p.status] ?? DEFAULT_STATUS_COLORS[p.status] ?? "#a1a1aa")}
                >
                  {p.status}
                </span>
                {(p.pressKitEnabled || p.moreInfoEnabled) && (
                  <div className="absolute right-3 top-3 flex items-center gap-2">
                    {p.moreInfoEnabled && (
                      <Link
                        to={`/games/${slugify(p.title)}`}
                        title="More info"
                        aria-label={`More info about ${p.title}`}
                        className="grid h-9 w-9 place-items-center rounded-md border border-border/60 bg-background/70 text-muted-foreground backdrop-blur-sm transition hover:border-primary/60 hover:text-primary hover:shadow-glow-sm"
                      >
                        <Info className="h-4 w-4" />
                      </Link>
                    )}
                    {p.pressKitEnabled && (
                      <Link
                        to={`/press/${slugify(p.title)}`}
                        title="Press Kit"
                        aria-label={`${p.title} press kit`}
                        className="grid h-9 w-9 place-items-center rounded-md border border-border/60 bg-background/70 text-muted-foreground backdrop-blur-sm transition hover:border-primary/60 hover:text-primary hover:shadow-glow-sm"
                      >
                        <Newspaper className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-3 p-5">
                <h3 className="font-display text-xl font-bold">{p.title}</h3>
                <p className="flex-1 text-sm text-muted-foreground">{p.description}</p>
                <Button
                  asChild
                  className="mt-2 w-full bg-primary font-semibold text-primary-foreground hover:bg-primary-glow hover:shadow-glow-sm"
                >
                  <a href={p.buttonUrl} target="_blank" rel="noopener noreferrer">{p.buttonLabel}</a>
                </Button>
                {p.moreInfoEnabled && (
                  <Link
                    to={`/games/${slugify(p.title)}`}
                    className="inline-flex items-center justify-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition hover:text-primary"
                  >
                    <Info className="h-3.5 w-3.5" /> More info
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function AboutSection({ team, aboutText }: { team: typeof fallbackTeam; aboutText: string | null }) {
  return (
    <section id="about" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <SectionTitle>About Us</SectionTitle>
        {aboutText ? (
          <div
            className="mx-auto max-w-3xl text-center text-lg leading-relaxed text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: aboutText }}
          />
        ) : (
          <p className="mx-auto max-w-3xl text-center text-lg leading-relaxed text-muted-foreground">
            <span className="text-foreground font-semibold">Duo Forge Games</span> is a
            two-person indie studio from Lübeck, Germany, founded by two brothers. We've
            been building games in Unity for over four years. Our philosophy:{" "}
            <span className="text-primary">games by gamers, for gamers.</span>
          </p>
        )}
        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {team.map((m) => (
            <div key={m.name} className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/50">
              <div className="flex items-center gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary/15 font-display text-xl font-bold text-primary">
                  {m.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-display text-lg font-bold">{m.name}</h3>
                  <p className="text-sm text-primary">{m.role}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{m.bio}</p>
            </div>
          ))}
        </div>
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

function ContactSection({ socials }: { socials: typeof fallbackSocials }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [inquiryType, setInquiryType] = useState<string>("");

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const parsed = contactSchema.safeParse({
      name: fd.get("name"),
      email: fd.get("email"),
      subject: fd.get("subject"),
      message: fd.get("message"),
      inquiry_type: fd.get("inquiry_type"),
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
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMsg("Something went wrong. Please email us directly.");
    }
  };

  return (
    <section id="contact" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionTitle>Contact</SectionTitle>
        <form onSubmit={onSubmit} className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required maxLength={100} autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inquiry_type">I am a</Label>
              <select
                id="inquiry_type"
                name="inquiry_type"
                required
                value={inquiryType}
                onChange={(e) => setInquiryType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" disabled>Select…</option>
                {INQUIRY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required maxLength={255} autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" name="subject" required maxLength={150} />
            </div>
          </div>
          <div className="mt-5 space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" name="message" required rows={6} maxLength={2000} />
          </div>


          {status === "success" && (
            <div className="mt-5 flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Thanks! Your message has been sent — we'll get back to you soon.</span>
            </div>
          )}
          {status === "error" && (
            <div className="mt-5 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={status === "loading"}
            className="mt-6 w-full bg-primary font-semibold text-primary-foreground hover:bg-primary-glow hover:shadow-glow sm:w-auto"
          >
            {status === "loading" ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
            ) : (
              <><Send className="mr-2 h-4 w-4" /> Send Message</>
            )}
          </Button>
        </form>

        <div className="mt-8 flex flex-col items-center gap-5 text-center">
          <p className="text-sm text-muted-foreground">
            Or reach us directly at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline-offset-4 hover:underline">
              {CONTACT_EMAIL}
            </a>
          </p>
          <SocialLinks socials={socials} />
        </div>
      </div>
    </section>
  );
}

function SocialLinks({ socials }: { socials: typeof fallbackSocials }) {
  const items = [
    { href: socials.twitter, label: "X (Twitter)", icon: XIcon },
    { href: socials.tiktok, label: "TikTok", icon: TikTokIcon },
    { href: socials.instagram, label: "Instagram", icon: InstagramIcon },
    { href: socials.discord, label: "Discord", icon: DiscordIcon },
    { href: socials.youtube, label: "YouTube", icon: YouTubeIcon },
  ].filter((s) => !!s.href);
  return (
    <div className="flex items-center gap-3">
      {items.map((s) => (
        <a
          key={s.label}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={s.label}
          className="grid h-10 w-10 place-items-center rounded-md border border-border bg-surface text-muted-foreground transition-all hover:border-primary/60 hover:text-primary hover:shadow-glow-sm"
        >
          <s.icon className="h-5 w-5" />
        </a>
      ))}
    </div>
  );
}

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (<svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M18.244 2H21.5l-7.5 8.57L22.5 22h-6.844l-5.36-6.99L4.2 22H.94l8.02-9.16L.75 2h7.02l4.84 6.4L18.244 2Zm-2.4 18h1.9L7.24 4H5.22l10.624 16Z" /></svg>);
}
function TikTokIcon(props: React.SVGProps<SVGSVGElement>) {
  return (<svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M19.6 6.7a5.7 5.7 0 0 1-3.4-1.1 5.7 5.7 0 0 1-2.2-3.6h-3.4v13.2a2.7 2.7 0 1 1-2.7-2.7c.3 0 .6 0 .8.1V9.1a6.1 6.1 0 0 0-.8-.1 6.2 6.2 0 1 0 6.2 6.2V9.5a9 9 0 0 0 5.5 1.9V8a5.6 5.6 0 0 1 0-1.3Z" /></svg>);
}
function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>);
}
function DiscordIcon(props: React.SVGProps<SVGSVGElement>) {
  return (<svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3c-.2.36-.44.845-.6 1.23a18.27 18.27 0 0 0-5.918 0A12.6 12.6 0 0 0 9.44 3a19.74 19.74 0 0 0-3.76 1.37C2.06 9.09 1.09 13.68 1.57 18.2A19.9 19.9 0 0 0 7.62 21a14.5 14.5 0 0 0 1.24-2c-.68-.26-1.32-.58-1.92-.95.16-.12.32-.24.47-.36 3.7 1.72 7.7 1.72 11.35 0 .16.12.31.24.47.36-.6.37-1.24.69-1.92.95.36.7.77 1.37 1.24 2a19.87 19.87 0 0 0 6.06-2.8c.56-5.28-.96-9.83-4.31-13.83ZM8.68 15.33c-1.18 0-2.15-1.08-2.15-2.4 0-1.32.95-2.4 2.15-2.4 1.2 0 2.17 1.09 2.15 2.4 0 1.32-.95 2.4-2.15 2.4Zm6.63 0c-1.18 0-2.15-1.08-2.15-2.4 0-1.32.95-2.4 2.15-2.4 1.2 0 2.17 1.09 2.15 2.4 0 1.32-.95 2.4-2.15 2.4Z" /></svg>);
}
function YouTubeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (<svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1 31.4 31.4 0 0 0 .5-5.8 31.4 31.4 0 0 0-.5-5.8ZM9.6 15.6V8.4L15.8 12l-6.2 3.6Z" /></svg>);
}

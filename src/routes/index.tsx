import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import {
  ArrowDown,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Embers } from "@/components/Embers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  projects,
  team,
  socials,
  CONTACT_EMAIL,
  type ProjectStatus,
} from "@/lib/site-data";
import logoLarge from "@/assets/dfg-logo-large.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Duo Forge Games | Indie Game Studio" },
      {
        name: "description",
        content:
          "Duo Forge Games is a two-brother indie studio from Lübeck, Germany. Games by gamers, for gamers — building unique roguelikes and idle games in Unity.",
      },
      { property: "og:title", content: "Duo Forge Games | Indie Game Studio" },
      {
        property: "og:description",
        content: "Games by gamers, for gamers. Indie studio from Lübeck, Germany.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: LandingPage,
});

const statusStyles: Record<ProjectStatus, string> = {
  "Play Now": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "In Development": "bg-primary/15 text-primary border-primary/40",
  "Coming Soon": "bg-sky-500/15 text-sky-400 border-sky-500/30",
  Prototype: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
};

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HomeSection />
        <ProjectsSection />
        <AboutSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}

function HomeSection() {
  return (
    <section
      id="home"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-grid"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
      <Embers />
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <img
          src={logoLarge}
          alt="Duo Forge Games logo"
          className="mb-6 h-40 w-auto drop-shadow-[0_0_40px_oklch(0.68_0.17_45_/_0.35)] sm:h-56"
          width={224}
          height={280}
        />
        <h1 className="font-display text-4xl font-black tracking-tight sm:text-6xl md:text-7xl">
          DUO <span className="text-primary text-glow">FORGE</span> GAMES
        </h1>
        <p className="mt-4 max-w-xl text-base uppercase tracking-[0.3em] text-muted-foreground sm:text-lg">
          Games by Gamers
        </p>
        <a
          href="#projects"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" });
          }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted-foreground transition-colors hover:text-primary"
          aria-label="Scroll to projects"
        >
          <ArrowDown className="h-6 w-6 animate-bounce" />
        </a>
      </div>
    </section>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-12 flex flex-col items-center text-center">
      <h2 className="font-display text-3xl font-black uppercase tracking-wide sm:text-5xl">
        {children}
      </h2>
      <span className="mt-3 h-1 w-20 rounded-full bg-primary shadow-glow-sm" />
    </div>
  );
}

function ProjectsSection() {
  return (
    <section id="projects" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionTitle>Projects</SectionTitle>
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
                  className={`absolute left-3 top-3 rounded-md border px-2.5 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm ${statusStyles[p.status]}`}
                >
                  {p.status}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-5">
                <h3 className="font-display text-xl font-bold">{p.title}</h3>
                <p className="flex-1 text-sm text-muted-foreground">{p.description}</p>
                <Button
                  asChild
                  className="mt-2 w-full bg-primary font-semibold text-primary-foreground hover:bg-primary-glow hover:shadow-glow-sm"
                >
                  <a href={p.buttonUrl} target="_blank" rel="noopener noreferrer">
                    {p.buttonLabel}
                  </a>
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section id="about" className="relative bg-surface/40 py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <SectionTitle>About Us</SectionTitle>
        <p className="mx-auto max-w-3xl text-center text-lg leading-relaxed text-muted-foreground">
          <span className="text-foreground font-semibold">Duo Forge Games</span> is a
          two-person indie studio from Lübeck, Germany, founded by two brothers. We've
          been building games in Unity for over four years. Our philosophy:{" "}
          <span className="text-primary">games by gamers, for gamers.</span>
        </p>
        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {team.map((m) => (
            <div
              key={m.name}
              className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/50"
            >
              <div className="flex items-center gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary/15 font-display text-xl font-bold text-primary">
                  {m.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
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

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  subject: z.string().trim().min(1, "Subject is required").max(150),
  message: z.string().trim().min(1, "Message is required").max(2000),
});

function ContactSection() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const parsed = contactSchema.safeParse({
      name: fd.get("name"),
      email: fd.get("email"),
      subject: fd.get("subject"),
      message: fd.get("message"),
    });
    if (!parsed.success) {
      setStatus("error");
      setErrorMsg(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch(`https://formsubmit.co/ajax/${CONTACT_EMAIL}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          ...parsed.data,
          _subject: `[Duo Forge Games] ${parsed.data.subject}`,
          _template: "table",
        }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      setStatus("success");
      form.reset();
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
        <form
          onSubmit={onSubmit}
          className="rounded-xl border border-border bg-card p-6 sm:p-8"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required maxLength={100} autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                maxLength={255}
                autoComplete="email"
              />
            </div>
          </div>
          <div className="mt-5 space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" name="subject" required maxLength={150} />
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
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" /> Send Message
              </>
            )}
          </Button>
        </form>

        <div className="mt-8 flex flex-col items-center gap-5 text-center">
          <p className="text-sm text-muted-foreground">
            Or reach us directly at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
          <SocialLinks />
        </div>
      </div>
    </section>
  );
}

function SocialLinks() {
  const items = [
    { href: socials.twitter, label: "X (Twitter)", icon: XIcon },
    { href: socials.tiktok, label: "TikTok", icon: TikTokIcon },
    { href: socials.discord, label: "Discord", icon: DiscordIcon },
    { href: socials.youtube, label: "YouTube", icon: YouTubeIcon },
  ];
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
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.244 2H21.5l-7.5 8.57L22.5 22h-6.844l-5.36-6.99L4.2 22H.94l8.02-9.16L.75 2h7.02l4.84 6.4L18.244 2Zm-2.4 18h1.9L7.24 4H5.22l10.624 16Z" />
    </svg>
  );
}
function TikTokIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M19.6 6.7a5.7 5.7 0 0 1-3.4-1.1 5.7 5.7 0 0 1-2.2-3.6h-3.4v13.2a2.7 2.7 0 1 1-2.7-2.7c.3 0 .6 0 .8.1V9.1a6.1 6.1 0 0 0-.8-.1 6.2 6.2 0 1 0 6.2 6.2V9.5a9 9 0 0 0 5.5 1.9V8a5.6 5.6 0 0 1 0-1.3Z" />
    </svg>
  );
}
function DiscordIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3c-.2.36-.44.845-.6 1.23a18.27 18.27 0 0 0-5.918 0A12.6 12.6 0 0 0 9.44 3a19.74 19.74 0 0 0-3.76 1.37C2.06 9.09 1.09 13.68 1.57 18.2A19.9 19.9 0 0 0 7.62 21a14.5 14.5 0 0 0 1.24-2c-.68-.26-1.32-.58-1.92-.95.16-.12.32-.24.47-.36 3.7 1.72 7.7 1.72 11.35 0 .16.12.31.24.47.36-.6.37-1.24.69-1.92.95.36.7.77 1.37 1.24 2a19.87 19.87 0 0 0 6.06-2.8c.56-5.28-.96-9.83-4.31-13.83ZM8.68 15.33c-1.18 0-2.15-1.08-2.15-2.4 0-1.32.95-2.4 2.15-2.4 1.2 0 2.17 1.09 2.15 2.4 0 1.32-.95 2.4-2.15 2.4Zm6.63 0c-1.18 0-2.15-1.08-2.15-2.4 0-1.32.95-2.4 2.15-2.4 1.2 0 2.17 1.09 2.15 2.4 0 1.32-.95 2.4-2.15 2.4Z" />
    </svg>
  );
}
function YouTubeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1 31.4 31.4 0 0 0 .5-5.8 31.4 31.4 0 0 0-.5-5.8ZM9.6 15.6V8.4L15.8 12l-6.2 3.6Z" />
    </svg>
  );
}


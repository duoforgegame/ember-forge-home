import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import logo from "@/assets/dfg-logo.png";

const NAV = [
  { id: "home", label: "Home" },
  { id: "projects", label: "Our Forge" },
  { id: "about", label: "About Us" },
  { id: "contact", label: "Contact" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("home");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = NAV.map((n) => document.getElementById(n.id)).filter(
      (el): el is HTMLElement => !!el,
    );
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    const el = document.getElementById(id);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", `#${id}`);
    }
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/70 backdrop-blur-md border-b border-border/60"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          to="/"
          onClick={scrollTo("home")}
          className="flex min-w-0 items-center gap-2.5"
        >
          <img src={logo} alt="Duo Forge Games" className="h-9 w-9 shrink-0" width={36} height={36} />
          <span className="hidden font-display text-base font-bold tracking-wide sm:inline">
            DUO FORGE GAMES
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {NAV.map((n) => {
            const isActive = active === n.id;
            return (
              <a
                key={n.id}
                href={`#${n.id}`}
                onClick={scrollTo(n.id)}
                className={`relative px-2.5 py-2 text-sm font-medium transition-colors sm:px-3.5 ${
                  isActive
                    ? "text-primary text-glow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {n.label}
                {isActive && (
                  <span className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-primary shadow-glow-sm" />
                )}
              </a>
            );
          })}
          <a
            href="https://discord.gg/9mJ4XA6YrB"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 hidden items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary-glow hover:shadow-glow-sm sm:inline-flex"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3c-.2.36-.44.845-.6 1.23a18.27 18.27 0 0 0-5.918 0A12.6 12.6 0 0 0 9.44 3a19.74 19.74 0 0 0-3.76 1.37C2.06 9.09 1.09 13.68 1.57 18.2A19.9 19.9 0 0 0 7.62 21a14.5 14.5 0 0 0 1.24-2c-.68-.26-1.32-.58-1.92-.95.16-.12.32-.24.47-.36 3.7 1.72 7.7 1.72 11.35 0 .16.12.31.24.47.36-.6.37-1.24.69-1.92.95.36.7.77 1.37 1.24 2a19.87 19.87 0 0 0 6.06-2.8c.56-5.28-.96-9.83-4.31-13.83ZM8.68 15.33c-1.18 0-2.15-1.08-2.15-2.4 0-1.32.95-2.4 2.15-2.4 1.2 0 2.17 1.09 2.15 2.4 0 1.32-.95 2.4-2.15 2.4Zm6.63 0c-1.18 0-2.15-1.08-2.15-2.4 0-1.32.95-2.4 2.15-2.4 1.2 0 2.17 1.09 2.15 2.4 0 1.32-.95 2.4-2.15 2.4Z" />
            </svg>
            Discord
          </a>
        </nav>
      </div>
    </header>
  );
}

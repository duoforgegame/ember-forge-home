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
        </nav>
      </div>
    </header>
  );
}

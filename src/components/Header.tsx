import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import logo from "@/assets/dfg-logo.png";

type HeaderLink = { id?: string; label: string; url: string; sort_order?: number };

const FALLBACK: HeaderLink[] = [
  { label: "Home", url: "#home" },
  { label: "Our Forge", url: "#projects" },
  { label: "About Us", url: "#about" },
  { label: "Contact", url: "#contact" },
  { label: "Discord", url: "https://discord.gg/9mJ4XA6YrB" },
];

const isInternal = (url: string) => url.startsWith("#");
const isExternal = (url: string) => /^https?:\/\//i.test(url);

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("home");
  const location = useLocation();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ["header-links"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_header_links")
        .select("*")
        .order("sort_order");
      return (data ?? []) as HeaderLink[];
    },
    retry: 0,
  });

  const links = data && data.length > 0 ? data : FALLBACK;
  const internalIds = useMemo(
    () => links.filter((l) => isInternal(l.url)).map((l) => l.url.slice(1)),
    [links],
  );

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = internalIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
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
  }, [internalIds]);

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
          {links.map((l, i) => {
            if (isInternal(l.url)) {
              const id = l.url.slice(1);
              const isActive = active === id;
              return (
                <a
                  key={`${l.label}-${i}`}
                  href={l.url}
                  onClick={scrollTo(id)}
                  className={`relative px-2.5 py-2 text-sm font-medium transition-colors sm:px-3.5 ${
                    isActive
                      ? "text-primary text-glow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {l.label}
                  {isActive && (
                    <span className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-primary shadow-glow-sm" />
                  )}
                </a>
              );
            }
            if (isExternal(l.url)) {
              return (
                <a
                  key={`${l.label}-${i}`}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 hidden items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary-glow hover:shadow-glow-sm sm:inline-flex"
                >
                  {l.label}
                </a>
              );
            }
            return (
              <Link
                key={`${l.label}-${i}`}
                to={l.url}
                className="px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:px-3.5"
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

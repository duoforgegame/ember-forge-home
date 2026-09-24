import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Menu, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import logo from "@/assets/dfg-logo.png";
import bannerLogo from "@/assets/dfg-logo-large.png";
import discordIcon from "@/assets/social/icons8-discord-64.png";

type HeaderLink = { id?: string; label: string; url: string; sort_order?: number };
type HeaderSettings = { header_banner_logo_url?: string; header_sticky_logo_url?: string; header_studio_line?: string; header_established_line?: string; discord_button_label?: string; discord_button_url?: string };

const FALLBACK: HeaderLink[] = [
  { label: "Home", url: "#home" },
  { label: "Games", url: "#home" },
  { label: "About Us", url: "#about" },
  { label: "Contact", url: "#contact" },
  { label: "Discord", url: "https://discord.gg/9mJ4XA6YrB" },
];

const isInternal = (url: string) => url.startsWith("#");
const isExternal = (url: string) => /^https?:\/\//i.test(url);

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === "/";

  const { data } = useQuery({
    queryKey: ["header-links"],
    queryFn: async () => {
      const [links, settings] = await Promise.all([
        supabase.from("site_header_links").select("*").order("sort_order"),
        supabase.from("site_landing_settings").select("*").eq("id", 1).maybeSingle(),
      ]);
      return { links: (links.data ?? []) as (HeaderLink & { visible?: boolean })[], settings: settings.data as HeaderSettings | null };
    },
    retry: 0,
  });

  const links = data?.links?.length ? data.links.filter((link) => link.visible !== false) : FALLBACK;
  const settings = data?.settings;
  const navLinks = links.filter((link) => link.label.toLowerCase() !== "discord");
  const discordLink = links.find((link) => link.label.toLowerCase() === "discord") ?? (settings?.discord_button_url ? { label: settings.discord_button_label || "Discord", url: settings.discord_button_url } : undefined);
  const internalIds = useMemo(() => navLinks.filter((link) => isInternal(link.url)).map((link) => link.url.slice(1)), [navLinks]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 150);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = internalIds.map((id) => document.getElementById(id)).filter((element): element is HTMLElement => !!element);
    if (sections.length === 0) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: "-40% 0px -55% 0px", threshold: 0 });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [internalIds]);

  useEffect(() => {
    if (location.pathname !== "/" || !location.hash) return;
    const timer = setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    return () => clearTimeout(timer);
  }, [location.pathname, location.hash]);

  const scrollTo = (id: string) => (event: React.MouseEvent) => {
    event.preventDefault();
    setMenuOpen(false);
    if (!isLanding) {
      navigate(`/#${id}`);
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  };

  const renderLink = (link: HeaderLink, index: number) => {
    if (isInternal(link.url)) {
      const id = link.url.slice(1);
      return <a key={`${link.label}-${index}`} href={link.url} onClick={scrollTo(id)} className={active === id ? "is-active" : ""}>{link.label}</a>;
    }
    if (isExternal(link.url)) {
      return <a key={`${link.label}-${index}`} href={link.url} target="_blank" rel="noopener noreferrer">{link.label}</a>;
    }
    return <Link key={`${link.label}-${index}`} to={link.url} onClick={() => setMenuOpen(false)}>{link.label}</Link>;
  };

  return (
    <header className={`site-header ${scrolled ? "is-compact" : ""}`} style={{ top: "var(--banner-h, 0px)" }}>
      {isLanding && !scrolled && (
        <div className="studio-banner">
          {(settings?.header_banner_logo_url || bannerLogo) && <img src={settings?.header_banner_logo_url || bannerLogo} alt="Duo Forge Games" />}
          {settings?.header_studio_line !== "" && <p>{settings?.header_studio_line || "A two-person indie studio from Lübeck, Germany"}</p>}
          {settings?.header_established_line !== "" && <span>{settings?.header_established_line || "Est. 2021"}</span>}
        </div>
      )}

      <div className="header-inner">
        <Link to="/" onClick={scrollTo("home")} className="compact-brand" aria-label="Duo Forge Games home">
          <img src={settings?.header_sticky_logo_url || logo} alt="" width={42} height={42} />
          <span>Duo Forge Games</span>
        </Link>

        <Button type="button" variant="ghost" size="icon" className="mobile-menu-button" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle navigation" aria-expanded={menuOpen}>
          {menuOpen ? <X /> : <Menu />}
        </Button>

        <nav className={`main-nav ${menuOpen ? "is-open" : ""}`} aria-label="Primary navigation">
          {navLinks.map(renderLink)}
          {discordLink && (
            <Button asChild className="discord-button">
              <a href={discordLink.url} target={isExternal(discordLink.url) ? "_blank" : undefined} rel={isExternal(discordLink.url) ? "noopener noreferrer" : undefined} aria-label={discordLink.label} title={discordLink.label}>
                <img src={discordIcon} alt="" aria-hidden="true" />
              </a>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
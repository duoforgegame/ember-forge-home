import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import logo from "@/assets/dfg-logo.png";

type FooterLink = { id?: string; label: string; url: string; sort_order?: number };

const FALLBACK: FooterLink[] = [
  { label: "Imprint", url: "/imprint" },
  { label: "Privacy Policy", url: "/privacy" },
];

const isInternal = (url: string) => url.startsWith("#");
const isExternal = (url: string) => /^https?:\/\//i.test(url);

const scrollTo = (id: string) => (e: React.MouseEvent) => {
  const el = document.getElementById(id);
  if (el) {
    e.preventDefault();
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  }
};

export function Footer() {
  const { data } = useQuery({
    queryKey: ["footer-links"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_footer_links")
        .select("*")
        .order("sort_order");
      return (data ?? []) as FooterLink[];
    },
    retry: 0,
  });

  const links = data && data.length > 0 ? data : FALLBACK;

  return (
    <footer className="relative border-t border-border/60">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Duo Forge Games" className="h-10 w-10" width={40} height={40} />
          <div>
            <div className="font-display text-sm font-bold tracking-wider">DUO FORGE GAMES</div>
            <div className="text-xs text-muted-foreground">Games by gamers, for gamers.</div>
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          {links.map((l, i) => {
            const cls = "text-muted-foreground transition-colors hover:text-primary";
            if (isInternal(l.url)) {
              return (
                <a key={`${l.label}-${i}`} href={l.url} onClick={scrollTo(l.url.slice(1))} className={cls}>
                  {l.label}
                </a>
              );
            }
            if (isExternal(l.url)) {
              return (
                <a key={`${l.label}-${i}`} href={l.url} target="_blank" rel="noopener noreferrer" className={cls}>
                  {l.label}
                </a>
              );
            }
            return (
              <Link key={`${l.label}-${i}`} to={l.url} className={cls}>
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="text-xs text-muted-foreground">
          © 2026 Duo Forge Games. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

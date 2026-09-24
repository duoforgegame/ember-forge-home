import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import logo from "@/assets/dfg-logo-large.png";

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
      const [links, settings] = await Promise.all([
        supabase.from("site_footer_links").select("*").order("sort_order"),
        supabase.from("site_landing_settings").select("*").eq("id", 1).maybeSingle(),
      ]);
      return { links: (links.data ?? []) as FooterLink[], settings: settings.data as { footer_logo_url?: string; footer_copyright?: string } | null };
    },
    retry: 0,
  });

  const links = data?.links?.length ? data.links : FALLBACK;

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <Link to="/" className="footer-logo" aria-label="Duo Forge Games home">
          <img src={data?.settings?.footer_logo_url || logo} alt="Duo Forge Games" />
        </Link>
        <nav className="footer-legal" aria-label="Legal">
          {links.map((l, i) => {
            const cls = "footer-link";
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
        <div className="footer-copyright">
          {data?.settings?.footer_copyright || "© 2026 Duo Forge Games. All rights reserved."}
        </div>
      </div>
    </footer>
  );
}

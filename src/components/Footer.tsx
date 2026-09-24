import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import logo from "@/assets/dfg-logo-banner.png.asset.json";

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
    <footer className="site-footer">
      <div className="footer-inner">
        <Link to="/" className="footer-logo" aria-label="Duo Forge Games home">
          <img src={logo.url} alt="Duo Forge Games" />
        </Link>
        <nav>
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
          © 2026 Duo Forge Games. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

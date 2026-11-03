import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { SitePageShell } from "@/pages/LandingPrototype";

/* Imprint and Privacy Policy. The text is edited in the admin (Legal pages) and stored in site_legal. */
export function LegalPage({ slug, title }: { slug: "imprint" | "privacy"; title: string }) {
  const [html, setHtml] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    document.title = `${title} | Duo Forge Games`;
    (async () => {
      const { data } = await supabase.from("site_legal").select("*").eq("slug", slug).maybeSingle();
      if (data?.body_html) setHtml(data.body_html);
      setLoaded(true);
    })();
  }, [slug, title]);

  return (
    <SitePageShell>
      <section className="legal-hero">
        <p className="pixel-label">Legal</p>
        <h1>{title}</h1>
      </section>
      <article className="legal-body">
        {!loaded && <p className="legal-loading">Loading…</p>}
        {loaded && !html && <p className="legal-loading">This page hasn't been written yet.</p>}
        {/* Written by the studio in the admin; may contain simple HTML. */}
        {html && <div dangerouslySetInnerHTML={{ __html: html }} />}
      </article>
    </SitePageShell>
  );
}

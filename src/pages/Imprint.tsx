import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/lib/supabase";

export default function Imprint() {
  const [title, setTitle] = useState("Impressum");
  const [html, setHtml] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_legal").select("title, body_html").eq("slug", "imprint").maybeSingle();
      if (data?.title) setTitle(data.title);
      if (data?.body_html) setHtml(data.body_html);
      setLoaded(true);
    })();
  }, []);

  return (
    <div className="relative min-h-screen">
      <Header />
      <main className="mx-auto max-w-3xl px-4 pt-32 pb-16 sm:px-6">
        <h1 className="font-display text-3xl font-black uppercase sm:text-4xl">{title}</h1>
        <div
          className="legal-content mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:font-semibold [&_h2]:text-foreground [&_a]:text-primary hover:[&_a]:underline"
          dangerouslySetInnerHTML={{ __html: loaded ? html : "" }}
        />
      </main>
      <Footer />
    </div>
  );
}

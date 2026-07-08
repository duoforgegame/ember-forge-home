import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/imprint")({
  head: () => ({
    meta: [
      { title: "Imprint | Duo Forge Games" },
      { name: "description", content: "Legal information (Impressum) for Duo Forge Games." },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/imprint" }],
  }),
  component: ImprintPage,
});

function ImprintPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-32 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <h1 className="mt-6 font-display text-4xl font-black">Imprint</h1>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-2 font-display text-lg font-bold text-foreground">
              Information according to § 5 TMG
            </h2>
            <p>
              Duo Forge Games GbR
              <br />
              [Street and House Number]
              <br />
              23552 Lübeck
              <br />
              Germany
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-lg font-bold text-foreground">Represented by</h2>
            <p>[First Name Last Name], [First Name Last Name]</p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-lg font-bold text-foreground">Contact</h2>
            <p>
              Email: info@duoforgegames.com
              <br />
              Phone: [Phone Number]
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-lg font-bold text-foreground">VAT ID</h2>
            <p>
              VAT identification number according to § 27 a of the German VAT Act:
              <br />
              [DE123456789]
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-lg font-bold text-foreground">
              Responsible for content according to § 55 Abs. 2 RStV
            </h2>
            <p>
              [First Name Last Name]
              <br />
              [Street and House Number]
              <br />
              23552 Lübeck
            </p>
          </section>
          <p className="text-xs text-muted-foreground/70">
            This is a placeholder template. Please replace bracketed fields with your actual legal
            information before publishing.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

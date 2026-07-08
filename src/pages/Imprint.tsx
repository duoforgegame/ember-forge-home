import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function Imprint() {
  return (
    <div className="relative min-h-screen">
      <Header />
      <main className="mx-auto max-w-3xl px-4 pt-32 pb-16 sm:px-6">
        <h1 className="font-display text-3xl font-black uppercase sm:text-4xl">Impressum</h1>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="font-semibold text-foreground">Angaben gemäß § 5 TMG</h2>
            <p className="mt-2">
              Duo Forge Games<br />
              [Straße und Hausnummer]<br />
              [PLZ] Lübeck<br />
              Deutschland
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-foreground">Kontakt</h2>
            <p className="mt-2">
              E-Mail:{" "}
              <a href="mailto:info@duoforgegames.com" className="text-primary hover:underline">
                info@duoforgegames.com
              </a>
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-foreground">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
            <p className="mt-2">[Name der verantwortlichen Person], Anschrift wie oben</p>
          </section>
          <section>
            <h2 className="font-semibold text-foreground">Haftungsausschluss</h2>
            <p className="mt-2">
              Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links.
              Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
            </p>
          </section>
          <p className="text-xs italic">
            Hinweis: Bitte Platzhalter durch die tatsächlichen Angaben ersetzen, bevor die Website veröffentlicht wird.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

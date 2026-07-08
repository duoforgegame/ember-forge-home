import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function Privacy() {
  return (
    <div className="relative min-h-screen">
      <Header />
      <main className="mx-auto max-w-3xl px-4 pt-32 pb-16 sm:px-6">
        <h1 className="font-display text-3xl font-black uppercase sm:text-4xl">Datenschutzerklärung</h1>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="font-semibold text-foreground">1. Verantwortlicher</h2>
            <p className="mt-2">Duo Forge Games, [Anschrift], E-Mail: info@duoforgegames.com</p>
          </section>
          <section>
            <h2 className="font-semibold text-foreground">2. Erhebung und Speicherung personenbezogener Daten</h2>
            <p className="mt-2">
              Bei Nutzung unseres Kontaktformulars werden die von Ihnen angegebenen Daten (Name, E-Mail-Adresse,
              Betreff, Nachricht) zur Bearbeitung Ihrer Anfrage gespeichert. Die Daten werden per verschlüsselter
              SMTP-Verbindung (IONOS) an unser Postfach übermittelt und in unserer Datenbank (Supabase, Region EU)
              für die Dauer der Bearbeitung aufbewahrt.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-foreground">3. Rechtsgrundlage</h2>
            <p className="mt-2">
              Die Verarbeitung erfolgt gemäß Art. 6 Abs. 1 lit. b DSGVO zur Durchführung vorvertraglicher Maßnahmen
              bzw. Art. 6 Abs. 1 lit. f DSGVO auf Basis unseres berechtigten Interesses an der Beantwortung Ihrer Anfrage.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-foreground">4. Cookies & Tracking</h2>
            <p className="mt-2">
              Diese Website setzt keine Cookies zu Tracking- oder Analysezwecken ein. Es werden keine
              Drittanbieter-Skripte eingebunden, die personenbezogene Daten erheben.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-foreground">5. Ihre Rechte</h2>
            <p className="mt-2">
              Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
              Datenübertragbarkeit sowie Widerspruch. Zur Ausübung wenden Sie sich bitte an{" "}
              <a href="mailto:info@duoforgegames.com" className="text-primary hover:underline">
                info@duoforgegames.com
              </a>
              .
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-foreground">6. Hosting</h2>
            <p className="mt-2">
              Die Website wird auf einem von uns betriebenen Server gehostet. Datenbank- und Serverfunktionen werden
              über Supabase (Region EU) bereitgestellt. E-Mails werden über IONOS SE, Elgendorfer Str. 57,
              56410 Montabaur, versandt.
            </p>
          </section>
          <p className="text-xs italic">
            Hinweis: Dieser Text ist ein Muster und ersetzt keine individuelle Rechtsberatung. Bitte vor
            Veröffentlichung durch einen Fachanwalt prüfen lassen.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | Duo Forge Games" },
      { name: "description", content: "Privacy policy of Duo Forge Games." },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
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
        <h1 className="mt-6 font-display text-4xl font-black">Privacy Policy</h1>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-2 font-display text-lg font-bold text-foreground">1. Overview</h2>
            <p>
              The following notes provide a simple overview of what happens to your personal data
              when you visit this website. Personal data is any data that can be used to identify
              you personally.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-lg font-bold text-foreground">
              2. Data Collection on this Website
            </h2>
            <p>
              Data collection on this website is carried out by the website operator. The operator's
              contact details can be found in the imprint of this website.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-lg font-bold text-foreground">
              3. Contact Form
            </h2>
            <p>
              If you send us inquiries via the contact form, your details from the form, including
              the contact data you provided there, will be stored by us for the purpose of
              processing the inquiry and in case of follow-up questions. We do not share this data
              without your consent.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-lg font-bold text-foreground">4. Hosting</h2>
            <p>
              Our website is hosted by an external service provider (hoster). Personal data
              collected on this website is stored on the hoster's servers. The use of the hoster is
              based on Art. 6 (1) lit. f GDPR.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-lg font-bold text-foreground">5. Cookies</h2>
            <p>
              Our website uses so-called cookies. Cookies are small text files that do no damage to
              your device. They are either stored temporarily for the duration of a session
              (session cookies) or permanently (permanent cookies) on your device.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-lg font-bold text-foreground">
              6. Your Rights under GDPR
            </h2>
            <p>You have the following rights regarding your personal data:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Right of access (Art. 15 GDPR)</li>
              <li>Right to rectification (Art. 16 GDPR)</li>
              <li>Right to erasure (Art. 17 GDPR)</li>
              <li>Right to restriction of processing (Art. 18 GDPR)</li>
              <li>Right to data portability (Art. 20 GDPR)</li>
              <li>Right to object (Art. 21 GDPR)</li>
              <li>Right to lodge a complaint with a supervisory authority</li>
            </ul>
          </section>
          <p className="text-xs text-muted-foreground/70">
            This is a placeholder privacy policy template. Please have it reviewed by a legal
            professional before publishing.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

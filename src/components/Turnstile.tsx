import { useEffect, useRef } from "react";

export const TURNSTILE_SITE_KEY = "0x4AAAAAAAEAAQeMx29KDAAwT";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;
function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const el = document.createElement("script");
      el.src = SCRIPT_SRC;
      el.async = true;
      el.defer = true;
      el.onload = () => resolve();
      el.onerror = () => reject(new Error("Could not load the verification widget"));
      document.head.appendChild(el);
    });
  }
  return scriptPromise;
}

/** Resets every rendered Turnstile widget, tokens are single use. */
export function resetTurnstile() {
  try { window.turnstile?.reset(); } catch { /* widget not ready */ }
}

type Props = { onToken: (token: string) => void };

/** Cloudflare Turnstile checkbox, calls onToken with the fresh token (empty when expired). */
export function Turnstile({ onToken }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    let widgetId: string | undefined;
    let cancelled = false;
    loadTurnstile()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        widgetId = window.turnstile.render(ref.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "dark",
          callback: (token: string) => cb.current(token),
          "expired-callback": () => cb.current(""),
          "error-callback": () => cb.current(""),
        });
      })
      .catch(() => cb.current(""));
    return () => {
      cancelled = true;
      try { if (widgetId) window.turnstile?.remove(widgetId); } catch { /* already gone */ }
    };
  }, []);

  return <div ref={ref} className="cf-turnstile" />;
}

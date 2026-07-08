import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type Announcement = {
  id: number;
  enabled: boolean;
  message: string;
  link_url: string;
  link_label: string;
  open_in_new_tab: boolean;
  background_color: string;
  text_color: string;
};

// Session-only dismissal (in-memory, resets on tab reload/close per spec).
let dismissedInSession = false;

export function AnnouncementBanner() {
  const { data } = useQuery({
    queryKey: ["site-announcement"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_announcement")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      return (data as Announcement) ?? null;
    },
    retry: 0,
  });

  const [dismissed, setDismissed] = useState<boolean>(dismissedInSession);
  const ref = useRef<HTMLDivElement>(null);

  const show = !!data?.enabled && !!data.message && !dismissed;

  useLayoutEffect(() => {
    const setVar = () => {
      const h = show && ref.current ? ref.current.offsetHeight : 0;
      document.documentElement.style.setProperty("--banner-h", `${h}px`);
    };
    setVar();
    if (!show) return;
    const ro = new ResizeObserver(setVar);
    if (ref.current) ro.observe(ref.current);
    window.addEventListener("resize", setVar);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", setVar);
      document.documentElement.style.setProperty("--banner-h", "0px");
    };
  }, [show, data?.message, data?.link_label, data?.link_url]);

  useEffect(() => () => {
    document.documentElement.style.setProperty("--banner-h", "0px");
  }, []);

  if (!show || !data) return null;

  const dismiss = () => {
    dismissedInSession = true;
    setDismissed(true);
  };

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Site announcement"
      className="fixed inset-x-0 top-0 z-[60] border-b border-black/10"
      style={{ backgroundColor: data.background_color, color: data.text_color }}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 text-sm sm:px-6">
        <div className="min-w-0 flex-1">
          <span className="break-words">{data.message}</span>
          {data.link_url && (
            <a
              href={data.link_url}
              target={data.open_in_new_tab ? "_blank" : undefined}
              rel={data.open_in_new_tab ? "noopener noreferrer" : undefined}
              className="ml-2 font-semibold underline underline-offset-2 hover:opacity-80"
              style={{ color: data.text_color }}
            >
              {data.link_label || "Learn more"}
            </a>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="shrink-0 rounded-md p-1 transition hover:bg-black/10"
          style={{ color: data.text_color }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Pure presentational banner for the admin preview (no fetching, no dismiss). */
export function AnnouncementBannerPreview({ value }: { value: Omit<Announcement, "id"> }) {
  return (
    <div
      className="w-full rounded-md border border-black/10"
      style={{ backgroundColor: value.background_color, color: value.text_color }}
    >
      <div className="flex items-center gap-3 px-4 py-2 text-sm">
        <div className="min-w-0 flex-1">
          <span className="break-words">{value.message || "Your announcement message will appear here."}</span>
          {value.link_url && (
            <span
              className="ml-2 font-semibold underline underline-offset-2"
              style={{ color: value.text_color }}
            >
              {value.link_label || "Learn more"}
            </span>
          )}
        </div>
        <span className="shrink-0 rounded-md p-1" style={{ color: value.text_color }}>
          <X className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}

import { siDiscord, siSteam, siYoutube, siTiktok, siX, siInstagram, siBluesky, siTwitch, siReddit } from "simple-icons";
import { Linkedin, Link2 } from "lucide-react";

export type SocialLink = {
  id?: string;
  platform: string;
  label: string;
  url: string;
  icon_url: string;
  visible: boolean;
  sort_order: number;
};

export const SOCIAL_PLATFORMS = [
  { key: "discord", label: "Discord", icon: siDiscord },
  { key: "steam", label: "Steam", icon: siSteam },
  { key: "youtube", label: "YouTube", icon: siYoutube },
  { key: "tiktok", label: "TikTok", icon: siTiktok },
  { key: "x", label: "X", icon: siX },
  { key: "instagram", label: "Instagram", icon: siInstagram },
  { key: "bluesky", label: "Bluesky", icon: siBluesky },
  { key: "linkedin", label: "LinkedIn", icon: null },
  { key: "twitch", label: "Twitch", icon: siTwitch },
  { key: "reddit", label: "Reddit", icon: siReddit },
  { key: "custom", label: "Custom", icon: null },
] as const;

export function platformLabel(link: Pick<SocialLink, "platform" | "label">) {
  if (link.platform === "custom") return link.label || "Link";
  return SOCIAL_PLATFORMS.find((p) => p.key === link.platform)?.label ?? (link.label || link.platform);
}

export function SocialIcon({ link, size = 24 }: { link: Pick<SocialLink, "platform" | "icon_url">; size?: number }) {
  if (link.platform === "custom") {
    return link.icon_url ? <img src={link.icon_url} alt="" aria-hidden="true" style={{ width: size, height: size }} /> : <Link2 size={size} aria-hidden="true" />;
  }
  if (link.platform === "linkedin") return <Linkedin size={size} aria-hidden="true" />;
  const icon = SOCIAL_PLATFORMS.find((p) => p.key === link.platform)?.icon;
  if (!icon) return <Link2 size={size} aria-hidden="true" />;
  return (
    <svg role="img" viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d={icon.path} />
    </svg>
  );
}

/** Renders only visible links with a URL, in sort_order. */
export function SocialIconLinks({ links, className = "" }: { links: SocialLink[] | null | undefined; className?: string }) {
  const items = [...(links ?? [])]
    .filter((l) => l.visible !== false && l.url)
    .sort((a, b) => a.sort_order - b.sort_order);
  if (items.length === 0) return null;
  return (
    <nav className={`social-icon-links ${className}`.trim()} aria-label="Social media">
      {items.map((item, i) => {
        const label = platformLabel(item);
        return (
          <a key={item.id ?? i} href={item.url} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}>
            <SocialIcon link={item} />
          </a>
        );
      })}
    </nav>
  );
}

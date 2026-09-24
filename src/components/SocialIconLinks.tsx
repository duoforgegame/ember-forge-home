import discordIcon from "@/assets/social/icons8-discord-64.png.asset.json";
import youtubeIcon from "@/assets/social/icons8-youtube-50.png.asset.json";
import tiktokIcon from "@/assets/social/icons8-tiktok-50.png.asset.json";
import steamIcon from "@/assets/social/icons8-steam-64.png.asset.json";
import xIcon from "@/assets/social/icons8-x-50.png.asset.json";

export type SocialDestinations = {
  discord?: string | null;
  youtube?: string | null;
  tiktok?: string | null;
  steam?: string | null;
  twitter?: string | null;
};

const iconUrls = {
  discord: discordIcon.url,
  youtube: youtubeIcon.url,
  tiktok: tiktokIcon.url,
  steam: steamIcon.url,
  twitter: xIcon.url,
};

export function SocialIconLinks({ socials, className = "" }: { socials: SocialDestinations; className?: string }) {
  const items = [
    { key: "discord", href: socials.discord, label: "Discord" },
    { key: "youtube", href: socials.youtube, label: "YouTube" },
    { key: "tiktok", href: socials.tiktok, label: "TikTok" },
    { key: "steam", href: socials.steam, label: "Steam" },
    { key: "twitter", href: socials.twitter, label: "X" },
  ].filter((item): item is { key: keyof typeof iconUrls; href: string; label: string } => Boolean(item.href));

  if (items.length === 0) return null;

  return (
    <nav className={`social-icon-links ${className}`.trim()} aria-label="Social media">
      {items.map((item) => (
        <a key={item.key} href={item.href} target="_blank" rel="noopener noreferrer" aria-label={item.label} title={item.label}>
          <img src={iconUrls[item.key]} alt="" aria-hidden="true" />
        </a>
      ))}
    </nav>
  );
}
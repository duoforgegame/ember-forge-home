import discordIcon from "@/assets/social/icons8-discord-64.png";
import youtubeIcon from "@/assets/social/icons8-youtube-50.png";
import tiktokIcon from "@/assets/social/icons8-tiktok-50.png";
import steamIcon from "@/assets/social/icons8-steam-64.png";
import xIcon from "@/assets/social/icons8-x-50.png";

export type SocialDestinations = {
  discord?: string | null;
  youtube?: string | null;
  tiktok?: string | null;
  steam?: string | null;
  twitter?: string | null;
  discord_visible?: boolean | null;
  youtube_visible?: boolean | null;
  tiktok_visible?: boolean | null;
  twitter_visible?: boolean | null;
};

const iconUrls = {
  discord: discordIcon,
  youtube: youtubeIcon,
  tiktok: tiktokIcon,
  steam: steamIcon,
  twitter: xIcon,
};

export function SocialIconLinks({ socials, className = "" }: { socials: SocialDestinations; className?: string }) {
  const items = [
    { key: "discord", href: socials.discord_visible === false ? null : socials.discord, label: "Discord" },
    { key: "youtube", href: socials.youtube_visible === false ? null : socials.youtube, label: "YouTube" },
    { key: "tiktok", href: socials.tiktok_visible === false ? null : socials.tiktok, label: "TikTok" },
    { key: "steam", href: socials.steam, label: "Steam" },
    { key: "twitter", href: socials.twitter_visible === false ? null : socials.twitter, label: "X" },
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
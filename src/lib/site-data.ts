import coverCoinsweeper from "@/assets/cover-coinsweeper.jpg";
import coverUnboxed from "@/assets/cover-unboxed.jpg";

export type ProjectStatus = "Play Now" | "In Development" | "Coming Soon" | "Prototype";

export interface Project {
  title: string;
  description: string;
  cover: string;
  status: ProjectStatus;
  buttonLabel: string;
  buttonUrl: string;
}

export const projects: Project[] = [
  {
    title: "Coinsweeper",
    description:
      "A roguelike twist on Minesweeper. We did to Minesweeper what Balatro did to Poker.",
    cover: coverCoinsweeper,
    status: "Play Now",
    buttonLabel: "View on Steam",
    buttonUrl: "https://store.steampowered.com/",
  },
  {
    title: "Unboxed: Idle Case Tycoon",
    description:
      "Build your case-opening empire in this idle tycoon game. Open, upgrade, automate — repeat.",
    cover: coverUnboxed,
    status: "In Development",
    buttonLabel: "Wishlist on Steam",
    buttonUrl: "https://store.steampowered.com/",
  },
];

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
}

export const team: TeamMember[] = [
  {
    name: "Brother One",
    role: "Design & Code",
    bio: "Systems designer and Unity developer. Loves roguelikes and tight game feel.",
  },
  {
    name: "Brother Two",
    role: "Art & Code",
    bio: "Handles art direction and gameplay programming. Chronic idle-game enjoyer.",
  },
];

export const socials = {
  twitter: "https://x.com/",
  tiktok: "https://www.tiktok.com/",
  discord: "https://discord.com/",
  youtube: "https://www.youtube.com/",
};

export const CONTACT_EMAIL = "info@duoforgegames.com";

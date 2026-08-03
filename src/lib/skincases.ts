import { skinAuthCall } from "./skinauth";
import type { PixelDatum } from "./skincreator";

export type CaseRarity =
  | "consumer_grade"
  | "industrial_grade"
  | "mil_spec"
  | "restricted"
  | "classified"
  | "covert"
  | "special";

export const RARITIES: { id: CaseRarity; label: string; color: string }[] = [
  { id: "consumer_grade", label: "Consumer-Grade", color: "#b0b0b0" },
  { id: "industrial_grade", label: "Industrial-Grade", color: "#5e98d9" },
  { id: "mil_spec", label: "Mil-Spec", color: "#2f5fe0" },
  { id: "restricted", label: "Restricted", color: "#8847ff" },
  { id: "classified", label: "Classified", color: "#d32ce6" },
  { id: "covert", label: "Covert", color: "#eb4b4b" },
  { id: "special", label: "Special", color: "#ffd700" },
];

export const rarityInfo = (id: string) => RARITIES.find((r) => r.id === id);

export type CaseSkin = {
  id: string;
  skin_name: string | null;
  status?: string;
  created_at?: string;
  preview_image_url: string | null;
  pixel_data?: PixelDatum[] | null;
  weapons?: {
    id: string;
    name: string;
    canvas_width: number;
    canvas_height: number;
    template_image_url?: string | null;
  } | null;
};

export type CaseItem = {
  id: string;
  rarity: CaseRarity;
  sort_order: number;
  skin_submissions: CaseSkin | null;
};

export type PlayerCase = {
  id: string;
  case_name: string;
  status: string;
  created_at: string;
  skin_creator_case_items: CaseItem[];
};

export const MAX_CASE_ITEMS = 17;
export const MIN_CASE_ITEMS = 2;

export async function loadCaseData(): Promise<{ skins: CaseSkin[]; cases: PlayerCase[] }> {
  const out = await skinAuthCall({ op: "list_case_data" }, true);
  return { skins: (out?.skins ?? []) as CaseSkin[], cases: (out?.cases ?? []) as PlayerCase[] };
}

export async function submitCase(caseName: string, items: { skin_submission_id: string; rarity: CaseRarity }[]) {
  return skinAuthCall({ op: "submit_case", case_name: caseName, items }, true);
}

export async function deleteCase(caseId: string) {
  return skinAuthCall({ op: "delete_case", case_id: caseId }, true);
}

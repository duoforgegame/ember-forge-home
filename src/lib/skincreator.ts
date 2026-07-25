import { supabase } from "./supabase";

/** Configurable upload endpoint on the IONOS VPS (see server/skincreator-upload). */
export const UPLOAD_ENDPOINT_URL =
  (import.meta.env.VITE_SKIN_UPLOAD_ENDPOINT as string | undefined) ||
  "https://duoforgegames.com/api/skin-upload";

export type WeaponCategory = { id: string; name: string; sort_order: number };
export type Weapon = {
  id: string;
  category_id: string | null;
  name: string;
  template_image_url: string;
  canvas_width: number;
  canvas_height: number;
  active: boolean;
  sort_order: number;
};
export type PixelDatum = { x: number; y: number; r: number; g: number; b: number; a: number };
export type SkinSubmission = {
  id: string;
  weapon_id: string | null;
  pixel_data: PixelDatum[];
  preview_image_url: string;
  player_name: string | null;
  discord_name: string;
  email: string | null;
  status: string;
  created_at: string;
  weapons?: Pick<Weapon, "id" | "name" | "category_id" | "template_image_url" | "canvas_width" | "canvas_height"> | null;
};

export async function fetchCategories(): Promise<WeaponCategory[]> {
  const { data, error } = await supabase.from("weapon_categories").select("*").order("sort_order");
  if (error) throw error;
  return (data ?? []) as WeaponCategory[];
}

export async function fetchWeapons(categoryId?: string): Promise<Weapon[]> {
  let q = supabase.from("weapons").select("*").order("sort_order");
  if (categoryId) q = q.eq("category_id", categoryId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Weapon[];
}

/** POSTs the preview PNG (as data URL) to the external VPS endpoint, returns the public URL. */
export async function uploadPreviewPng(dataUrl: string, filename: string): Promise<string> {
  const res = await fetch(UPLOAD_ENDPOINT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, dataUrl }),
  });
  if (!res.ok) throw new Error(await res.text().catch(() => `Upload failed (${res.status})`));
  const out = (await res.json()) as { url?: string; path?: string };
  const url = out.url || out.path;
  if (!url) throw new Error("Upload endpoint returned no URL");
  return url;
}

export async function submitSkin(input: {
  weapon_id: string;
  pixel_data: PixelDatum[];
  preview_image_url: string;
  player_name?: string;
  discord_name: string;
  email?: string;
}) {
  const { error } = await supabase.from("skin_submissions").insert({
    weapon_id: input.weapon_id,
    pixel_data: input.pixel_data,
    preview_image_url: input.preview_image_url,
    player_name: input.player_name?.trim() || null,
    discord_name: input.discord_name.trim(),
    email: input.email?.trim() || null,
    status: "pending",
  });
  if (error) throw error;
}

/** Curated 32-colour pixel-art palette. */
export const PALETTE = [
  "#000000", "#1a1c2c", "#333c57", "#566c86", "#94b0c2", "#c2c3c7", "#f4f4f4", "#ffffff",
  "#5d275d", "#b13e53", "#ef7d57", "#ff9f45", "#ffcd75", "#fff5b8", "#a7f070", "#38b764",
  "#257179", "#29366f", "#3b5dc9", "#41a6f6", "#73eff7", "#b57ff5", "#e26df8", "#ff77a8",
  "#7b3f00", "#a9662a", "#d9a066", "#eec39a", "#4b4b4b", "#7a7a7a", "#2b1d1d", "#8f1f1f",
];

import { supabase } from "./supabase";
import { getSkinToken, skinAuthCall } from "./skinauth";


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
  skin_name: string | null;
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
  skin_name?: string;
  player_name?: string;
  discord_name: string;
  email?: string;
}) {
  // Logged-in players submit through the edge function so the server sets user_id.
  if (getSkinToken()) {
    await skinAuthCall({ op: "submit", ...input, skin_name: input.skin_name?.trim() || null, player_name: input.player_name?.trim() || null, email: input.email?.trim() || null }, true);
    return;
  }
  const { error } = await supabase.from("skin_submissions").insert({
    weapon_id: input.weapon_id,
    pixel_data: input.pixel_data,
    preview_image_url: input.preview_image_url,
    skin_name: input.skin_name?.trim() || null,
    player_name: input.player_name?.trim() || null,
    discord_name: input.discord_name.trim(),
    email: input.email?.trim() || null,
    status: "pending",
  });
  if (error) throw error;
}

/** Renders painted pixels onto a transparent canvas (template is never baked in). */
export function pixelsToCanvas(pixels: PixelDatum[], width: number, height: number): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, width);
  cv.height = Math.max(1, height);
  const ctx = cv.getContext("2d")!;
  const img = ctx.createImageData(cv.width, cv.height);
  for (const p of pixels) {
    if (p.x < 0 || p.y < 0 || p.x >= cv.width || p.y >= cv.height) continue;
    const i = (p.y * cv.width + p.x) * 4;
    img.data[i] = p.r; img.data[i + 1] = p.g; img.data[i + 2] = p.b; img.data[i + 3] = p.a;
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

/** Triggers a real browser download of a canvas as a transparent PNG. */
export async function downloadCanvasPng(canvas: HTMLCanvasElement, filename: string) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not encode PNG");
  downloadBlob(blob, filename);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}


/** Curated 32-colour pixel-art palette. */
export const PALETTE = [
  "#000000", "#1a1c2c", "#333c57", "#566c86", "#94b0c2", "#c2c3c7", "#f4f4f4", "#ffffff",
  "#5d275d", "#b13e53", "#ef7d57", "#ff9f45", "#ffcd75", "#fff5b8", "#a7f070", "#38b764",
  "#257179", "#29366f", "#3b5dc9", "#41a6f6", "#73eff7", "#b57ff5", "#e26df8", "#ff77a8",
  "#7b3f00", "#a9662a", "#d9a066", "#eec39a", "#4b4b4b", "#7a7a7a", "#2b1d1d", "#8f1f1f",
];

/** Composites the weapon template underneath the painted pixels (transparent background). */
export async function renderSkinWithTemplate(
  templateUrl: string | null | undefined,
  pixels: PixelDatum[],
  width: number,
  height: number,
): Promise<HTMLCanvasElement> {
  const W = Math.max(1, width);
  const H = Math.max(1, height);
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  if (templateUrl) {
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.crossOrigin = "anonymous";
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("Could not load weapon template"));
        el.src = templateUrl;
      });
      ctx.drawImage(img, 0, 0, W, H);
    } catch {
      /* template unavailable, export the painted pixels only */
    }
  }
  ctx.drawImage(pixelsToCanvas(pixels, W, H), 0, 0);
  return cv;
}

export type GallerySkin = {
  id: string;
  preview_image_url: string;
  skin_name: string | null;
  player_name: string | null;
  created_at: string;
  weapon_name: string | null;
  status: string;
  vote_count: number;
};

export type GallerySort = "newest" | "top";

const GALLERY_COLUMNS =
  "id, preview_image_url, skin_name, player_name, created_at, status, weapon_name, vote_count";

/** Public, login-free read of approved and in game community skins (paginated). */
export async function fetchGallerySkins(offset = 0, limit = 20, sort: GallerySort = "newest"): Promise<GallerySkin[]> {
  let q = supabase.from("public_skin_gallery").select(GALLERY_COLUMNS);
  q = sort === "top"
    ? q.order("vote_count", { ascending: false }).order("created_at", { ascending: false })
    : q.order("created_at", { ascending: false });
  const { data, error } = await q.range(offset, offset + limit - 1);
  if (error) throw error;
  return (data ?? []) as GallerySkin[];
}

const VOTER_KEY_STORAGE = "skincreator_voter_key";

/** Stable anonymous identifier for this browser, used for one vote per skin. */
export function getVoterKey(): string {
  let key = "";
  try {
    key = localStorage.getItem(VOTER_KEY_STORAGE) ?? "";
    if (!key) {
      key = crypto.randomUUID();
      localStorage.setItem(VOTER_KEY_STORAGE, key);
    }
  } catch {
    key = key || crypto.randomUUID();
  }
  return key;
}

/** Ids of gallery skins this browser already upvoted. */
export async function listMyUpvotes(submissionIds: string[]): Promise<string[]> {
  if (submissionIds.length === 0) return [];
  const { data, error } = await supabase
    .from("skin_upvotes")
    .select("submission_id")
    .eq("voter_key", getVoterKey())
    .in("submission_id", submissionIds);
  if (error) throw error;
  return (data ?? []).map((r: { submission_id: string }) => r.submission_id);
}

/** Adds or removes this browser's single upvote for a skin, returns the fresh count. */
export async function toggleSkinUpvote(submissionId: string, currentlyVoted: boolean): Promise<{ voted: boolean; vote_count: number }> {
  const voter_key = getVoterKey();
  if (currentlyVoted) {
    const { error } = await supabase
      .from("skin_upvotes")
      .delete()
      .eq("submission_id", submissionId)
      .eq("voter_key", voter_key);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("skin_upvotes").insert({ submission_id: submissionId, voter_key });
    // a duplicate simply means the vote already exists
    if (error && !`${error.message}`.toLowerCase().includes("duplicate")) throw error;
  }
  const { count, error: countErr } = await supabase
    .from("skin_upvotes")
    .select("id", { count: "exact", head: true })
    .eq("submission_id", submissionId);
  if (countErr) throw countErr;
  return { voted: !currentlyVoted, vote_count: count ?? 0 };
}

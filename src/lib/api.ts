import { FUNCTIONS_BASE, supabase } from "./supabase";

const TOKEN_KEY = "dfg_admin_token";
export const getToken = () => sessionStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => sessionStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => sessionStorage.removeItem(TOKEN_KEY);

export async function adminLogin(password: string): Promise<string> {
  const res = await fetch(`${FUNCTIONS_BASE}/admin-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `Login failed (${res.status})`);
  }
  const data = (await res.json()) as { token: string };
  setToken(data.token);
  return data.token;
}

export type AdminOp =
  | { op: "upsert"; table: string; rows: unknown[] }
  | { op: "delete"; table: string; id: string | number }
  | { op: "list_submissions" }
  | { op: "delete_submission"; id: string }
  | { op: "sign_cover_upload"; ext: string }
  | { op: "sign_upload"; kind: "cover" | "press_image" | "press_logo" | "press_zip"; ext: string };

export async function adminCall(body: AdminOp): Promise<any> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${FUNCTIONS_BASE}/admin-write`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    clearToken();
    throw new Error("Session expired");
  }
  if (!res.ok) throw new Error(await res.text().catch(() => `Error ${res.status}`));
  return res.json();
}

export async function sendContact(input: { name: string; email: string; subject: string; message: string; inquiry_type: string }) {
  const res = await fetch(`${FUNCTIONS_BASE}/contact-send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await res.text().catch(() => "Send failed"));
  return res.json();
}

export async function uploadProjectCover(file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const { signedUrl, token, path, publicUrl } = await adminCall({ op: "sign_cover_upload", ext });
  void signedUrl; void path;
  // Use the SDK's uploadToSignedUrl helper — extracts bucket+path from token flow.
  const { error } = await supabase.storage.from("project-covers").uploadToSignedUrl(path, token, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return publicUrl as string;
}

export async function uploadPressAsset(
  file: File,
  kind: "press_image" | "press_logo" | "press_zip",
): Promise<string> {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const { token, path, publicUrl, bucket } = await adminCall({ op: "sign_upload", kind, ext });
  const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(path, token, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw error;
  return publicUrl as string;
}

export function slugify(input: string): string {
  return (input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function fetchSiteContent() {
  const [projects, team, about, socials, header, footer, statusColors, featured] = await Promise.all([
    supabase.from("site_projects").select("*").order("sort_order"),
    supabase.from("site_team").select("*").order("sort_order"),
    supabase.from("site_about").select("*").eq("id", 1).maybeSingle(),
    supabase.from("site_socials").select("*").eq("id", 1).maybeSingle(),
    supabase.from("site_header_links").select("*").order("sort_order"),
    supabase.from("site_footer_links").select("*").order("sort_order"),
    supabase.from("site_status_colors").select("*"),
    supabase.from("site_featured_game").select("*").eq("id", 1).maybeSingle(),
  ]);
  return {
    projects: projects.data ?? [],
    team: team.data ?? [],
    about: about.data ?? null,
    socials: socials.data ?? null,
    header: header.data ?? [],
    footer: footer.data ?? [],
    statusColors: (statusColors.data ?? []) as { status: string; color: string }[],
    featured: featured.data ?? null,
  };
}

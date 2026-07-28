import { FUNCTIONS_BASE } from "./supabase";

const TOKEN_KEY = "dfg_skin_user_token";
const USER_KEY = "dfg_skin_user";

export type SkinUser = { id: string; username: string };

export const getSkinToken = () => localStorage.getItem(TOKEN_KEY);
export const getSkinUser = (): SkinUser | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SkinUser) : null;
  } catch {
    return null;
  }
};
export const skinLogout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export async function skinAuthCall(body: Record<string, unknown>, withToken = false): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const t = getSkinToken();
  if (withToken && !t) throw new Error("Not signed in");
  if (t) {
    headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(`${FUNCTIONS_BASE}/skin-auth`, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await res.text();
  let parsed: any = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { /* non-JSON error body */ }
  if (!res.ok) {
    if (res.status === 401 && withToken) skinLogout();
    throw new Error(parsed?.error || text || `Request failed (${res.status})`);
  }
  return parsed;
}

async function authenticate(
  op: "login" | "register",
  username: string,
  password: string,
  email?: string,
): Promise<SkinUser> {
  const out = await skinAuthCall({ op, username, password, ...(email ? { email } : {}) });
  localStorage.setItem(TOKEN_KEY, out.token);
  localStorage.setItem(USER_KEY, JSON.stringify(out.user));
  return out.user as SkinUser;
}

export const skinLogin = (username: string, password: string) => authenticate("login", username, password);
export const skinRegister = (username: string, password: string, email?: string) =>
  authenticate("register", username, password, email);

/** Always resolves: the backend never reveals whether the account/email exists. */
export const requestPasswordReset = (identifier: string) =>
  skinAuthCall({ op: "request_password_reset", identifier });

export const confirmPasswordReset = (token: string, new_password: string) =>
  skinAuthCall({ op: "confirm_password_reset", token, new_password });


export type MySubmission = {
  id: string;
  status: string;
  created_at: string;
  preview_image_url: string;
  skin_name: string | null;
  player_name: string | null;
  discord_name: string;
  pixel_data?: { x: number; y: number; r: number; g: number; b: number; a: number }[] | null;
  weapons?: { id: string; name: string; canvas_width: number; canvas_height: number; template_image_url?: string } | null;
};

export async function listMySubmissions(): Promise<MySubmission[]> {
  const out = await skinAuthCall({ op: "list_my_submissions" }, true);
  return (out.rows ?? []) as MySubmission[];
}

/** Ids of the gallery skins the signed-in user already upvoted. */
export async function listMyVotes(): Promise<string[]> {
  const out = await skinAuthCall({ op: "my_votes" }, true);
  return (out.ids ?? []) as string[];
}

/** Adds or removes the user's single upvote for a skin. */
export async function toggleSkinVote(submissionId: string): Promise<{ voted: boolean; vote_count: number }> {
  const out = await skinAuthCall({ op: "toggle_vote", submission_id: submissionId }, true);
  return { voted: !!out.voted, vote_count: Number(out.vote_count ?? 0) };
}

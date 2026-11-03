// Downloads every image/file the website uses from Supabase into ./downloaded-assets
// Usage (from the repo folder, Node 18+):  node scripts/download-assets.mjs
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [
        l.slice(0, i).trim(),
        l
          .slice(i + 1)
          .trim()
          .replace(/^"|"$/g, ""),
      ];
    }),
);
const BASE = env.VITE_PUBLIC_SUPABASE_URL;
const KEY = env.VITE_PUBLIC_SUPABASE_ANON_KEY;
if (!BASE || !KEY)
  throw new Error("VITE_PUBLIC_SUPABASE_URL / VITE_PUBLIC_SUPABASE_ANON_KEY missing in .env");
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const OUT = "downloaded-assets";

const TABLES = [
  "site_projects",
  "site_press_kits",
  "site_press_screenshots",
  "site_game_platforms",
  "site_landing_settings",
  "site_social_links",
  "site_featured_game",
  "site_game_page_blocks",
];
const urls = new Map(); // url -> folder

function collect(value, folder) {
  if (typeof value === "string") {
    if (
      /^https?:\/\/.+\.(png|jpe?g|webp|gif|svg|avif|mp4|webm|zip)(\?.*)?$/i.test(value) ||
      value.includes("/storage/v1/object/public/")
    )
      urls.set(value, folder);
  } else if (value && typeof value === "object")
    Object.values(value).forEach((v) => collect(v, folder));
}

for (const table of TABLES) {
  const res = await fetch(`${BASE}/rest/v1/${table}?select=*`, { headers });
  if (!res.ok) {
    console.warn(`skip ${table}: ${res.status}`);
    continue;
  }
  const rows = await res.json();
  rows.forEach((row) => collect(row, table));
  console.log(`${table}: ${rows.length} rows`);
}

// Also list both public storage buckets directly, in case files are uploaded but not linked anywhere.
async function listBucket(bucket, prefix = "") {
  const res = await fetch(`${BASE}/storage/v1/object/list/${bucket}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix, limit: 1000, offset: 0 }),
  });
  if (!res.ok) return;
  for (const item of await res.json()) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null)
      await listBucket(bucket, path); // folder
    else urls.set(`${BASE}/storage/v1/object/public/${bucket}/${path}`, `bucket-${bucket}`);
  }
}
for (const bucket of ["project-covers", "press-kit-assets"]) await listBucket(bucket);

let n = 0;
for (const [url, folder] of urls) {
  const dir = join(OUT, folder);
  mkdirSync(dir, { recursive: true });
  const clean = decodeURIComponent(new URL(url).pathname.split("/").pop() || `file-${n}`);
  const name = extname(clean) ? clean : `${clean}.bin`;
  const target = join(dir, name);
  if (existsSync(target)) continue;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`failed ${res.status}: ${url}`);
    continue;
  }
  writeFileSync(target, Buffer.from(await res.arrayBuffer()));
  n++;
}
console.log(`Done: ${n} files in ./${OUT}`);

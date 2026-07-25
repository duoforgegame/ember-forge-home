/**
 * Skin preview upload endpoint for the IONOS VPS.
 *
 *   npm i express cors
 *   PORT=8790 UPLOAD_DIR=/var/www/duoforge/skins PUBLIC_BASE=https://duoforgegames.com/skins node server.js
 *
 * nginx (same server block as the SPA):
 *   location /api/skin-upload { proxy_pass http://127.0.0.1:8790/; }
 *   location /skins/ { root /var/www/duoforge; }
 *
 * Accepts: POST JSON { filename, dataUrl }  ->  { url }
 */
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");

const PORT = Number(process.env.PORT || 8790);
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "/var/www/duoforge/skins");
const PUBLIC_BASE = (process.env.PUBLIC_BASE || "https://duoforgegames.com/skins").replace(/\/$/, "");
const ORIGINS = (process.env.ALLOWED_ORIGINS || "https://duoforgegames.com,https://www.duoforgegames.com,http://localhost:8080").split(",");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
app.use(cors({ origin: ORIGINS }));
app.use(express.json({ limit: "8mb" }));

app.post("/", (req, res) => {
  const { filename, dataUrl } = req.body || {};
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/png;base64,")) {
    return res.status(400).json({ error: "dataUrl must be a base64 PNG data URL" });
  }
  const base64 = dataUrl.slice("data:image/png;base64,".length);
  const buf = Buffer.from(base64, "base64");
  if (buf.length > 5 * 1024 * 1024) return res.status(413).json({ error: "Too large" });

  const safe = String(filename || "skin.png").toLowerCase().replace(/[^a-z0-9.-]/g, "-").replace(/\.+/g, ".");
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe.endsWith(".png") ? safe : safe + ".png"}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  res.json({ url: `${PUBLIC_BASE}/${name}` });
});

// Deletion endpoint used by the admin bulk delete, protected by a shared secret.
// Configure DELETE_SECRET and add to nginx:
//   location /api/skin-upload-delete { proxy_pass http://127.0.0.1:8790/delete; }
app.post("/delete", (req, res) => {
  const secret = process.env.DELETE_SECRET || "";
  if (!secret || req.get("x-delete-secret") !== secret) return res.status(401).json({ error: "Unauthorized" });
  const raw = String((req.body || {}).url || "");
  if (!raw) return res.status(400).json({ error: "Missing url" });
  const name = path.basename(raw.split("?")[0]);
  if (!name || name.includes("..") || !/^[a-z0-9._-]+$/i.test(name)) return res.status(400).json({ error: "Invalid file" });
  const target = path.join(UPLOAD_DIR, name);
  if (!target.startsWith(path.resolve(UPLOAD_DIR))) return res.status(400).json({ error: "Invalid path" });
  try { fs.unlinkSync(target); } catch (e) { if (e.code !== "ENOENT") return res.status(500).json({ error: "Delete failed" }); }
  res.json({ ok: true });
});

app.listen(PORT, "127.0.0.1", () => console.log(`skin upload endpoint on :${PORT}`));

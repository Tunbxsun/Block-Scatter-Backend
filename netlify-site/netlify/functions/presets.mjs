// Shared presets for the Pixel scatter gradient tool.
// GET    /api/presets            -> list presets
// POST   /api/presets            -> create { name, icon, settings }, returns { preset, token }
// DELETE /api/presets?id=...     -> delete; needs the creator's token (x-preset-token)
//                                   or the admin key (x-admin-key = PRESET_ADMIN_KEY env var)
import { getStore } from "@netlify/blobs";

const KEY = "all";
const MAX_PRESETS = 200;
const MAX_SETTINGS_BYTES = 20000;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

const load = async (store) => (await store.get(KEY, { type: "json" })) || [];
const strip = ({ tokenHash, ...rest }) => rest;

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function adminKey() {
  try {
    if (globalThis.Netlify?.env?.get) return globalThis.Netlify.env.get("PRESET_ADMIN_KEY") || "";
  } catch {}
  return process.env.PRESET_ADMIN_KEY || "";
}

export default async (req) => {
  const store = getStore({ name: "presets", consistency: "strong" });
  const url = new URL(req.url);

  if (req.method === "GET") {
    const list = await load(store);
    return json(list.map(strip));
  }

  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON." }, 400); }
    const name = String(body?.name ?? "").trim().slice(0, 40);
    const icon = Array.from(String(body?.icon ?? "")).slice(0, 2).join("");
    const settings = body?.settings;
    if (!name) return json({ error: "Give the preset a name." }, 400);
    if (!settings || typeof settings !== "object" || Array.isArray(settings))
      return json({ error: "Missing settings." }, 400);
    if (JSON.stringify(settings).length > MAX_SETTINGS_BYTES)
      return json({ error: "These settings are too large to save." }, 413);

    const list = await load(store);
    if (list.length >= MAX_PRESETS)
      return json({ error: "The preset limit has been reached. Delete some presets first." }, 409);

    const token = crypto.randomUUID();
    const preset = {
      id: crypto.randomUUID(),
      name,
      icon,
      settings,
      createdAt: new Date().toISOString(),
      tokenHash: await sha256(token),
    };
    list.push(preset);
    await store.setJSON(KEY, list);
    return json({ preset: strip(preset), token }, 201);
  }

  if (req.method === "DELETE") {
    const id = url.searchParams.get("id") || "";
    const token = req.headers.get("x-preset-token") || "";
    const admin = req.headers.get("x-admin-key") || "";
    const list = await load(store);
    const i = list.findIndex((p) => p.id === id);
    if (i < 0) return json({ error: "That preset no longer exists." }, 404);
    const key = adminKey();
    const allowed =
      (key && admin && admin === key) ||
      (token && (await sha256(token)) === list[i].tokenHash);
    if (!allowed) return json({ error: "Only the person who made this preset can delete it." }, 403);
    list.splice(i, 1);
    await store.setJSON(KEY, list);
    return json({ ok: true });
  }

  return json({ error: "Method not allowed." }, 405);
};

export const config = { path: "/api/presets" };

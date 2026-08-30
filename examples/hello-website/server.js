// A plain website on Velora's headless API — no framework, no
// dependencies, one file. Run `node server.js` and open the printed URL.
//
// It fetches server-side (so your API key never reaches the browser),
// lists every published content item grouped by document type, and
// renders any item's fields when you click it.

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

// --- tiny .env loader (real shell exports win over the file) ------------
try {
  const lines = fs.readFileSync(path.join(__dirname, ".env"), "utf8").split(/\r?\n/);
  for (const line of lines) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
} catch { /* no .env file — env vars only */ }

const API_URL = process.env.VELORA_API_URL;
const API_KEY = process.env.VELORA_API_KEY;
const PORT = Number(process.env.PORT || 4600);

async function velora(apiPath) {
  const res = await fetch(new URL(apiPath, API_URL), {
    headers: { authorization: `Bearer ${API_KEY}` },
  });
  if (!res.ok) throw new Error(`${apiPath} -> HTTP ${res.status}`);
  return res.json();
}

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function page(title, body) {
  return `<!doctype html><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 42rem;
         margin-inline: auto; padding: 2rem 1rem; line-height: 1.6; }
  h1 { border-block-end: 2px solid #ddd; padding-block-end: .5rem; }
  a { color: #0369a1; }
  dt { font-weight: 600; margin-block-start: 1rem; }
  dd { margin-inline-start: 0; }
  pre { background: #f5f5f4; padding: 1rem; overflow-x: auto; }
  small { color: #78716c; }
</style>
<body>${body}</body>`;
}

function renderValue(v) {
  if (v === null || v === undefined) return "<small>(empty)</small>";
  if (typeof v === "object") return `<pre>${esc(JSON.stringify(v, null, 2))}</pre>`;
  return esc(v);
}

async function home() {
  const [types, content] = await Promise.all([
    velora("/api/v1/document-types?limit=100"),
    velora("/api/v1/content?limit=100"),
  ]);
  const typeName = new Map(types.items.map((t) => [t.id, t.name]));
  const groups = new Map();
  for (const item of content.items) {
    const name = typeName.get(item.documentTypeId) || "Unknown type";
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(item);
  }
  let body = `<h1>Hello, Velora</h1>
<p>Everything below is live, published content served by the headless
API at <code>${esc(API_URL)}</code>. Publish something in the admin and
refresh — no rebuild.</p>`;
  for (const [name, items] of groups) {
    body += `<h2>${esc(name)}</h2><ul>` + items.map((i) =>
      `<li><a href="/item?id=${esc(i.id)}">${esc(i.path)}</a>
       <small>(${esc(i.locale)})</small></li>`).join("") + "</ul>";
  }
  if (content.items.length === 0) {
    body += "<p>No published content yet — create and publish an item in the Velora admin, then refresh.</p>";
  }
  return page("Hello, Velora", body);
}

async function item(id) {
  const it = await velora(`/api/v1/content/${encodeURIComponent(id)}`);
  const fields = Object.entries(it.data)
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${renderValue(v)}</dd>`)
    .join("");
  return page(id, `<p><a href="/">&#8592; all content</a></p>
<h1>Content item</h1>
<p><small>version ${esc(it.version)} · locale ${esc(it.locale)} ·
published ${esc(it.publishedAt ?? "—")}</small></p>
<dl>${fields || "<dd><small>(this item has no field data)</small></dd>"}</dl>`);
}

http.createServer(async (req, res) => {
  try {
    if (!API_URL || !API_KEY) {
      throw new Error("VELORA_API_URL / VELORA_API_KEY are not set — copy .env.example to .env and fill them in (demo values are in the file's comments).");
    }
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const html =
      url.pathname === "/item" && url.searchParams.get("id")
        ? await item(url.searchParams.get("id"))
        : await home();
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
  } catch (err) {
    res.writeHead(500, { "content-type": "text/html; charset=utf-8" });
    res.end(page("Error", `<h1>Something went wrong</h1><pre>${esc(err.message)}</pre>`));
  }
}).listen(PORT, () => {
  console.log(`Hello-website running at http://localhost:${PORT}`);
});

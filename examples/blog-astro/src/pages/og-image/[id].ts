import type { APIRoute } from "astro";
import { fetchMediaById } from "../../lib/api.js";

export const prerender = false;

// Media ids are UUIDs minted by the CMS (see api.ts) — this is belt+braces
// on top of fetchMediaById's encodeURIComponent: reject anything that
// isn't even shaped like an id before spending a request on it.
const ID_PATTERN = /^[A-Za-z0-9-]+$/;

// Only ever serve bytes we're prepared to decode as an image. The CMS's
// declared mimeType is client-supplied at upload time — trusting it as-is
// would let an uploaded image/svg+xml (SVG can carry <script>) or a
// mislabeled text/html get served back from this origin with attacker
// control over the body: stored XSS. Restrict to inert raster formats.
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif"]);

// Stable OG-image URL on the frontend's own origin. The CMS's
// downloadUrl is a time-limited presigned URL — fine for a browser
// rendering a page now, dead for a crawler fetching og:image later.
// This proxy re-mints a fresh presigned URL per request and streams
// the bytes through.
export const GET: APIRoute = async ({ params }) => {
  const id = params.id ?? "";
  if (!ID_PATTERN.test(id)) return new Response("Not found", { status: 404 });

  try {
    // fetchMediaById resolves to null only on a 404 — every other failure
    // (network error, non-404 upstream status) throws, same as the
    // fetch(downloadUrl) call below, so both are covered by this try/catch.
    const media = await fetchMediaById(id);
    if (!media) return new Response("Not found", { status: 404 });
    if (!ALLOWED_MIME_TYPES.has(media.mimeType)) return new Response("Not found", { status: 404 });

    const upstream = await fetch(media.downloadUrl);
    if (!upstream.ok || !upstream.body) return new Response("Not found", { status: 404 });

    return new Response(upstream.body, {
      headers: {
        "content-type": media.mimeType,
        "cache-control": "public, max-age=300",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response("Bad gateway", { status: 502 });
  }
};

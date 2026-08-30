import type { APIRoute } from "astro";
import { searchAllContentForSitemap } from "../lib/api.js";
import { buildSitemapXml, withHomeEntry } from "../lib/sitemap.js";

export const prerender = false;

// Lists every published node the public API exposes (trashed rows are
// excluded by the API itself — pinned by a server-side test), resolved to
// each node's actual site route by searchAllContentForSitemap, plus the
// home page (withHomeEntry — there's no content-tree node for "/"). The
// cursor loop pages at 100 per document type — up to 60 upstream calls on
// a single request — so responses are cacheable for a fronting cache/CDN
// to absorb crawler traffic instead of re-walking the tree every hit.
export const GET: APIRoute = async ({ url }) => {
  const entries = await searchAllContentForSitemap();
  const xml = buildSitemapXml(url.origin, withHomeEntry(entries));
  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
};

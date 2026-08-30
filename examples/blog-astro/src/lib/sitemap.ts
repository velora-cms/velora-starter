// Hand-rolled sitemap XML. @astrojs/sitemap only works for static
// routes; this starter's pages are all server-rendered from live CMS
// content, so the sitemap is assembled per-request from the public
// API's cursor loop. <lastmod> is publishedAt — the only timestamp the
// public surface exposes (recorded limitation). publishedAt is optional
// so a synthetic entry (the home page — see withHomeEntry below) can omit
// <lastmod> entirely rather than fabricate a timestamp.
export interface SitemapEntry {
  path: string;
  publishedAt?: string;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildSitemapXml(origin: string, entries: SitemapEntry[]): string {
  const urls = entries
    .map((e) => {
      const lastmod = e.publishedAt ? `\n    <lastmod>${escapeXml(e.publishedAt)}</lastmod>` : "";
      return `  <url>\n    <loc>${escapeXml(origin + e.path)}</loc>${lastmod}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

// Prepends the home page ("/") — the one route with no corresponding
// content-tree node, so it's never produced by mapSummariesToSitemapEntries.
// lastmod is the newest publishedAt across the other entries (a proxy for
// "when did this site last change"); with no entries yet (empty instance)
// there's nothing to derive a timestamp from, so the home entry is emitted
// without one rather than fabricating a date.
export function withHomeEntry(entries: SitemapEntry[]): SitemapEntry[] {
  let newest: string | undefined;
  for (const entry of entries) {
    if (entry.publishedAt && (!newest || entry.publishedAt > newest)) newest = entry.publishedAt;
  }
  return [{ path: "/", publishedAt: newest }, ...entries];
}

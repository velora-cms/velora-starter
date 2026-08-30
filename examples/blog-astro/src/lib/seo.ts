// SEO derivation for the starter. The CMS stores the field group under
// the conventional field name "seo" (the SEO plugin's README documents
// this); everything here is defensive — a missing, partial, or malformed
// value must never break a page render.
export interface SeoValue {
  title?: string;
  description?: string;
  ogImage?: string;
}

export interface SeoTags {
  title: string;
  description?: string;
  ogTitle: string;
  ogDescription?: string;
  // Site-relative path to the starter's own OG-image proxy. og:image must
  // be a stable URL — the CMS's downloadUrl is presigned and EXPIRES, so
  // crawlers fetching late would get a dead link. The proxy re-mints per
  // request on our own origin.
  ogImagePath?: string;
  canonical: string;
}

export function isSeoValue(x: unknown): x is SeoValue {
  if (typeof x !== "object" || x === null || Array.isArray(x)) return false;
  const v = x as Record<string, unknown>;
  for (const key of ["title", "description", "ogImage"]) {
    if (key in v && typeof v[key] !== "string") return false;
  }
  return true;
}

export function deriveSeoTags(input: { pageTitle: string; seo: unknown; requestUrl: URL }): SeoTags {
  const seo = isSeoValue(input.seo) ? input.seo : {};
  const title = seo.title?.trim() ? seo.title : input.pageTitle;
  const description = seo.description?.trim() ? seo.description : undefined;
  const canonical = `${input.requestUrl.origin}${input.requestUrl.pathname}`;
  return {
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogImagePath: seo.ogImage ? `/og-image/${encodeURIComponent(seo.ogImage)}` : undefined,
    canonical,
  };
}

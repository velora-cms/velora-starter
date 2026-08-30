// Thin client over Velora's public headless Content API (Month 9 —
// apps/server/src/routes/public-api.ts), mirroring the Online Store
// starter's client style (plugins/commerce/online-store/src/lib/
// velora-api.ts): plain fetch, env-driven base URL + key, a bearer
// Authorization header, and name -> id document-type discovery (ids are
// minted server-side at plugin install, never fixed constants).
//
// Every route this client calls is API-key gated (`requireApiKey` in
// public-api.ts expects `Authorization: Bearer <key>`) and only ever
// reachable when the target Velora instance has VELORA_HEADLESS=true —
// see ../../README.md for setup.

import type { SitemapEntry } from "./sitemap.js";

// Mirrors PublicContentNodeSummarySchema — a tree-walk/search row. No
// field `data` — fetch the full item (fetchContentById/fetchContentByPath)
// for that.
export interface ContentNodeSummary {
  id: string;
  parentId: string | null;
  path: string;
  depth: number;
  sortOrder: number;
  documentTypeId: string;
  locale: string;
  publishedAt: string;
}

// Mirrors PublicContentItemSchema — the full, published-only item.
export interface ContentItem {
  id: string;
  documentTypeId: string;
  locale: string;
  publishedAt: string | null;
  version: number;
  data: Record<string, unknown>;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

interface DocumentTypeSummary {
  id: string;
  name: string;
}

export interface PublicMediaFile {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  downloadUrl: string;
  uploadedAt: string;
}

// Bounds every cursor-following loop below. At the API's max page size
// (100) this covers 2,000 rows before giving up — plenty for a template's
// sample content, and a hard ceiling so a pathological instance (or a
// server bug that never returns a null nextCursor) can never spin a
// request into an infinite loop. Same convention as the Online Store
// starter's findDocumentTypeIdByName.
const MAX_PAGES = 20;
const PAGE_LIMIT = 100;

// Astro loads .env files into import.meta.env (server-side code sees
// every variable; only PUBLIC_-prefixed ones reach the browser) — NOT
// into process.env, which is only populated by real shell exports. Read
// import.meta.env first so the README's copy-.env.example flow works out
// of the box, with a process.env fallback for shell-exported setups
// (CI, docker). This differs from the Next.js Online Store starter,
// where .env DOES land in process.env — the conventions don't transfer.
export function getApiUrl(): string {
  const url = import.meta.env.VELORA_API_URL ?? process.env.VELORA_API_URL;
  if (!url) {
    throw new Error("VELORA_API_URL is not set — see blog/starter/README.md");
  }
  return url;
}

export function getApiKey(): string {
  const key = import.meta.env.VELORA_API_KEY ?? process.env.VELORA_API_KEY;
  if (!key) {
    throw new Error("VELORA_API_KEY is not set — see blog/starter/README.md");
  }
  return key;
}

async function veloraGet(path: string): Promise<Response> {
  const response = await fetch(`${getApiUrl()}${path}`, {
    headers: { Authorization: `Bearer ${getApiKey()}` },
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Velora request failed: GET ${path} -> ${response.status}`);
  }
  return response;
}

// Every list endpoint below expects a `{ items, nextCursor }` page body.
// When VELORA_HEADLESS is not set on the target instance, the public
// routes 404 with a generic error body instead (veloraGet deliberately
// lets 404s through for the by-id/by-path lookups), and blindly spreading
// `body.items` would throw a cryptic TypeError. Validate the shape here
// and fail with an error that names the actual setup problem.
function expectPage<T>(body: unknown, path: string): Page<T> {
  const page = body as Page<T> | null;
  if (!page || !Array.isArray(page.items)) {
    throw new Error(
      `Velora responded to GET ${path} without a content payload — is VELORA_HEADLESS=true set on the Velora instance? See README.md.`,
    );
  }
  return page;
}

// A single page of a content-type search, cursor-aware (the api-design
// pagination ethos — every list endpoint is followed, never assumed to
// fit in one page).
export async function searchContent(
  documentTypeId: string,
  options: { cursor?: string; limit?: number } = {},
): Promise<Page<ContentNodeSummary>> {
  const params = new URLSearchParams({ documentTypeId, limit: String(options.limit ?? PAGE_LIMIT) });
  if (options.cursor) params.set("cursor", options.cursor);
  const response = await veloraGet(`/api/v1/content?${params}`);
  return expectPage<ContentNodeSummary>(await response.json(), "/api/v1/content");
}

// Follows nextCursor until exhausted (or MAX_PAGES) — the sample content
// is tiny, but a real blog is not, and this is the one call site every
// page reuses to list a whole content type.
export async function searchAllContent(documentTypeId: string): Promise<ContentNodeSummary[]> {
  const all: ContentNodeSummary[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await searchContent(documentTypeId, { cursor });
    all.push(...result.items);
    if (!result.nextCursor) break;
    cursor = result.nextCursor;
  }
  return all;
}

export async function fetchChildren(
  parentId: string,
  options: { cursor?: string; limit?: number } = {},
): Promise<Page<ContentNodeSummary>> {
  const params = new URLSearchParams({ limit: String(options.limit ?? PAGE_LIMIT) });
  if (options.cursor) params.set("cursor", options.cursor);
  const response = await veloraGet(`/api/v1/content/${parentId}/children?${params}`);
  return expectPage<ContentNodeSummary>(await response.json(), `/api/v1/content/${parentId}/children`);
}

export async function fetchAllChildren(parentId: string): Promise<ContentNodeSummary[]> {
  const all: ContentNodeSummary[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await fetchChildren(parentId, { cursor });
    all.push(...result.items);
    if (!result.nextCursor) break;
    cursor = result.nextCursor;
  }
  return all;
}

export async function fetchContentById(id: string): Promise<ContentItem | null> {
  const response = await veloraGet(`/api/v1/content/${id}`);
  if (response.status === 404) return null;
  return (await response.json()) as ContentItem;
}

// `path` is a materialized content path, e.g. "/jane-doe/hello-velora" —
// always starts with "/". Every route in this starter reaches its content
// through here, since the tree itself IS the URL shape (D4).
export async function fetchContentByPath(path: string): Promise<ContentItem | null> {
  const response = await veloraGet(`/api/v1/content/by-path?path=${encodeURIComponent(path)}`);
  if (response.status === 404) return null;
  return (await response.json()) as ContentItem;
}

export async function fetchMediaById(id: string): Promise<PublicMediaFile | null> {
  // id is attacker-controlled (comes straight off a route param in
  // og-image/[id].ts) — encode it so it can only ever land as a single
  // path segment, never as "../" traversal against the upstream API.
  const response = await veloraGet(`/api/v1/media/${encodeURIComponent(id)}`);
  if (response.status === 404) return null;
  return (await response.json()) as PublicMediaFile;
}

// Document-type ids are minted server-side at plugin install — never
// fixed constants (Author/Post/Tag could land with any id on any given
// instance). Resolved by NAME instead, with a tiny in-memory cache so a
// single dev-server process doesn't re-walk /api/v1/document-types on
// every request: names are stable for the process lifetime, and a
// restart (`npm run dev` again) is the same cost as a cold cache miss.
const documentTypeIdCache = new Map<string, string>();

async function loadAllDocumentTypeNames(): Promise<DocumentTypeSummary[]> {
  const all: DocumentTypeSummary[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({ limit: String(PAGE_LIMIT) });
    if (cursor) params.set("cursor", cursor);
    const response = await veloraGet(`/api/v1/document-types?${params}`);
    const body = expectPage<DocumentTypeSummary>(await response.json(), "/api/v1/document-types");
    all.push(...body.items);
    if (!body.nextCursor) break;
    cursor = body.nextCursor;
  }
  return all;
}

export async function findDocumentTypeId(name: string): Promise<string | null> {
  const cached = documentTypeIdCache.get(name);
  if (cached) return cached;

  const types = await loadAllDocumentTypeNames();
  for (const type of types) {
    documentTypeIdCache.set(type.name, type.id);
  }
  return documentTypeIdCache.get(name) ?? null;
}

// Throwing variant for the three document types this starter renders and
// cannot render anything useful without — a missing Author/Post/Tag type
// means the Blog template isn't installed on the target instance, which
// is a setup problem the page should surface loudly, not swallow into an
// empty page.
export async function requireDocumentTypeId(name: string): Promise<string> {
  const id = await findDocumentTypeId(name);
  if (!id) {
    throw new Error(
      `No "${name}" document type found on this Velora instance — is the Blog template installed? See README.md.`,
    );
  }
  return id;
}

// Post's parent in the content tree is always its Author (blog/src/
// plugin.tsx's treeRules), so a Post's path is always
// "/{authorSlug}/{postSlug}" — depth 1, exactly two segments. Used to
// derive the /posts/[author]/[post] URL from a search/children result
// without an extra fetch.
export function splitPostPath(path: string): { authorSlug: string; postSlug: string } | null {
  const segments = path.split("/").filter(Boolean);
  if (segments.length !== 2) return null;
  const [authorSlug, postSlug] = segments;
  if (!authorSlug || !postSlug) return null;
  return { authorSlug, postSlug };
}

// A root-level node's (Author, Tag) path is always "/{slug}" — depth 0,
// one segment.
export function slugFromRootPath(path: string): string | null {
  const segments = path.split("/").filter(Boolean);
  return segments.length === 1 ? (segments[0] ?? null) : null;
}

// Post.tags is a plain comma-separated text field of Tag SLUGS (S149's
// recorded convention — no content-reference datatype exists yet). Split
// on commas, trim, drop empties. NOT a substring match on the raw text —
// each resulting entry is compared for an EXACT slug match by callers.
export function parseTagSlugs(tagsField: unknown): string[] {
  if (typeof tagsField !== "string") return [];
  return tagsField
    .split(",")
    .map((slug) => slug.trim())
    .filter((slug) => slug.length > 0);
}

// Pure mapping from a document type's search-result summaries to the
// sitemap-shaped entries their corresponding .astro pages actually serve.
// A node's content-tree `path` is NOT its site route: a Post's tree path is
// "/{author}/{post}" but its route is "/posts/{author}/{post}"; Author and
// Tag both live at the tree root ("/{slug}") and only diverge into
// "/authors/{slug}" vs "/tags/{slug}" once the type is known (same
// ambiguity the detail pages resolve with requireDocumentTypeId). A summary
// whose path doesn't fit its type's expected shape is silently skipped
// (splitPostPath/slugFromRootPath return null) rather than crashing the
// whole sitemap over one malformed row. Split out from
// searchAllContentForSitemap so this mapping is testable without a network
// call — see sitemap-routes.test.ts.
export function mapSummariesToSitemapEntries(
  posts: ContentNodeSummary[],
  authors: ContentNodeSummary[],
  tags: ContentNodeSummary[],
): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  for (const author of authors) {
    const slug = slugFromRootPath(author.path);
    if (slug) entries.push({ path: `/authors/${slug}`, publishedAt: author.publishedAt });
  }
  for (const tag of tags) {
    const slug = slugFromRootPath(tag.path);
    if (slug) entries.push({ path: `/tags/${slug}`, publishedAt: tag.publishedAt });
  }
  for (const post of posts) {
    const split = splitPostPath(post.path);
    if (split) {
      entries.push({ path: `/posts/${split.authorSlug}/${split.postSlug}`, publishedAt: post.publishedAt });
    }
  }
  return entries;
}

// Sitemap-shaped entries for every published node the public API exposes,
// zero-argument so /sitemap.xml can call it directly. Walks all three
// document types — each via searchAllContent's own cursor loop — then
// hands the summaries to mapSummariesToSitemapEntries for the pure part.
export async function searchAllContentForSitemap(): Promise<SitemapEntry[]> {
  const [authorTypeId, postTypeId, tagTypeId] = await Promise.all([
    requireDocumentTypeId("Author"),
    requireDocumentTypeId("Post"),
    requireDocumentTypeId("Tag"),
  ]);
  const [authors, posts, tags] = await Promise.all([
    searchAllContent(authorTypeId),
    searchAllContent(postTypeId),
    searchAllContent(tagTypeId),
  ]);

  return mapSummariesToSitemapEntries(posts, authors, tags);
}

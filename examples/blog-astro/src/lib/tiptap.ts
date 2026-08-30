// A small, dependency-free serializer from a TipTap/ProseMirror JSON
// document (Velora's RICH_TEXT datatype value shape — see
// plugins/blog/src/plugin.tsx's Post.body / Author.bio fields) to a safe
// HTML string.
//
// Deliberately NOT a full TipTap renderer: only the node/mark set this
// starter's sample content actually uses. Session 150, D3:
//   - block nodes: doc, paragraph
//   - inline leaf: text
//   - marks: bold, italic, link
//   - any OTHER node type degrades gracefully — its children (if any) are
//     still rendered, just without whatever semantic wrapper that node
//     type would normally add. A node with no `content` array renders as
//     nothing. Nothing ever throws on an unrecognized shape.
// ALL text is HTML-escaped before it's placed in the output, even though
// this content is always same-site (defense in depth, not because a
// same-site source is expected to be hostile today).

interface TiptapMark {
  type?: string;
  attrs?: Record<string, unknown>;
}

interface TiptapNode {
  type?: string;
  text?: string;
  marks?: TiptapMark[];
  content?: TiptapNode[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTiptapNode(value: unknown): value is TiptapNode {
  return isPlainObject(value);
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Link-scheme allowlist (found in review: the original implementation
// entity-escaped the href but never checked its scheme, so a stored
// `javascript:alert(1)` round-tripped into a live clickable anchor — no
// upstream sanitization exists anywhere in the pipeline). http:/https:/
// mailto: are allowed outright; a URL with NO scheme at all (relative,
// scheme-relative "//host/...", hash "#x", query "?x") is also safe —
// the browser resolves it against the current page's origin/protocol,
// never as an executable scheme. Anything else (javascript:, data:,
// vbscript:, any unrecognized scheme) is rejected.
const SAFE_LINK_SCHEMES = new Set(["http:", "https:", "mailto:"]);

// Mirrors real browser URL pre-processing (the WHATWG URL parser's first
// steps): ASCII tab (0x09), LF (0x0A), and CR (0x0D) are removed from
// ANYWHERE in the string — that's what lets an obfuscated href like
// "java\tscript:alert(1)" slip past a naive substring check while still
// resolving to the javascript: scheme at the browser level — and then
// leading/trailing C0 controls (0x00-0x1F) and spaces (0x20) are
// trimmed. INTERIOR spaces are left intact ("https://example.com/my
// page" keeps its space), matching what a browser would actually parse.
// Canonicalized BEFORE scheme detection, and the canonicalized form is
// also what gets emitted, so detection and output can never disagree
// with each other. Implemented as an explicit code-point walk (not a
// regex control-char class) to keep this file plain ASCII source with no
// embedded/escaped control bytes.
function canonicalizeHref(rawHref: string): string {
  // Remove tab/LF/CR everywhere.
  let result = "";
  for (const char of rawHref) {
    const codePoint = char.codePointAt(0) ?? 0;
    if (codePoint === 0x09 || codePoint === 0x0a || codePoint === 0x0d) continue;
    result += char;
  }
  // Trim leading/trailing C0 controls (0x00-0x1F) and spaces (0x20) —
  // <= 0x20 covers exactly that range and nothing else.
  let start = 0;
  let end = result.length;
  while (start < end && (result.codePointAt(start) ?? 0) <= 0x20) start++;
  while (end > start && (result.codePointAt(end - 1) ?? 0) <= 0x20) end--;
  return result.slice(start, end);
}

// A leading `scheme:` per the URL grammar (letter, then letters/digits/
// +/-/. , then a colon) — checked case-insensitively since scheme names
// aren't case-sensitive ("JaVaScRiPt:" is the same scheme as
// "javascript:").
function extractScheme(href: string): string | null {
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(href);
  return match ? `${match[1]!.toLowerCase()}:` : null;
}

function isSafeHref(href: string): boolean {
  if (href.length === 0) return false;
  const scheme = extractScheme(href);
  if (!scheme) return true; // no scheme: relative/scheme-relative/hash/query
  return SAFE_LINK_SCHEMES.has(scheme);
}

function renderMarks(escapedText: string, marks: TiptapMark[] | undefined): string {
  if (!Array.isArray(marks) || marks.length === 0) return escapedText;

  // Applied innermost-first (array order), so ["bold", "italic"] wraps as
  // <em><strong>text</strong></em> — order doesn't change the rendered
  // result for these marks, just the tag nesting.
  return marks.reduce((text, mark) => {
    switch (mark.type) {
      case "bold":
        return `<strong>${text}</strong>`;
      case "italic":
        return `<em>${text}</em>`;
      case "link": {
        const rawHref = typeof mark.attrs?.href === "string" ? mark.attrs.href : "";
        if (!rawHref) return text;
        const href = canonicalizeHref(rawHref);
        // Unsafe scheme: degrade to the plain (already-marked) text —
        // the content survives, the anchor just doesn't.
        if (!isSafeHref(href)) return text;
        return `<a href="${escapeHtml(href)}" rel="noopener noreferrer">${text}</a>`;
      }
      default:
        // Unrecognized mark: leave the text unwrapped rather than dropping
        // it — the mark is decoration, the text itself is still real
        // content.
        return text;
    }
  }, escapedText);
}

function renderChildren(content: TiptapNode[] | undefined): string {
  if (!Array.isArray(content)) return "";
  return content.map(renderNode).join("");
}

function renderNode(node: unknown): string {
  if (!isTiptapNode(node)) return "";

  if (node.type === "text") {
    // `text` can be any JSON value on a malformed doc (a number, an
    // object) — escapeHtml calls .replace, so anything non-string must
    // degrade to "" here to honor this file's "never throws" contract.
    const text = typeof node.text === "string" ? node.text : "";
    return renderMarks(escapeHtml(text), node.marks);
  }

  if (node.type === "paragraph") {
    return `<p>${renderChildren(node.content)}</p>`;
  }

  if (node.type === "doc") {
    return renderChildren(node.content);
  }

  // Unknown node type: degrade gracefully — render whatever children it
  // has with no wrapper of our own, or nothing at all if it has none
  // (e.g. an unsupported void node like a horizontal rule).
  return renderChildren(node.content);
}

/**
 * Renders a TipTap document value to a safe HTML string. Accepts
 * `unknown` because rich-text field data arrives as `Record<string,
 * unknown>` off the public Content API — never assume the shape without
 * checking. A bare string value (a plain-text fallback, not a real
 * TipTap doc) is escaped and wrapped in a single paragraph. Anything
 * else unrecognized (null, undefined, an array, a doc missing `content`)
 * renders as an empty string rather than throwing.
 */
export function renderRichText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") {
    return value.length > 0 ? `<p>${escapeHtml(value)}</p>` : "";
  }
  if (!isTiptapNode(value)) return "";
  return renderNode(value);
}

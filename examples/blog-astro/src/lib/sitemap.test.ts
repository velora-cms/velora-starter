import { describe, expect, it } from "vitest";
import { buildSitemapXml, withHomeEntry } from "./sitemap.js";

describe("buildSitemapXml", () => {
  it("renders loc + lastmod per entry against the given origin", () => {
    const xml = buildSitemapXml("https://blog.example.com", [
      { path: "/hello", publishedAt: "2026-08-19T10:00:00.000Z" },
    ]);
    expect(xml).toContain("<?xml");
    expect(xml).toContain("<loc>https://blog.example.com/hello</loc>");
    expect(xml).toContain("<lastmod>2026-08-19T10:00:00.000Z</lastmod>");
  });

  it("XML-escapes special characters in paths", () => {
    const xml = buildSitemapXml("https://x.example", [
      { path: "/a&b<c>", publishedAt: "2026-01-01T00:00:00.000Z" },
    ]);
    expect(xml).toContain("<loc>https://x.example/a&amp;b&lt;c&gt;</loc>");
    expect(xml).not.toContain("/a&b<");
  });

  it("renders an empty urlset for zero entries", () => {
    const xml = buildSitemapXml("https://x.example", []);
    expect(xml).toContain("urlset");
    expect(xml).not.toContain("<url>");
  });

  it("omits <lastmod> for an entry with no publishedAt", () => {
    const xml = buildSitemapXml("https://x.example", [{ path: "/" }]);
    expect(xml).toContain("<loc>https://x.example/</loc>");
    expect(xml).not.toContain("<lastmod>");
  });
});

describe("withHomeEntry", () => {
  it("prepends / with lastmod = the newest publishedAt among the given entries", () => {
    const entries = withHomeEntry([
      { path: "/posts/a/b", publishedAt: "2026-01-01T00:00:00.000Z" },
      { path: "/authors/a", publishedAt: "2026-08-19T00:00:00.000Z" },
    ]);
    expect(entries[0]).toEqual({ path: "/", publishedAt: "2026-08-19T00:00:00.000Z" });
    expect(entries).toHaveLength(3);
  });

  it("prepends / with no lastmod when there are no other entries", () => {
    const entries = withHomeEntry([]);
    expect(entries).toEqual([{ path: "/", publishedAt: undefined }]);
  });
});

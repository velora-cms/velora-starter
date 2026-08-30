import { describe, expect, it } from "vitest";
import { mapSummariesToSitemapEntries, type ContentNodeSummary } from "./api.js";

// Minimal-but-valid ContentNodeSummary — mapSummariesToSitemapEntries only
// reads .path and .publishedAt, but the type requires the rest.
function summary(path: string, overrides: Partial<ContentNodeSummary> = {}): ContentNodeSummary {
  return {
    id: "id-1",
    parentId: null,
    path,
    depth: path.split("/").filter(Boolean).length - 1,
    sortOrder: 0,
    documentTypeId: "type-1",
    locale: "en",
    publishedAt: "2026-08-19T00:00:00.000Z",
    ...overrides,
  };
}

describe("mapSummariesToSitemapEntries", () => {
  it("maps a Post's tree path /{author}/{post} to /posts/{author}/{post}", () => {
    const entries = mapSummariesToSitemapEntries([summary("/jane-doe/hello-velora")], [], []);
    expect(entries).toEqual([{ path: "/posts/jane-doe/hello-velora", publishedAt: "2026-08-19T00:00:00.000Z" }]);
  });

  it("maps an Author's root path /{slug} to /authors/{slug}", () => {
    const entries = mapSummariesToSitemapEntries([], [summary("/jane-doe")], []);
    expect(entries).toEqual([{ path: "/authors/jane-doe", publishedAt: "2026-08-19T00:00:00.000Z" }]);
  });

  it("maps a Tag's root path /{slug} to /tags/{slug}", () => {
    const entries = mapSummariesToSitemapEntries([], [], [summary("/astro")]);
    expect(entries).toEqual([{ path: "/tags/astro", publishedAt: "2026-08-19T00:00:00.000Z" }]);
  });

  it("skips a malformed post path instead of crashing", () => {
    const entries = mapSummariesToSitemapEntries(
      [summary("/too/many/segments/here"), summary("/jane-doe/hello-velora")],
      [],
      [],
    );
    expect(entries).toEqual([{ path: "/posts/jane-doe/hello-velora", publishedAt: "2026-08-19T00:00:00.000Z" }]);
  });
});

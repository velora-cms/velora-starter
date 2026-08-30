import { describe, expect, it } from "vitest";
import { deriveSeoTags, isSeoValue } from "./seo.js";

const url = new URL("https://blog.example.com/posts/jane/hello");

describe("isSeoValue", () => {
  it("accepts partial objects and rejects non-objects", () => {
    expect(isSeoValue({ title: "T" })).toBe(true);
    expect(isSeoValue({})).toBe(true);
    expect(isSeoValue(null)).toBe(false);
    expect(isSeoValue("x")).toBe(false);
    expect(isSeoValue({ title: 42 })).toBe(false);
  });
});

describe("deriveSeoTags", () => {
  it("falls back to the page title and derives canonical from the request URL", () => {
    const tags = deriveSeoTags({ pageTitle: "Hello", seo: undefined, requestUrl: url });
    expect(tags.title).toBe("Hello");
    expect(tags.ogTitle).toBe("Hello");
    expect(tags.description).toBeUndefined();
    expect(tags.canonical).toBe("https://blog.example.com/posts/jane/hello");
    expect(tags.ogImagePath).toBeUndefined();
  });

  it("prefers seo overrides and maps ogImage to the proxy path", () => {
    const tags = deriveSeoTags({
      pageTitle: "Hello",
      seo: { title: "SEO title", description: "Desc", ogImage: "media-1" },
      requestUrl: url,
    });
    expect(tags.title).toBe("SEO title");
    expect(tags.ogTitle).toBe("SEO title");
    expect(tags.description).toBe("Desc");
    expect(tags.ogDescription).toBe("Desc");
    expect(tags.ogImagePath).toBe("/og-image/media-1");
  });

  it("ignores a malformed seo value entirely", () => {
    const tags = deriveSeoTags({ pageTitle: "Hello", seo: { title: 42 }, requestUrl: url });
    expect(tags.title).toBe("Hello");
  });

  it("strips query strings from the canonical", () => {
    const tags = deriveSeoTags({
      pageTitle: "H", seo: undefined,
      requestUrl: new URL("https://blog.example.com/p?utm=x"),
    });
    expect(tags.canonical).toBe("https://blog.example.com/p");
  });
});

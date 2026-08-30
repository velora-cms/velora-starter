import { describe, expect, it } from "vitest";
import { buildSubmitUrl, collectValues } from "./contact-form.js";

describe("buildSubmitUrl", () => {
  it("appends the plugin submit path to the API base, trimming a trailing slash", () => {
    expect(buildSubmitUrl("https://cms.example/")).toBe("https://cms.example/api/plugins/com.velora.forms/submit");
    expect(buildSubmitUrl("https://cms.example")).toBe("https://cms.example/api/plugins/com.velora.forms/submit");
  });
});

describe("collectValues", () => {
  it("splits the honeypot out of the submitted values", () => {
    const fd = new FormData();
    fd.set("website", "");
    fd.set("name", "Ada");
    fd.set("email", "ada@example.com");
    const { website, values } = collectValues(fd);
    expect(website).toBe("");
    expect(values).toEqual({ name: "Ada", email: "ada@example.com" });
  });
  it("carries a filled honeypot through so the server can decide", () => {
    const fd = new FormData();
    fd.set("website", "http://spam.example");
    fd.set("name", "Bot");
    expect(collectValues(fd).website).toBe("http://spam.example");
  });
});

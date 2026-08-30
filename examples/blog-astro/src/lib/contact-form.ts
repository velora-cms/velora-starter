// Pure helpers for the browser-direct contact page (src/pages/contact.astro).
// Split out so the request-shaping logic is testable without a browser or a
// running Velora instance — see contact-form.test.ts.

// The public submit endpoint's path never changes per-install (it's the
// forms plugin's fixed manifest id, `com.velora.forms`), only the CMS
// origin does. Trims a trailing slash on the base so both
// "https://cms.example" and "https://cms.example/" produce the same URL.
export function buildSubmitUrl(apiBase: string): string {
  return `${apiBase.replace(/\/$/, "")}/api/plugins/com.velora.forms/submit`;
}

// `website` is the honeypot (forms plugin README): a field no real
// visitor's browser ever fills in, because it's visually hidden from the
// rendered form (see contact.astro's honeypot input). Split it out of the
// FormData here so it travels as its own top-level `website` key in the
// POST body — exactly what submitHandler in plugins/forms expects — while
// everything else the visitor actually typed (name, email, message) goes
// into `values`, keyed by field id.
export function collectValues(formData: FormData): { website: string; values: Record<string, unknown> } {
  const values: Record<string, unknown> = {};
  let website = "";
  for (const [key, value] of formData.entries()) {
    if (key === "website") {
      website = typeof value === "string" ? value : "";
      continue;
    }
    values[key] = value;
  }
  return { website, values };
}

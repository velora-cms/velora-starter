# Blog Starter

A small [Astro](https://astro.build) frontend for Velora's Blog
template — reads Post, Author, and Tag content straight from your
running Velora instance's public headless API, server-side, on every
request. Publish a new post in the admin and it shows up here with no
rebuild.

## Setup

1. On your **Velora server**, turn on the headless API:
   ```
   VELORA_HEADLESS=true
   ```
2. In the Velora admin, go to **Settings → API Keys** and create a key.
3. In this directory:
   ```
   npm install
   cp .env.example .env
   ```
   Fill in `.env`:
   - `VELORA_API_URL` — your running Velora server's origin, e.g.
     `http://localhost:3000`.
   - `VELORA_API_KEY` — the key you created in step 2.
   - `PUBLIC_VELORA_API_URL` — usually the same origin as
     `VELORA_API_URL`, but read separately by the contact page
     (see below) since it's inlined into the browser bundle.
4. `npm run dev` — the blog runs at `http://localhost:4321` (or
   whichever port Astro selects if that's taken).

No other configuration is required — Post/Author/Tag document-type ids
are looked up by name at request time (`GET /api/v1/document-types`),
never hardcoded, so this works against any instance that has the Blog
template installed regardless of install order.

## What you get out of the box

The Blog template seeds one sample Author (Jane Doe) with two sample
Posts, and two sample Tags, when it's installed. With nothing more than
the setup above, `npm run dev` renders:

- `/` — a list of both sample posts, newest first, with author name,
  published date, and tag chips.
- `/posts/jane-doe/hello-velora` and
  `/posts/jane-doe/writing-your-first-post` — full post detail pages,
  with the rich-text body rendered from TipTap JSON.
- `/authors/jane-doe` — Jane's bio and both her posts.
- `/tags/announcements` and `/tags/guides` — each tag's one matching
  post.

Edit or publish content in the Velora admin and refresh — there's no
build step between the CMS and what you see here.

## Routes

| Route | Renders |
| --- | --- |
| `/` | Post list: title, author, date, tag chips |
| `/posts/[author]/[post]` | Post detail: rich-text body, conditional featured image, author link, tags |
| `/authors/[slug]` | Author name, rich-text bio, their posts |
| `/tags/[slug]` | Posts whose `tags` field contains that exact tag slug |
| `/contact` | A contact form that posts directly from the browser to the CMS — see below |

## The contact page

`/contact` (`src/pages/contact.astro`) is different from every other page
in this starter: it doesn't go through `src/lib/api.ts`'s server-side
client at all. Its inline `<script>` runs in the visitor's browser and
POSTs straight to the Forms plugin's public endpoint,
`POST /api/plugins/com.velora.forms/submit`, with **no API key** —
Velora's `public` plugin-route tier is genuinely un-credentialed by
design, and this page is the reference example a third-party site would
copy.

To make it work:

1. In the Velora admin's Forms section, create a form with slug
   **`contact`** and fields `name`, `email`, `message` (matching the
   inputs this page renders) — the endpoint 404s until that form exists
   and is enabled.
2. On the Velora server, add this site's origin to `VELORA_CORS_ORIGINS`
   (comma-separated list of absolute origins). Without it, the browser's
   CORS check blocks the request before it ever reaches the CMS.
3. Set `PUBLIC_VELORA_API_URL` in `.env` (see Setup above) — this is a
   *different* variable from `VELORA_API_URL` on purpose: only a
   `PUBLIC_`-prefixed variable is inlined into client-side code by Astro,
   and `VELORA_API_KEY` must never gain a `PUBLIC_` twin.

The form also carries a hidden `website` honeypot field
(`src/lib/contact-form.ts`'s `collectValues`) — real visitors never see or
fill it in; a bot that does gets an indistinguishable `200 { ok: true }`
while nothing is actually stored. See `plugins/forms/README.md` for the
full endpoint contract (status codes, rate limiting, honeypot behavior).

## Why some things work the way they do

- **SSR, not static.** `astro.config.mjs` sets `output: "server"` and
  every page sets `export const prerender = false` — every request
  re-reads the live content tree. A static build would need a rebuild
  after every publish, which defeats the point of a headless CMS demo.
- **Content tree IS the URL shape.** A Post's parent is always its
  Author (`plugins/blog/src/plugin.tsx`'s `treeRules`), so a Post's
  materialized path is always `/{authorSlug}/{postSlug}` — the detail
  route reads straight off `GET /api/v1/content/by-path`, no id lookup
  needed once you know the two slugs.
- **Tags are a plain text field, not a reference.** No content-reference
  datatype exists yet (recorded as a Month 14 gap), so `Post.tags` is a
  comma-separated list of Tag slugs, e.g. `"guides,announcements"`. The
  tag page splits that field on commas and matches the target slug
  **exactly** — never a substring match on the raw text.
- **Rich text is rendered by a small local serializer**
  (`src/lib/tiptap.ts`), not a TipTap/ProseMirror dependency — this
  starter only needs to display `doc`/`paragraph`/`text` with
  bold/italic/link marks, and an unrecognized node type degrades to
  rendering its children (or nothing) instead of crashing the page. All
  text is HTML-escaped before it's ever inserted into the page.
- **The featured image field is optional and conditional.** It holds a
  Media Library id (a string), fetched separately via
  `GET /api/v1/media/:id` for a fresh download URL — never embedded in
  the content response. The sample content leaves it unset, and the
  detail page simply renders nothing in that case.

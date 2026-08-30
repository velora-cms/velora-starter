# Hello website

A normal website on Velora's headless API: one file, no framework, no
npm dependencies. `server.js` fetches published content server-side
(your API key never reaches the browser) and renders plain HTML — the
home page lists every content item grouped by document type; click one
to see its fields.

## Try it in one minute (hosted demo)

```sh
cp .env.example .env   # then uncomment the "hosted demo" block in .env
node server.js         # open http://localhost:4600
```

## Point it at your own instance

1. Run your Velora server with `VELORA_HEADLESS=true`.
2. In the admin, go to **Settings → API Keys** and create a key.
3. Put your server's origin and the key in `.env`, then `node server.js`.

## Make it say hello world

In the Velora admin:

1. **Document types** → create a type — e.g. `Page` with a text field
   `title` and a rich-text field `body`.
2. **Content** → create a `Page`, type "Hello world", **publish** it.
3. Refresh the site — your page is listed under **Page**; click it to
   see the fields. No rebuild, no cache to clear.

From here, view source on `server.js` — the whole site is ~120 lines —
and reshape the HTML however you like.

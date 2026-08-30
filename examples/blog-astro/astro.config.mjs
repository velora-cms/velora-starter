import { defineConfig } from "astro/config";
import node from "@astrojs/node";

// SSR everywhere, no static prerender of content routes — a newly
// published post must appear without a rebuild (Session 150, D1). The
// node adapter's "standalone" mode gives `npm run preview`/a production
// deploy a self-contained server; `npm run dev` (the primary way to run
// this starter) never touches the adapter at all.
export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
});

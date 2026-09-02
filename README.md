# Velora Starter

Build with [Velora](https://velora-cms.com) — the CMS that never loses
your data, never breaks on update, and scales to any size. Every version
of everything you write is kept.

This repository is the community home for building **with** Velora:
runnable examples, the public issue tracker, and
[Discussions](../../discussions).

## Try Velora right now

- **Hosted demo API** — a live, headless Velora instance:
  `https://demo.velora-cms.com` (public demo key below — the demo blocks writes at its edge).
- **Docs** — <https://docs.velora-cms.com>
- **Marketplace** — <https://marketplace.velora-cms.com>

```sh
curl -H "Authorization: Bearer vk_4ac0a6b78b953a13b8646e6379fcbb6bee1a269af253a14eebce668572019328" \
  "https://demo.velora-cms.com/api/v1/content?limit=3"
```

That key is intentionally public: the demo blocks every write at its edge, it is rate-limited,
rotated whenever we feel like it.

## Run the example site

[`examples/hello-website`](examples/hello-website) is a normal website
on Velora's headless API — one plain Node file, no framework, no npm
dependencies. It lists the instance's document types and published
content and renders any item's fields; point it at the hosted demo and
it shows live demo content:

```sh
cd examples/hello-website
cp .env.example .env   # then uncomment the hosted-demo block in .env
node server.js         # open http://localhost:4600
```

Its README also walks through creating a document type and publishing a
"Hello world" page against your own instance.

## Run your own Velora

The one-command install is here:

```sh
npm create velora@latest my-site
cd my-site
npm run dev
```

Open http://localhost:3000/velora and finish setup in your browser
(database choice included) — or answer everything in the terminal with
Custom mode. Your project is plain files you own: `server.js` to extend,
`public/` for your assets, uploads in `media/`.

This repository is the official home for **questions and bug reports
about using Velora** — open an issue or start a discussion. Plugin
developers can start today with the
[Velora devkit](https://github.com/velora-cms/velora-devkit).

## Community

- **Bugs & feature requests** → [Issues](../../issues)
- **Questions, ideas, show & tell** → [Discussions](../../discussions)
- **Plugin toolchain issues** → [velora-devkit](https://github.com/velora-cms/velora-devkit/issues)

Velora's core is Apache-2.0. The packages are on npm under the
[`@velora-cms`](https://www.npmjs.com/org/velora-cms) scope.

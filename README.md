# Velora Starter

Build with [Velora](https://velora-cms.com) — the CMS that never loses
your data, never breaks on update, and scales to any size. Every version
of everything you write is kept.

This repository is the community home for building **with** Velora:
runnable examples, the public issue tracker, and
[Discussions](../../discussions).

## Try Velora right now

- **Hosted demo API** — a live, headless Velora instance:
  `https://demo.velora-cms.com` (read-only demo key below).
- **Docs** — <https://docs.velora-cms.com>
- **Marketplace** — <https://marketplace.velora-cms.com>

```sh
curl -H "Authorization: Bearer vk_4ac0a6b78b953a13b8646e6379fcbb6bee1a269af253a14eebce668572019328" \
  "https://demo.velora-cms.com/api/v1/content?limit=3"
```

That key is intentionally public: read-only demo content, rate-limited,
rotated whenever we feel like it.

## Run the example site

[`examples/blog-astro`](examples/blog-astro) is an Astro blog that reads
its posts from a Velora instance's headless API at request time — point
it at the hosted demo and it renders live demo content:

```sh
cd examples/blog-astro
npm install
cp .env.example .env   # then set the three variables — the demo values are in the file's comments
npm run dev
```

## Run your own Velora

A one-command install — **`npm create velora`** — is coming: scaffold a
site, `npm run dev`, and finish the installation in your browser
(database choice included). Until then, the hosted demo above is the
fastest way to explore, and plugin developers can start today with the
[Velora devkit](https://github.com/velora-cms/velora-devkit).

## Community

- **Bugs & feature requests** → [Issues](../../issues)
- **Questions, ideas, show & tell** → [Discussions](../../discussions)
- **Plugin toolchain issues** → [velora-devkit](https://github.com/velora-cms/velora-devkit/issues)

Velora's core is Apache-2.0. The packages are on npm under the
[`@velora-cms`](https://www.npmjs.com/org/velora-cms) scope.

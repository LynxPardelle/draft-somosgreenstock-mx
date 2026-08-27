# Greenstock draft

Spanish-language catalogue for frozen, vacuum-packed fruit and vegetable portions ready to blend, with consumer ordering information and a B2B offering for businesses in Mexico City. This repository contains the sanitized declarative site package, not the client's original documents or source-media archive.

## Project boundaries

- `somosgreenstock.mx` is the approved proposed domain and draft identity; registration and ownership have not been confirmed. This workflow has not registered the domain or published production. Domain purchase and production publication are outside the current scope.
- Testing has **not been deployed**. Public CDN assets and a working local preview do not establish a published website.
- The current private GitHub Free setup cannot satisfy the required protected-release workflow. Resolving that prerequisite requires an owner decision; no visibility change, weaker control or live authoring-scope change is implied.
- Page canonicals target the intended shared testing host and retain `noindex,nofollow`. They are configuration, not evidence of deployment; no branded aliases are configured.
- Customer orders and wholesale enquiries use only the client-facing [Instagram account](https://www.instagram.com/greens.tock/). Do not invent a phone number or add forms, checkout or payments.

The client supplied the product information and media and requested their use. This is not an assertion of independently verified licences, health claims or certification. Keep the nutrition/medical disclaimer and obtain client review of the supplied claims and media permissions.

## Source of truth

- [AGENTS.md](AGENTS.md): contributor routing and safety boundaries.
- [site-config.json](site-config.json): language, routes, theme, indexing and runtime settings.
- [variables.json](variables.json): six product blends, prices, preparation, contact destinations and asset availability.
- [components.json](components.json), [angora-combos.json](angora-combos.json) and each page folder: shared presentation and route content.
- [draft-repo.config.json](draft-repo.config.json) and [.github/workflows/](.github/workflows/): repository deployment contract.
- [Shared draft lifecycle](https://github.com/LynxPardelle/zoolandingpage/blob/main/docs/11-draft-lifecycle.md): authoritative release procedure; do not substitute a manual publication path.

| Route | Page package | Purpose |
| --- | --- | --- |
| `/` | `default` | Product introduction, preparation and ordering |
| `/menu` | `menu` | Six blends and consumer pricing |
| `/impacto` | `impacto` | Client-supplied purpose and inclusion story |
| `/mayoreo` | `mayoreo` | B2B use cases and price tiers |
| `/preguntas` | `preguntas` | Preparation, storage, delivery and ordering FAQ |
| `/404` | `not-found` | Branded recovery page |

## Media and runtime constraints

The published public-asset set contains 28 source-image derivatives, two video posters and two available MP4 videos. Two larger client videos remain pending retrieval, with static fallback content and no playable URL. Asset availability is recorded in `variables.json`; preserve that distinction when updating the catalogue.

Montserrat is the preferred font family, with Arial and sans-serif fallbacks; declaring it does not establish that a font file was delivered. The current generic video renderer exposes controls but has no declarative native poster or caption-track binding, so this draft supplies separate static images and text descriptions. Home/wholesale figures now use a single full-width grid track, and mobile navigation uses smaller padding, minimum 44px targets and wrapping. Section titles retain 2rem through the tablet breakpoint and increase to 3.2rem only at the desktop breakpoint. These configuration fixes still require independent final visual QA before client-ready approval.

Separate shared-runtime preview defects remain open: on an unknown route, the generic SSR 404 link “Ir al inicio” points to `/` and drops `draftDomain` and `debugWorkspace`, leading to an empty default app instead of Greenstock; its CTA also measured only 2.23:1 contrast. These are distinct from the intentional hidden client subtree in the SSR 404 document and are not repaired by the draft layout changes.

## Local preview and QA

Run the shared Zoolandingpage app with this repository at `drafts/somosgreenstock.mx`, following the [hub documentation](https://github.com/LynxPardelle/zoolandingpage/blob/main/docs/README.md). For a client-facing local preview use `http://127.0.0.1:4200/?draftDomain=somosgreenstock.mx&debugWorkspace=false`; replace `/` with a route above. These query parameters belong to preview URLs, not authored navigation links.

From this draft repository:

```sh
node --test tests/qa-contract.test.mjs
node tools/deploy-draft.mjs --domain=somosgreenstock.mx --draft-root=. --environment=test --validate-only=true
node tools/draft-feature-readiness.mjs --domain=somosgreenstock.mx --draft-root=. --mode=test
git diff --check
```

From the hub, with the local server running:

```sh
node tools/draft-smoke-check.mjs --local-base-url=http://127.0.0.1:4200 --domain=somosgreenstock.mx --output=logs/greenstock/draft-smoke.json
node tools/draft-public-safety-audit.mjs --repo=drafts/somosgreenstock.mx --history=true --summary=true
```

The current configuration fixes passed 29 contract tests, validation of 35 payload JSON files and readiness with zero blockers/warnings. The preceding local smoke checkpoint passed 12/12 views: all six routes at 1440×900 and 390×844. Live comparisons were skipped; neither that earlier smoke result nor the current config tests certify testing deployment or final visual QA of these fixes. Dated results and subsequent sign-off belong in the [hub draft changelog](https://github.com/LynxPardelle/zoolandingpage/tree/main/changelog/drafts), not in duplicated release instructions here.

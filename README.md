# SACSA Easter Tournament app

Bilingual (English / Traditional Chinese) Progressive Web App replacing the printed SACSA Easter Tournament brochure. Served at `easter.wpcsa.org.za` from S3 + CloudFront.

See [PLAN.md](PLAN.md) for the roadmap and decisions.

## Development

Requires Node 26 (see `.nvmrc`).

```sh
npm install
npm run dev        # local dev server
npm test           # unit tests (Vitest)
npm run typecheck  # TypeScript
npm run build      # production build to dist/
npm run preview    # serve the production build (service worker active)
```

## Structure

- `src/app.tsx`: app shell and routes (`preact-iso`)
- `src/pages/`: one component per page
- `src/i18n/`: translations. `en.ts` is the source of truth; `zh-Hant.ts` may omit keys, which fall back to English
- `public/`: static assets and icons. Regenerate PNG icons from `favicon.svg` with `swift scripts/generate-icons.swift` (macOS)
- `vite.config.ts`: Vite, PWA manifest and service worker config

## Images

Photos and artwork live as originals in `images/originals/` (committed so they can be regenerated). Run `npm run images` (needs ImageMagick 7) after adding or changing one: it writes AVIF + JPEG versions at several widths to `public/images/generated/` and a manifest at `src/generated/images.json`. Commit the generated files too. In code, use `<Picture name="visit/boulders" …>` (or a content `photo.image`), never a raw `<img>` to a photo, so phones get the smallest file that fits.

## Deployment

Every push to `main` runs typecheck, tests and build, then deploys to https://easter.wpcsa.org.za via GitHub Actions (`.github/workflows/deploy.yml`). Pull requests run the checks only. The workflow assumes the `wpcsa-easter-deploy` AWS role through OIDC (no stored keys); its ARN is the repo variable `AWS_DEPLOY_ROLE_ARN`.

Infrastructure is created by the numbered scripts in `infra/` (AWS CLI, profile `wpcsa`), in order: bucket, certificate, CloudFront, GitHub deploy role. `infra/deploy.sh` can also be run locally after `npm run build`.

## Translations

Add every new UI string to `src/i18n/en.ts` first, then (optionally) to `src/i18n/zh-Hant.ts`. Chinese text is supplied by community translators; until then strings fall back to English.

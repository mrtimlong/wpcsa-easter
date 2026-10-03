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

## Translations

Add every new UI string to `src/i18n/en.ts` first, then (optionally) to `src/i18n/zh-Hant.ts`. Chinese text is supplied by community translators; until then strings fall back to English.

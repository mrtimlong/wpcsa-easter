# CLAUDE.md

PWA for the SACSA Easter Tournament (replaces the printed brochure). See PLAN.md for decisions and roadmap; README.md for commands.

- Stack: Vite + Preact + TypeScript, `preact-iso` router, `vite-plugin-pwa`, Vitest.
- Hosting: static site on S3 + CloudFront at `easter.wpcsa.org.za`. Infra is set up with AWS CLI scripts in `infra/`, not Terraform/CDK.
- AWS: use `--profile wpcsa` (IAM user `wpcsa-builder`). Region `af-south-1` for S3/Lambda/DynamoDB/API Gateway/Cognito; ACM certificate must be in `us-east-1` (CloudFront requirement). Project IAM roles must be named `wpcsa-easter-*` (the builder user can only manage those).
- All UI text goes through `useI18n().t(key)`; add keys to `src/i18n/en.ts` first. Never hard-code user-facing strings. Chinese is Traditional (`zh-Hant`).
- Site vs data: the repo holds the site only. Tournament data (fixtures, teams, venues, sponsors, vendors, contacts, squads…) is JSON in gitignored `data/`, uploaded to S3 `data/` with `npm run data:upload` and fetched at runtime (`src/data/content.ts`). `sample-data/` holds dummy data for dev/tests/CI. Never hard-code tournament facts (dates, names, places) in components or i18n strings.
- Public repo: never commit secrets, AWS account IDs in credentials form, or personal data. Real names, phone numbers and photos of people belong only in `data/`; `sample-data/` uses placeholders ("Player 1").
- Images: site artwork goes in `images/originals/` (`npm run images`); data photos in `<data dir>/images/originals/` (`npm run images -- --data <dir>`). Render with `<Picture>` (`src/components/picture.tsx`) via `siteImage()` / `dataImage()`. Don't reference photo files directly. Logos/icons stay in `public/`.
- Formatting and linting: Biome (`biome.json`). Run `npm run format` after editing; `npm run build` fails on lint or formatting errors. Data folders and `public/` are excluded.
- Before finishing a change: `npm run format && npm run typecheck && npm test && npm run build`.

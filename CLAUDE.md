# CLAUDE.md

PWA for the SACSA Easter Tournament (replaces the printed brochure). See PLAN.md for decisions and roadmap; README.md for commands.

- Stack: Vite + Preact + TypeScript, `preact-iso` router, `vite-plugin-pwa`, Vitest.
- Hosting: static site on S3 + CloudFront at `easter.wpcsa.org.za`. Infra is set up with AWS CLI scripts in `infra/`, not Terraform/CDK.
- All UI text goes through `useI18n().t(key)`; add keys to `src/i18n/en.ts` first. Never hard-code user-facing strings. Chinese is Traditional (`zh-Hant`).
- Public repo: never commit secrets, AWS account IDs in credentials form, or organiser personal data.
- Before finishing a change: `npm run typecheck && npm test && npm run build`.

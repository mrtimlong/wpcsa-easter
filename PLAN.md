# SACSA Easter Tournament PWA: Plan

A Progressive Web App that replaces the printed/PDF tournament brochure. It is hosted as a static site on AWS S3 behind a CDN, installable on phones, and works offline at venues with poor signal.

## What the 2025 brochure contains (content to replace)

| Brochure section | App equivalent |
|---|---|
| Cover: 64th SACSA Easter Tournament, Cape Town 2025, SACSA + WPCSA logos | Home / hero screen, branding |
| Schedule of events (Fri–Mon: AGM, registration, march past, social, egg hunt, finals, dance) | "Programme" timeline |
| Oath (English + Chinese) | Info page (bilingual) |
| Basketball fixtures: 68 games, 2 courts, divisions (Minis A/B, Jr Mens, Jr Ladies, Ladies, Mens), semis/finals ("Winners of Game 49 & 50") | Fixtures with filters + bracket progression |
| Volleyball fixtures: Hall 2, Court 1, with officials, best-of-3/5 | Fixtures (with officials + match format) |
| Badminton: team lists (WP vs SG) + 7 rubbers | Teams + fixtures |
| Padel at Aura Padel Club (The Open, Rivalry Coastal vs Inland, Ladies mini) | Events + venue info |
| Venues: UCT Sports Centre, Aura Padel, Time Out Market, Chinese Community Centre | Venues page with map links |

## Decisions so far
- **URL:** `easter.wpcsa.org.za`, a subdomain of the existing `wpcsa.org.za` domain (no new domain needed).
- **Results:** organisers (admins) log in and enter scores/results after each game. General content (fixtures, programme, info pages) is maintained by the developer.
- **Site vs data:** the repo holds the site only. All tournament data (fixtures, teams, venues, vendors, contacts, sponsors, squads, info text) is JSON in a gitignored `data/` folder, uploaded to S3 separately and fetched at runtime, so it changes without a deploy and personal details never reach GitHub. Dummy `sample-data/` is committed for development and tests.
- **Language:** fully bilingual English / Traditional Chinese (the brochure uses 繁體), with a language toggle.
- **Architecture:** the public site stays static (S3 + CloudFront). A small serverless admin API writes results, which the app fetches as a JSON file served from S3/CloudFront.
- **DNS:** Tim can edit `wpcsa.org.za` records directly.
- **Results detail (initial, may vary by sport):**
  - Basketball: final score per game, plus standings tables per division/group (points rule TBC; default FIBA-style 2 win / 1 loss / 0 forfeit, tiebreak on head-to-head then points difference).
  - Volleyball: set scores (best of 3 / best of 5).
  - Badminton: per-rubber game scores (e.g. 21-15, 18-21, 21-19), plus the tie result (rubbers won).
  - Padel: TBC.
  - Keep the result schema per-sport and extensible.
- **Repo:** public GitHub repo; only Tim has write access. The AWS deploy role trusts only `main` of this repo via OIDC. No secrets in the repo.
- **Translations:** community members will supply Chinese text later; use placeholder strings (with a "missing translation" fallback to English) for now.
- **Data model:** draft agreed (tournament, venues, associations, competitions, teams, fixtures with slots like "winner of", programme, sponsors; per-sport results). Must stay flexible: number of sports, basketball pools, and volleyball/badminton formats are unknown and will change.
- **Player names:** never committed to GitHub. Squads live in `data/squads.json`; move to DynamoDB later only if organisers need to edit squads in `/admin`.
- **Sponsors:** a sponsors page (tiers, logos, descriptions), and for advertising, sponsor logos rotating at the foot of every page (may change later).
- **AWS region:** `af-south-1` (Cape Town); ACM cert in `us-east-1`. CLI profile `wpcsa`.
- **Infrastructure:** set up with AWS CLI scripts (checked into `infra/` as a runbook of commands), not Terraform/CDK. Keep it minimal.
- **Site sections (chairman, Oct 2026):** bottom tab bar with Home, Schedule, Results, Standings and More. Under More: Tournament info (format, rules, code of conduct, contacts), Teams (photo, squad, coach), Venues (toilets, medics, merchandise…), Vendors, Sponsors, Visiting, My teams, plus Sport rules and Announcements (organiser updates, urgent banner).
- **Target event:** Easter 2027, Fri 26 – Mon 29 March 2027. The app should be live with fixtures well before then (aim: early March 2027).

## High-level tasks

### Phase 0: Decisions & project setup
1. Confirm scope for MVP (static brochure replacement vs. live scores; see open questions).
2. Choose stack (proposal: Vite + TypeScript + Preact/React + `vite-plugin-pwa`).
3. Infrastructure via AWS CLI scripts in `infra/` (decided).
4. `git init`, create a GitHub repo, and add basic README/CLAUDE.md.

### Phase 1: DNS for `easter.wpcsa.org.za`
1. Find out where `wpcsa.org.za` DNS is hosted and who has access.
2. Add the ACM certificate validation CNAME record.
3. Add a CNAME record: `easter` → the CloudFront distribution domain.
   - No nameserver change is needed, so the main site and email are unaffected.

### Phase 2: AWS hosting
1. AWS account hygiene: an IAM user/role, MFA, and a billing alert (expected cost is a few dollars/month at most).
2. S3 bucket: private, Block Public Access ON, versioning ON.
3. ACM TLS certificate in `us-east-1` for the domain (DNS-validated).
4. CloudFront distribution: Origin Access Control (OAC) to the private bucket, HTTPS redirect, compression, SPA fallback to `index.html`, caching policies (long cache for hashed assets, short for `index.html`/`sw.js`/data JSON).
5. DNS record (CNAME/ALIAS) for the domain → CloudFront.
   - Alternative: Cloudflare proxy directly in front of S3. It's simpler, but the bucket must be public and there's no TLS to the origin, so CloudFront + OAC is recommended.

### Phase 3: Content & data model
1. Design a year-agnostic JSON schema: `tournament`, `venues`, `sports`, `divisions`, `teams`, `fixtures` (id, sport, division, venue/court, start time, home/away *or* "winner of game X", officials, format, result), `events` (programme), `pages` (oath, info), `sponsors`.
2. Transcribe the 2025 brochure into this format as seed/test data.
3. Decide how organisers maintain data each year (JSON in repo, a spreadsheet → JSON import script, or a simple admin UI).

### Phase 4: App build (MVP)
1. App shell, navigation, branding (blue/white theme, logos, bilingual touches).
2. Home: "Happening now / next up", countdown, key info.
3. Programme timeline (by day).
4. Fixtures: by day / sport / court / division / team, with a "My teams" favourites filter (stored locally).
5. Bracket/knockout views that resolve "Winner of Game 49" once results exist.
6. Teams & squads, venues (map links), info pages (oath, rules), sponsors.
7. PWA: manifest, icons, service worker (offline cache of shell + data), install prompt / iOS "Add to Home Screen" guidance.
8. Accessibility, performance (Lighthouse), and testing on iOS Safari + Android Chrome.

### Phase 5: Deployment pipeline
1. GitHub Actions: build → `aws s3 sync` → CloudFront invalidation.
2. AWS auth via GitHub OIDC role (no long-lived keys).
3. Preview/staging environment (optional: a second bucket/distribution or path).

### Phase 6: Organiser results entry (in scope)
1. Auth: Amazon Cognito user pool. Developer invites organiser accounts; no public sign-up.
2. API: API Gateway (HTTP API) + Lambda, which validates input and stores results in DynamoDB.
3. On each save, Lambda regenerates `results.json` in S3 (short CloudFront cache, ~30s), so public reads stay static, fast, cheap and offline-capable.
4. Admin screens in the same PWA (`/admin`): login, pick a game, enter score/winner, plus best-of-3/5 set scores for volleyball and rubbers for badminton.
5. App derives standings and resolves knockout slots ("Winner of Game 49") from results.
6. Audit trail: who entered/changed each result and when.
7. Later: push notifications (Web Push; iOS requires the app to be installed).

### Phase 7: Launch
1. Generate a QR code for posters/registration desk/printed flyers.
2. Share the link with teams and organisers ahead of the tournament.
3. Monitor during the event; quick-fix process for schedule changes.
4. Post-event: archive the year (e.g. `/2027`) and roll over for next year.

## Still to do

The detailed, owned and dated list of remaining work (decisions, results backend, admin screens, 2027 content, translations and sign-off, testing, organiser walkthroughs, launch, event, post-event) is in **[docs/checklist.md](docs/checklist.md)**. It replaces the TODO list and open questions that used to be here.

# Launch checklist: SACSA Easter Tournament 2027

Everything still to do before, during and after Easter 2027 (**Fri 26 – Mon 29 March 2027**). Target: the app is live with real fixtures by **early March 2027**, and organisers have practised entering results before then.

**Owners:** **Tim** (developer) · **Org** (tournament organisers / committee) · **Tr** (community translators) · **Spons** (whoever looks after sponsors).
**Target** is the month the item should be done by. Tick items off in this file as they're done.

Already done: domain + DNS, S3 bucket, certificate, CloudFront, GitHub Actions deploys, data model + validation, 2025 seed data, logos (PNG), Visiting Cape Town page (example content), Year of the Goat hero, responsive AVIF images, schedule/results/standings pages (demo results).

---

## 1. Decisions and inputs needed from organisers

These block later work, so get answers early.

| ✓ | Item | Owner | Target |
|---|---|---|---|
| [ ] | Confirm 2027 host city, venues and courts (UCT Sports Centre again? halls/courts per sport) | Org | Nov 2026 |
| [ ] | Confirm sports and divisions for 2027 (basketball divisions and pools, volleyball format, badminton format, padel: in the app or info only?; golf: courses, rounds, divisions and how scores are shown) | Org | Nov 2026 |
| [ ] | Basketball standings rules: points (default win 2 / loss 1 / forfeit 0) and tiebreak order (default head-to-head → difference → points scored) | Org | Nov 2026 |
| [ ] | Volleyball and badminton standings rules (points per win? set ratio?) and best-of formats per round | Org | Nov 2026 |
| [ ] | Edition number for 2027 (66th?) and official tournament name in English and Chinese | Org | Nov 2026 |
| [ ] | Official Chinese name of SACSA: the 2025 cover says 華橋, the logo says 華僑 | Org / Tr | Nov 2026 |
| [ ] | Who will enter results: names and emails of the committee members (decided: a couple of committee members, all with the same access, not restricted by sport) | Org | Jan 2027 |
| [x] | Can scorers change a fixture's time or court on the day? Decided: not in 2027. Moves go out as an announcement and Tim uploads the corrected fixtures; editing time/court in `/admin` is a version 2 feature | Org | Nov 2026 |
| [x] | Final list of site sections (chairman, Oct 2026): Home, Schedule, Results, Standings in the tab bar; under More: Tournament info (format, rules, code of conduct, contacts), Teams (photo, squad, coach), Venues (toilets, medics, merchandise…), Vendors, Sponsors, Visiting, My teams | Org / Tim | Dec 2026 |
| [ ] | Contacts: confirm who is listed, and whether to show personal mobile numbers or role-based ones | Org | Jan 2027 |
| [ ] | Team photos: do teams send them before the tournament, or are they taken on the day? Who collects them? | Org | Jan 2027 |
| [ ] | Team lists and squads: we start with a spreadsheet per association; the committee decides whether a Google Form would be easier for associations | Org | Dec 2026 |
| [ ] | Golf: ask the golf convenor whether they want live scoring in the app. Default for 2027: final standings only, posted after the last round | Tim | Nov 2026 |
| [ ] | Vendors: who collects their details (what they sell, where, hours, payment methods, logo), and by when | Org | Feb 2027 |
| [x] | Advertising: rotating sponsor logos on every page, linking to a sponsors page with more detail (may change later) | Org / Spons | Dec 2026 |
| [ ] | Sponsor list, tiers and logos (SVG or large PNG) plus links | Spons | Feb 2027 |
| [ ] | Announcements: the same committee members post them; who checks the Chinese before urgent posts go out (or post English only during the event) | Org | Jan 2027 |
| [ ] | Player consent: players (or parents of minors) agree to names **and team photos** being shown publicly in the app during the event (POPIA). Add to the registration form | Org | Jan 2027 |
| [ ] | Is the AI-generated goat artwork OK with the committee, or should a designer redo it? | Org | Nov 2026 |

## 2. Organiser results backend

All in `af-south-1`, set up with AWS CLI scripts in `infra/` (05+), IAM roles named `wpcsa-easter-*`.

| ✓ | Item | Owner | Target |
|---|---|---|---|
| [ ] | Reactivate the `wpcsa-builder` access key for the build; deactivate it again afterwards | Tim | Oct 2026 |
| [ ] | Run `infra/05-admin-backend.sh`, commit the `src/generated/backend.json` it writes, add your own login with `infra/admin-users.sh add`, and try /admin on a phone | Tim | Oct 2026 |
| [x] | **DynamoDB**: one table for results, announcements and the audit trail (key: year + `RESULT#<fixture id>` / `ANN#<id>` / `AUDIT#…`), on-demand billing, point-in-time recovery on. Table `wpcsa-easter`, created by `infra/05-admin-backend.sh` | Tim | Oct 2026 |
| [x] | Audit trail: every save/change/delete recorded with who, when, before and after (separate items or table). Written in the same transaction as the change (`AUDIT#<time>` items) | Tim | Oct 2026 |
| [x] | **Cognito user pool**: admin-created users only (no self sign-up), email + password, password reset by email, optional MFA; an `admin` group for super users (every sport, and announcements) and a `scorer-<sport>` group per sport (results for that sport only). Pool `wpcsa-easter-admins` (Lite tier, 10-character passwords); MFA not turned on | Tim | Oct 2026 |
| [x] | **API Gateway HTTP API** with a Cognito JWT authorizer; CORS limited to `easter.wpcsa.org.za` (+ localhost for dev); throttling. One `ANY /{proxy+}` route, 10 req/s, bursts of 20 | Tim | Nov 2026 |
| [x] | **Lambda: save result**: validate with the shared zod schema, check the fixture exists, check the score makes sense for the sport/best-of, conditional write (reject if someone else changed it meanwhile), write audit record | Tim | Nov 2026 |
| [x] | Lambda: delete/clear a result (for mistakes), admin only | Tim | Nov 2026 |
| [x] | On every change, regenerate `data/results.json` in S3 and invalidate it in CloudFront (short cache, ~30 s). No invalidation needed: the file is written with `max-age=30`, which CloudFront honours | Tim | Nov 2026 |
| [x] | Lambda execution role: least privilege (this table, `data/results.json` only, this invalidation) | Tim | Nov 2026 |
| [ ] | CloudWatch logs (with retention), alarms for errors/throttles emailed to Tim | Tim | Nov 2026 |
| [x] | Unit tests for the Lambda (validation, conflicts, auth) and an integration test against a test table. Unit tests with an in-memory store (`api/app.test.ts`) and the admin screens end to end (`src/admin/admin.test.tsx`); no integration test against a real table yet | Tim | Nov 2026 |
| [x] | Script to create/disable organiser accounts from a list (not committed: emails are personal data). `infra/admin-users.sh add|grant|revoke <email> super|<sport>…`, `resend|disable|enable <email>`, `list` | Tim | Jan 2027 |
| [x] | Announcements API: create/edit/delete posts (Lambda + same table or a second one), audit trail, regenerates `data/announcements.json` in S3 with a short cache | Tim | Dec 2026 |
| [ ] | Cost check: expected well under $5/month; AWS budget alert set | Tim | Nov 2026 |

## 3. Admin screens (`/admin`)

| ✓ | Item | Owner | Target |
|---|---|---|---|
| [x] | Login / logout / forgot password (bilingual) | Tim | Dec 2026 |
| [x] | Pick a game: today's games across all venues, a "Needs a result" list (started, no final result), by day or sport, or search by game number or team | Tim | Dec 2026 |
| [x] | Score entry per sport, with big touch targets: basketball (two totals), volleyball (sets, best-of aware), badminton (games per rubber), padel (TBC). Padel uses games like badminton until its format is known | Tim | Dec 2026 |
| [x] | Status options: live (update during the game), final, forfeit (which side), cancelled | Tim | Dec 2026 |
| [x] | Confirmation step showing the winner before saving; clear success/failure message | Tim | Dec 2026 |
| [x] | Edit/correct a saved result, with a warning if it changes who goes through to a knockout game | Tim | Dec 2026 |
| [x] | "Someone else updated this game" conflict message | Tim | Dec 2026 |
| [ ] | Poor signal handling: show clearly when a save didn't go through and let the scorer retry (decide whether to queue offline) | Tim | Jan 2027 |
| [x] | Recent changes list (audit view) for admins | Tim | Jan 2027 |
| [x] | Post an announcement: title + text (EN, optional 中文), pinned/urgent toggle, preview, edit and delete | Tim | Jan 2027 |
| [x] | Admin pages excluded from search engines and not cached by the service worker. `noindex` and robots.txt; the admin code is a separate download and its API calls are never cached | Tim | Dec 2026 |

## 4. Public app: switch from demo to live results

| ✓ | Item | Owner | Target |
|---|---|---|---|
| [x] | Pages read results through `useResults()` (`src/results.tsx`), from `/data/results.json`, with the real clock. Demo data (sample-data) still fakes the clock and fills in random results, with real ones from /admin on top, so results entry can be tried on the demo; real 2027 data has no `demo` and shows only real results | Tim | Jan 2027 |
| [x] | Refresh every ~30 s while open and when the app comes back to the foreground; "Updated x min ago" on Results and Standings | Tim | Jan 2027 |
| [x] | Works offline: last known results cached by the service worker (network-first for all data JSON) | Tim | Jan 2027 |
| [x] | Friendly states: "results will appear once the games start on …" before the first game; a warning when results are over 3 minutes old (server unreachable, or the phone's offline copy, judged by the server's Date header) | Tim | Jan 2027 |
| [ ] | Keep a way to preview with demo data (e.g. `?demo` on staging only) for testing | Tim | Jan 2027 |
| [x] | Date-faking for testing: `?at=2027-03-27T14:00` (tournament time) on any page shows the app as if it were then, with a "Back to now" banner; kept for the browser tab's session. Works on the live site and with real data | Tim | Jan 2027 |

## 5. 2027 data

All of this is JSON in the gitignored `data/` folder (never in the repo), uploaded with `npm run data:upload`; no deploy needed. See [data-model.md](data-model.md).

| ✓ | Item | Owner | Target |
|---|---|---|---|
| [ ] | Create `data/` (copy `sample-data/`, remove `demo` from `tournament.json`): `tournament.json`, `venues.json`, `associations.json`, `competitions.json`, `teams.json` | Tim | Jan 2027 |
| [ ] | Back up `data/` somewhere other than this laptop (it isn't in git); S3 versioning keeps old uploads too | Tim | Jan 2027 |
| [x] | **Spreadsheet import**: a Google Sheets template (tabs for teams, squads, vendors, fixtures, with fixed column headings) and `npm run data:import`, which reads the sheets with the Sheets API (read-only service account; squad sheets are never published to the web), writes `data/*.json` and runs `data:check`. Tim still runs the upload. Templates are in the Mobile Site folder; see [data-model.md](data-model.md#importing-from-google-sheets) | Tim | Jan 2027 |
| [ ] | Before sending out the templates: update each template's Lists tab with the 2027 competitions, venues and courts; fix the Fixtures example court; delete the Test data folder | Tim | Feb 2027 |
| [ ] | Create `data/sheets.json` with the Mobile Site folder id | Tim | Jan 2027 |
| [ ] | Fixtures/draw for 2027 from the organisers, in the fixtures tab of the spreadsheet | Org / Tim | Feb 2027 |
| [ ] | Programme / schedule of events for 2027 (AGM, registration, march past, social, egg hunt, finals, dance, golf rounds): this is the overview on the Home page, so one line per event or block of games | Org | Feb 2027 |
| [ ] | `DATA_DIR=data npm run data:check` passes (no unknown teams, court clashes, missing logos, etc.); upload | Tim | Feb 2027 |
| [x] | Home page dates/host from content (remove the hard-coded 2027 text) | Tim | Feb 2027 |
| [ ] | Visiting page: replace example content with real recommendations, partner hotel and rates, parking at venues, set `draft: false` | Org / Tim | Feb 2027 |
| [ ] | Real photos of venues (ideally our own, or properly licensed) | Org | Feb 2027 |
| [ ] | Info content (`info.json`, `contacts.json`): rules, code of conduct, contacts, first aid/emergency numbers; a format description per competition | Org | Feb 2027 |
| [ ] | Venue facilities (`venues.json`): toilets, first aid/medics, merchandise, food, water, parking, lost property, info desk; a site plan image if possible | Org | Feb 2027 |
| [ ] | Vendors (`vendors.json`) and sponsors (`sponsors.json`, logos in `data/logos/`, wide SVG or PNG) | Org / Spons | Mar 2027 |
| [ ] | Late changes process: who tells Tim, how fast it goes live (`npm run data:upload` is live within a minute) | Org / Tim | Feb 2027 |

## 6. Squads (player names, never in GitHub)

| ✓ | Item | Owner | Target |
|---|---|---|---|
| [x] | Format for `data/squads.json` (team → players, numbers, captain, coach, manager, photo) | Tim | Jan 2027 |
| [x] | Squads tab per association in the spreadsheet template, imported into `squads.json` by `npm run data:import` (see section 5) | Tim | Jan 2027 |
| [x] | Upload script to `s3://…/data/` (`npm run data:upload`; the deploy role is blocked from `data/`, so Tim uploads) | Tim | Jan 2027 |
| [x] | Team pages: photo, squad, coach, standing and games; team names link to them | Tim | Feb 2027 |
| [ ] | Team photos: `npm run images -- --data data` after adding them to `data/images/originals/teams/<team id>.jpg` | Tim | Mar 2027 |
| [ ] | Collect squads from teams; only players who consented | Org | Mar 2027 |
| [ ] | Double-check before every push that no names are in the repo (`git grep`) | Tim | ongoing |

## 7. Remaining features

| ✓ | Item | Owner | Target |
|---|---|---|---|
| [x] | Sponsors page (tiers, logos, descriptions, links) | Tim | Feb 2027 |
| [x] | Rotating sponsor logos at the foot of every page (pausable) | Tim | Feb 2027 |
| [ ] | Home page: "Happening now / next up", countdown before the event, quick links | Tim | Jan 2027 |
| [x] | "My teams" favourites (stored on the phone) to filter schedule and results | Tim | Jan 2027 |
| [x] | Bottom tab bar on phones, with a More page for everything else | Tim | Dec 2026 |
| [x] | Venues page: map links, sports, facilities, site plan, vendors there | Tim | Feb 2027 |
| [x] | Vendors page and Tournament info page (contacts, format, rules, code of conduct) | Tim | Feb 2027 |
| [x] | Sport rules page (`/rules`): basketball, mini basketball, volleyball and golf rules from the 2026 brochure, in `src/rules/` | Tim | Feb 2027 |
| [x] | Tournament oath (EN and official 中文 from the brochure) on the rules page; SACSA motto "Friendship through sport" on Home | Tim | Feb 2027 |
| [x] | Golf as a sport (placeholder data); Programme overview on Home | Tim | Feb 2027 |
| [ ] | Golf final standings (divisions, team trophies) shown in the app after the last round; a live leaderboard only if the golf convenor wants it (see section 1) | Tim | Feb 2027 |
| [ ] | Chinese wording of the motto "Friendship through sport" | Tr | Feb 2027 |
| [ ] | Confirm the 2026 sport rules still apply for 2027 (basketball, minis, volleyball; golf if played); badminton and padel rules if wanted; Chinese translations | Org | Feb 2027 |
| [ ] | Bracket view for knockouts (nice to have) | Tim | Feb 2027 |
| [x] | **Announcements page** (`/news`): organisers post updates during the weekend (schedule changes, court moves, weather, lost property, social reminders). Newest first, posted time, optional pinned/urgent flag, bilingual (EN required, 中文 optional) | Tim | Feb 2027 |
| [x] | Announcements: banner on every page for the latest urgent post, dismissible; unread dot on the More tab and count on the More page; latest two on the home page | Tim | Feb 2027 |
| [x] | Announcements: refresh while the app is open (every minute, and when the app comes back to the foreground), so posts appear without a reload (worst case ~2 min with caching) | Tim | Feb 2027 |
| [x] | Until the announcements API exists, posts go in `data/announcements.json` and `npm run data:upload` (Tim only). Once the API writes it, exclude it from the upload like `results.json`. `data:upload` now skips announcements.json; `infra/import-announcements.sh <dir>` loads a folder's posts into the table | Tim | Feb 2027 |
| [ ] | "Add to home screen" prompt/instructions for iPhone and Android | Tim | Feb 2027 |
| [ ] | Push notifications for results/schedule changes (optional, post-MVP) | Tim | later |

## 8. Chinese copy and sign-off

| ✓ | Item | Owner | Target |
|---|---|---|---|
| [ ] | Export every UI string and every content text to a spreadsheet (English \| Chinese \| notes \| where it appears) for translators | Tim | Dec 2026 |
| [ ] | Translators fill in Traditional Chinese for UI strings (`src/i18n/zh-Hant.ts`) | Tr | Jan 2027 |
| [ ] | Translators fill in content text (`zh` fields: venues, competitions, programme, visiting, info pages) | Tr | Feb 2027 |
| [ ] | Agree terminology once and reuse it: sport names (padel = 板式網球?), divisions, "Pool/Group", "Final", "Live", day names | Tr / Org | Jan 2027 |
| [ ] | Import translations back into the repo (script), with a test that reports missing Chinese strings | Tim | Feb 2027 |
| [ ] | Native speaker reviews the app in Chinese on a phone (layout, wrapping, tone, date formats) | Tr | Feb 2027 |
| [ ] | Check fonts render correctly on iPhone and Android in Chinese | Tim | Feb 2027 |
| [ ] | **Sign-off: Chinese copy approved** (name + date recorded here) | Tr / Org | Feb 2027 |
| [ ] | **Sign-off: English copy approved** | Org | Feb 2027 |

## 9. Branding and assets

| ✓ | Item | Owner | Target |
|---|---|---|---|
| [ ] | SVG originals of SACSA and WPCSA logos (replace the PNGs extracted from the brochure) | Org | Dec 2026 |
| [ ] | App icon and favicon from real artwork (currently a placeholder basketball) | Tim | Jan 2027 |
| [ ] | Social sharing preview image (shown when the link is shared on WhatsApp) | Tim | Feb 2027 |
| [ ] | Check photo credits are shown for every licensed photo | Tim | Feb 2027 |

## 10. Testing and QA

| ✓ | Item | Owner | Target |
|---|---|---|---|
| [ ] | Staging environment (e.g. `staging.easter.wpcsa.org.za` with its own results table) so tests never touch live data | Tim | Dec 2026 |
| [ ] | Device testing: iPhone (Safari, installed PWA), Android (Chrome, installed PWA), an older/cheaper Android, a tablet, desktop | Tim | Feb 2027 |
| [ ] | Offline test: load the app, switch to airplane mode, check schedule/results/visiting still work | Tim | Feb 2027 |
| [ ] | Slow network test (3G throttling): pages usable, images small | Tim | Feb 2027 |
| [ ] | Lighthouse: performance, accessibility, best practices, PWA all green | Tim | Feb 2027 |
| [ ] | Accessibility: colour contrast, screen reader labels, large text setting, keyboard on desktop | Tim | Feb 2027 |
| [ ] | Security review of the results API: can't save without login, input validation, CORS, rate limits | Tim | Feb 2027 |
| [ ] | Timezone check: phone set to another timezone still shows SA times | Tim | Feb 2027 |
| [ ] | Load sanity check: results.json served by CloudFront, so hundreds of viewers is fine; check the API under several scorers at once | Tim | Feb 2027 |

## 11. Walkthroughs with organisers (results upload)

Run on **staging** with 2027 fixtures and test accounts. Write down anything confusing and fix it before the dry run.

| ✓ | Item | Owner | Target |
|---|---|---|---|
| [ ] | One-page scorer guide (EN/中文, with screenshots): log in, find your game, enter the score, fix a mistake, who to call | Tim | Feb 2027 |
| [ ] | Walkthrough session with organisers (in person or video call), each on their own phone | Tim / Org | Feb 2027 |
| [ ] | Scenario: enter a basketball final score; check Results and Standings update within ~30 s on another phone | Org | Feb 2027 |
| [ ] | Scenario: volleyball best-of-3 with set scores, including a 15-point deciding set | Org | Feb 2027 |
| [ ] | Scenario: badminton tie, all rubbers with game scores; tie result is correct | Org | Feb 2027 |
| [ ] | Scenario: live updates during a game, then final | Org | Feb 2027 |
| [ ] | Scenario: correct a wrong score after saving; correct the winner of a semi-final and check the final updates | Org | Feb 2027 |
| [ ] | Scenario: forfeit and cancelled game; standings handle both | Org | Feb 2027 |
| [ ] | Scenario: two scorers edit the same game at once; conflict message appears | Org | Feb 2027 |
| [ ] | Scenario: group stage completes; knockout games show the right teams | Org | Feb 2027 |
| [ ] | Scenario: poor signal (walk out of range / airplane mode mid-save); scorer can tell it failed and retry | Org | Feb 2027 |
| [ ] | Scenario: forgotten password reset; wrong password lockout | Org | Feb 2027 |
| [ ] | Scenario: post an urgent announcement (e.g. game moved to another court); it shows on another phone within a minute; edit it, then delete it | Org | Feb 2027 |
| [ ] | **Dry run:** simulate a full tournament day on staging with several scorers entering results to a timetable | Org / Tim | early Mar 2027 |
| [ ] | Fix issues from the dry run; re-test | Tim | early Mar 2027 |
| [ ] | **Sign-off: results process approved** by the tournament director (name + date) | Org | early Mar 2027 |

## 12. Launch (early–mid March 2027)

| ✓ | Item | Owner | Target |
|---|---|---|---|
| [ ] | Content freeze date agreed; final fixtures and programme loaded | Org / Tim | Mar 2027 |
| [ ] | Clear all test results from the live table; `results.json` empty | Tim | Mar 2027 |
| [ ] | Real organiser accounts created; everyone has logged in once successfully | Tim / Org | Mar 2027 |
| [ ] | Demo mode off on production; `draft` banners gone | Tim | Mar 2027 |
| [ ] | QR codes for posters, the registration desk, team packs and the march past | Org / Tim | Mar 2027 |
| [ ] | Announce the link (WhatsApp groups, email, associations' social media) with install instructions | Org | Mar 2027 |
| [ ] | Backup plan if the app or signal fails: printed schedule at the desk, and a results whiteboard | Org | Mar 2027 |
| [ ] | **Sign-off: go-live** (organisers + Tim) | Org / Tim | Mar 2027 |

## 13. During the event (26–29 March 2027)

| ✓ | Item | Owner | Target |
|---|---|---|---|
| [ ] | Tim (or a stand-in) on call each day; contact number in the scorer guide | Tim | event |
| [ ] | Morning check each day: site up, results flowing, no error alarms | Tim | event |
| [ ] | Watch for games without results long after they finished; nudge scorers | Org | event |
| [ ] | Schedule changes go live quickly (announcement and/or fixture update + push) | Org / Tim | event |
| [ ] | Note feedback and problems for the retrospective | Org / Tim | event |

## 14. After the event

| ✓ | Item | Owner | Target |
|---|---|---|---|
| [ ] | Delete `squads.json`, team photos and personal contact numbers from S3 (and old versions) within a week | Tim | Apr 2027 |
| [ ] | Disable organiser accounts | Tim | Apr 2027 |
| [ ] | Archive 2027 results/standings (keep viewable, e.g. `/2027`) | Tim | Apr 2027 |
| [ ] | Retrospective with organisers: what worked, what to change for 2028 | Org / Tim | Apr 2027 |
| [ ] | Deactivate the `wpcsa-builder` access key; review costs | Tim | Apr 2027 |
| [ ] | Plan the roll-over for 2028 (new content folder; reuse or rename the `wpcsa-easter-2027` bucket) | Tim | mid 2027 |

## 15. Housekeeping (any time, don't forget)

| ✓ | Item | Owner | Target |
|---|---|---|---|
| [ ] | **Enable auto-renew for `wpcsa.org.za`** at registerdomain.co.za (expires 3 Oct 2027) | Tim / Org | Oct 2026 |
| [ ] | Deactivate the `wpcsa-builder` access key when not building infrastructure | Tim | ongoing |
| [ ] | AWS billing alert / budget | Tim | Oct 2026 |
| [ ] | GitHub: branch protection on `main` (require CI to pass), Dependabot for dependency updates | Tim | Nov 2026 |
| [ ] | GitHub Actions `ubuntu-latest` moves to Ubuntu 26 from 19 Oct 2026; check the next build still passes | Tim | Oct 2026 |
| [ ] | Privacy notice page (what's shown, why, how to ask for a name to be removed) | Tim / Org | Feb 2027 |
| [ ] | Make sure at least one other person can deploy/fix things if Tim is unavailable (docs + access). The sheets import uses a service account in Tim's personal Google Cloud project: a stand-in creates their own and the Mobile Site folder is shared with it | Tim / Org | Feb 2027 |

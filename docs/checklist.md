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
| [ ] | Confirm sports and divisions for 2027 (basketball divisions and pools, volleyball format, badminton format, padel: in the app or info only?) | Org | Nov 2026 |
| [ ] | Basketball standings rules: points (default win 2 / loss 1 / forfeit 0) and tiebreak order (default head-to-head → difference → points scored) | Org | Nov 2026 |
| [ ] | Volleyball and badminton standings rules (points per win? set ratio?) and best-of formats per round | Org | Nov 2026 |
| [ ] | Edition number for 2027 (66th?) and official tournament name in English and Chinese | Org | Nov 2026 |
| [ ] | Official Chinese name of SACSA: the 2025 cover says 華橋, the logo says 華僑 | Org / Tr | Nov 2026 |
| [ ] | Who will enter results: list of organisers/scorers (name, email, which sport/court) | Org | Jan 2027 |
| [ ] | Can scorers change a fixture's time or court on the day, or only enter results? Do we want an "announcements" banner for schedule changes? | Org | Nov 2026 |
| [x] | Final list of site sections (chairman, Oct 2026): Home, Schedule, Results, Standings in the tab bar; under More: Tournament info (format, rules, code of conduct, contacts), Teams (photo, squad, coach), Venues (toilets, medics, merchandise…), Vendors, Sponsors, Visiting, My teams | Org / Tim | Dec 2026 |
| [ ] | Contacts: confirm who is listed, and whether to show personal mobile numbers or role-based ones | Org | Jan 2027 |
| [ ] | Team photos: do teams send them before the tournament, or are they taken on the day? Who collects them? | Org | Jan 2027 |
| [ ] | Vendors: who collects their details (what they sell, where, hours, payment methods, logo), and by when | Org | Feb 2027 |
| [x] | Advertising: rotating sponsor logos on every page, linking to a sponsors page with more detail (may change later) | Org / Spons | Dec 2026 |
| [ ] | Sponsor list, tiers and logos (SVG or large PNG) plus links | Spons | Feb 2027 |
| [ ] | Announcements: who is allowed to post, and who checks the Chinese before urgent posts go out (or post English only during the event) | Org | Jan 2027 |
| [ ] | Player consent: players (or parents of minors) agree to names **and team photos** being shown publicly in the app during the event (POPIA). Add to the registration form | Org | Jan 2027 |
| [ ] | Is the AI-generated goat artwork OK with the committee, or should a designer redo it? | Org | Nov 2026 |

## 2. Organiser results backend

All in `af-south-1`, set up with AWS CLI scripts in `infra/` (05+), IAM roles named `wpcsa-easter-*`.

| ✓ | Item | Owner | Target |
|---|---|---|---|
| [ ] | Reactivate the `wpcsa-builder` access key for the build; deactivate it again afterwards | Tim | Oct 2026 |
| [ ] | **DynamoDB** table for results (key: year + fixture id), on-demand billing, point-in-time recovery on | Tim | Oct 2026 |
| [ ] | Audit trail: every save/change/delete recorded with who, when, before and after (separate items or table) | Tim | Oct 2026 |
| [ ] | **Cognito user pool**: admin-created users only (no self sign-up), email + password, password reset by email, optional MFA; groups `admin` and `scorer` | Tim | Oct 2026 |
| [ ] | **API Gateway HTTP API** with a Cognito JWT authorizer; CORS limited to `easter.wpcsa.org.za` (+ localhost for dev); throttling | Tim | Nov 2026 |
| [ ] | **Lambda: save result**: validate with the shared zod schema, check the fixture exists, check the score makes sense for the sport/best-of, conditional write (reject if someone else changed it meanwhile), write audit record | Tim | Nov 2026 |
| [ ] | Lambda: delete/clear a result (for mistakes), admin only | Tim | Nov 2026 |
| [ ] | On every change, regenerate `data/results.json` in S3 and invalidate it in CloudFront (short cache, ~30 s) | Tim | Nov 2026 |
| [ ] | Lambda execution role: least privilege (this table, `data/results.json` only, this invalidation) | Tim | Nov 2026 |
| [ ] | CloudWatch logs (with retention), alarms for errors/throttles emailed to Tim | Tim | Nov 2026 |
| [ ] | Unit tests for the Lambda (validation, conflicts, auth) and an integration test against a test table | Tim | Nov 2026 |
| [ ] | Script to create/disable organiser accounts from a list (not committed: emails are personal data) | Tim | Jan 2027 |
| [ ] | Announcements API: create/edit/delete posts (Lambda + same table or a second one), audit trail, regenerates `data/announcements.json` in S3 with a short cache | Tim | Dec 2026 |
| [ ] | Cost check: expected well under $5/month; AWS budget alert set | Tim | Nov 2026 |

## 3. Admin screens (`/admin`)

| ✓ | Item | Owner | Target |
|---|---|---|---|
| [ ] | Login / logout / forgot password (bilingual) | Tim | Dec 2026 |
| [ ] | Pick a game: defaults to "now and next" on the scorer's court; also by day, sport, court or game number | Tim | Dec 2026 |
| [ ] | Score entry per sport, with big touch targets: basketball (two totals), volleyball (sets, best-of aware), badminton (games per rubber), padel (TBC) | Tim | Dec 2026 |
| [ ] | Status options: live (update during the game), final, forfeit (which side), cancelled | Tim | Dec 2026 |
| [ ] | Confirmation step showing the winner before saving; clear success/failure message | Tim | Dec 2026 |
| [ ] | Edit/correct a saved result, with a warning if it changes who goes through to a knockout game | Tim | Dec 2026 |
| [ ] | "Someone else updated this game" conflict message | Tim | Dec 2026 |
| [ ] | Poor signal handling: show clearly when a save didn't go through and let the scorer retry (decide whether to queue offline) | Tim | Jan 2027 |
| [ ] | Recent changes list (audit view) for admins | Tim | Jan 2027 |
| [ ] | Post an announcement: title + text (EN, optional 中文), pinned/urgent toggle, preview, edit and delete; who can post (admins only, or scorers too?) | Tim | Jan 2027 |
| [ ] | Admin pages excluded from search engines and not cached by the service worker | Tim | Dec 2026 |

## 4. Public app: switch from demo to live results

| ✓ | Item | Owner | Target |
|---|---|---|---|
| [ ] | Replace `DEMO` in `src/data/live.ts` with a hook that fetches `/data/results.json` and uses the real clock | Tim | Jan 2027 |
| [ ] | Refresh every ~30 s while open and when the app comes back to the foreground; show "updated x min ago" | Tim | Jan 2027 |
| [ ] | Works offline: last known results cached by the service worker (network-first for results) | Tim | Jan 2027 |
| [ ] | Friendly states: no results yet, can't reach server, stale data | Tim | Jan 2027 |
| [ ] | Keep a way to preview with demo data (e.g. `?demo` on staging only) for testing | Tim | Jan 2027 |
| [ ] | Date-faking for testing: view the app "as if" it's a given tournament time | Tim | Jan 2027 |

## 5. 2027 data

All of this is JSON in the gitignored `data/` folder (never in the repo), uploaded with `npm run data:upload`; no deploy needed. See [data-model.md](data-model.md).

| ✓ | Item | Owner | Target |
|---|---|---|---|
| [ ] | Create `data/` (copy `sample-data/`, remove `demo` from `tournament.json`): `tournament.json`, `venues.json`, `associations.json`, `competitions.json`, `teams.json` | Tim | Jan 2027 |
| [ ] | Back up `data/` somewhere other than this laptop (it isn't in git); S3 versioning keeps old uploads too | Tim | Jan 2027 |
| [ ] | Fixtures/draw for 2027 from the organisers (spreadsheet → JSON import script if the draw comes as a spreadsheet) | Org / Tim | Feb 2027 |
| [ ] | Programme / schedule of events for 2027 (AGM, registration, march past, social, egg hunt, finals, dance) | Org | Feb 2027 |
| [ ] | `DATA_DIR=data npm run data:check` passes (no unknown teams, court clashes, missing logos, etc.); upload | Tim | Feb 2027 |
| [x] | Home page dates/host from content (remove the hard-coded 2027 text) | Tim | Feb 2027 |
| [ ] | Visiting page: replace example content with real recommendations, partner hotel and rates, parking at venues, set `draft: false` | Org / Tim | Feb 2027 |
| [ ] | Real photos of venues (ideally our own, or properly licensed) | Org | Feb 2027 |
| [ ] | Info content (`info.json`, `contacts.json`): oath (EN/中文, from the brochure), rules, code of conduct, contacts, first aid/emergency numbers; a format description per competition | Org | Feb 2027 |
| [ ] | Venue facilities (`venues.json`): toilets, first aid/medics, merchandise, food, water, parking, lost property, info desk; a site plan image if possible | Org | Feb 2027 |
| [ ] | Vendors (`vendors.json`) and sponsors (`sponsors.json`, logos in `data/logos/`, wide SVG or PNG) | Org / Spons | Mar 2027 |
| [ ] | Late changes process: who tells Tim, how fast it goes live (`npm run data:upload` is live within a minute) | Org / Tim | Feb 2027 |

## 6. Squads (player names, never in GitHub)

| ✓ | Item | Owner | Target |
|---|---|---|---|
| [x] | Format for `data/squads.json` (team → players, numbers, captain, coach, manager, photo) | Tim | Jan 2027 |
| [ ] | Template organisers can fill in (spreadsheet), plus a script to turn it into `squads.json` | Tim | Jan 2027 |
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
| [ ] | Confirm the 2026 sport rules still apply for 2027 (basketball, minis, volleyball; golf if played); badminton and padel rules if wanted; Chinese translations | Org | Feb 2027 |
| [ ] | Bracket view for knockouts (nice to have) | Tim | Feb 2027 |
| [x] | **Announcements page** (`/news`): organisers post updates during the weekend (schedule changes, court moves, weather, lost property, social reminders). Newest first, posted time, optional pinned/urgent flag, bilingual (EN required, 中文 optional) | Tim | Feb 2027 |
| [x] | Announcements: banner on every page for the latest urgent post, dismissible; unread dot on the More tab and count on the More page; latest two on the home page | Tim | Feb 2027 |
| [x] | Announcements: refresh while the app is open (every minute, and when the app comes back to the foreground), so posts appear without a reload (worst case ~2 min with caching) | Tim | Feb 2027 |
| [ ] | Until the announcements API exists, posts go in `data/announcements.json` and `npm run data:upload` (Tim only). Once the API writes it, exclude it from the upload like `results.json` | Tim | Feb 2027 |
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
| [ ] | Security review of the results API: can't save without login, scorers can't do admin actions, input validation, CORS, rate limits | Tim | Feb 2027 |
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
| [ ] | Make sure at least one other person can deploy/fix things if Tim is unavailable (docs + access) | Tim / Org | Feb 2027 |

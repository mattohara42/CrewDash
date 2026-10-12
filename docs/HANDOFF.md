# Handoff

Where CrewDash stands, so the next person (or the next Claude session) can pick it up. The plan itself is in [PLAN.md](PLAN.md). This file covers status, decisions, findings and open items.

Last updated 2026-10-12.

## Status

Phase 0 is done: the CrewTimer parser (`src/crewtimer/`) and club matching (`club.json`).

Phase 1 is built: an Astro app with the club password gate, a season page grouped by year, regatta pages, year-over-year series pages, a per-season event page, an admin page and a scheduled refresh. Admins can count extra crew names as the club, group renamed events and override a regatta's series name. Those settings are stored in Netlify Blobs, not in git. `npm run check` runs lint, formatting, `astro check`, the tests and the production build. CI runs the same check on every PR.

Phase 1.5 is built: web push alerts. Phones subscribe on the Alerts page. The scheduled refresh runs every 5 minutes on race weekends only (Friday to Monday, 12:00 to 21:55 UTC, about 120 runs a race day), to save Netlify credits. It sends one alert per club event once every boat has a result, and an update if it changes later. Subscriptions and signing keys live in the `push` Blobs store. Push endpoints must be on a known push service's host, which prevents the server being pointed at arbitrary URLs.

Roadmap step 1 is built: a Rowing 101 page (`/guide`) for new families, linked from the menu. Terms on results pages (exhibition, margin, penalties, handicap, statuses) link to it. Club-specific tips will come with the admin editor in step 2.

Phase 2 (lineups and rower pages) still needs a `boats.xls` sample. How quickly CrewTimer results appear on race day is still unmeasured.

A season is a calendar year for now. If the club thinks in fall and spring seasons, the event page can split them.

## Deployment

- Netlify site `crewdash` on the FamilyHub team: https://crewdash.netlify.app (dashboard: https://app.netlify.com/projects/crewdash). Site ID `b4a0232e-e03c-458d-ae67-59de2a3a36aa`.
- Deploys use Netlify credits, so they're batched and only made when the repo owner agrees, not after every merge.
- Deploys are currently uploaded from a Claude session, not built from GitHub. Linking the repo in Netlify (Project configuration, Build and deploy, Link repository) would make every merge to `main` deploy automatically.
- Environment variables, set by the repo owner in the Netlify dashboard for the production context only: `CLUB_PASSWORD`, `ADMIN_PASSWORD` and `SESSION_SECRET`. Deploy previews and branch deploys have no session secret, so they stay locked. Changing a variable needs a redeploy. Changing `SESSION_SECRET` logs everyone out.
- The Netlify connector's environment-variable writes reported success but didn't save (seen twice on 2026-10-12). Set variables in the dashboard instead.
- Results are stored in a site-wide Netlify Blobs store named `regattas`. Deploy previews share it with production.
- `npm audit` flags high-severity advisories in Netlify's local dev and build tooling (`sharp`/`ipx`, `node-forge`, `braces`). None of it handles visitor requests. npm's only fix downgrades the adapter two major versions, so recheck when `@astrojs/netlify` updates.
- Logins have no rate limiting yet, so the club password should be long and not reused.

## Decisions made

- Pittsford Crew is the first club. Code stays club-neutral, with everything club-specific in `club.json`. Other clubs reuse it by forking. A hosted multi-club service waits until clubs ask.
- Access is one shared club password for Phase 1. The default is a password gate built into CrewDash (free). Netlify's own password protection needs a paid Pro plan, so the club could choose that instead.
- Hosting is on Netlify.
- Raw times are never compared across different regattas. Year over year at the same regatta is fine.
- Exhibition boats are tagged in comparisons and show an unofficial "would have placed".
- Push notifications are Phase 1.5.
- PRs merge automatically once CI is green and there are no open review comments.
- The repo is private. No real rower data goes into git either way.
- The next updates are in [ROADMAP.md](ROADMAP.md): Rowing 101, venue pages, coach login with announcements, then a race-day view, analysis, conditions and schedules. Venue pages are edited on the admin page, coaches get their own login, and announcements replace two-way chat.

## Verified against real data

These came from the 2026 Head of the Genesee Sunday (`r16329`) and the 2025 one (`r15143`). The data was kept outside the repo.

- Results are public JSON at `https://crewtimer-results.firebaseio.com/results/<id>.json`. The regatta list and other paths are not readable, so regattas must be added by link.
- Both years use the same format. All 270 entries parsed, with no unrecognized statuses.
- For every finished entry, adjusted time equals raw time plus penalties plus handicap. In `Age 73(-238)`, the bracketed number is the handicap in seconds.
- "Exh" means exhibition: a boat that can't medal, for example when a varsity rower fills in for a missing novice.
- The "pending official" flag never clears. The 2025 regatta still shows it, so polling stops a few days after race day.
- Event names vary in spacing and get renamed or split between years. Series titles vary in case.
- Pittsford often enters several boats in one event, and field sizes change a lot from year to year.

Not yet seen: a sprint regatta. Sprint results may use fields the parser doesn't handle.

## Open items

- **Club admin.** Unknown. They would add regattas after each race weekend and, in Phase 2, upload lineups. The repo owner is finding out who.
- **RegattaCentral staff login.** Unknown whether Pittsford has one. A `boats.xls` lineup sample from a past regatta is needed before Phase 2.
- **Sprint regatta link.** A CrewTimer link to a sprint regatta (for example the Pittsford Regatta) would let us test the parser on sprint results.
- **Athlete-data policy.** The club should check whether it has a policy on publishing athlete information.
- **Entazza (CrewTimer's developer).** Not yet contacted. The draft email is below.
- **Repo About panel.** Not yet set. Suggested values are below.

## Draft email to Entazza

Support contact from https://www.entazza.net/about-entazza.html: Glenn Engel, glenne@entazza.net.

> **Subject:** CrewDash: a club results view built on CrewTimer data
>
> Hi Glenn,
>
> I'm a parent with Pittsford Crew in Rochester, NY. Our club races at many regattas timed with CrewTimer, and we're building a small web app called CrewDash so families and coaches can see only our club's boats and results without scrolling through the full results.
>
> CrewDash reads the public results JSON that the CrewTimer results pages load (`crewtimer-results.firebaseio.com/results/<regattaId>.json`), one regatta at a time, after a club admin adds the regatta link. It stores a copy so we don't keep re-fetching. On race days it would check for new results every few minutes, for that day's regattas only. The app sits behind a club password, because most of our rowers are minors.
>
> Before we go further, I wanted to check a few things with you:
>
> 1. Are you comfortable with us using the results data this way?
> 2. Is there a supported API you'd prefer we use? The site links to an API.md in the crewtimer-doc repo, but that link currently returns 404.
> 3. Is a few requests per minute per regatta on race day acceptable, or would you prefer a different rate?
> 4. We've written the code so other clubs could run their own copy. Any concerns with that?
>
> Happy to share the code or adjust anything to suit you. Thanks for CrewTimer, it's made following regattas much easier.
>
> [Your name]
> Pittsford Crew

If they point us to a supported API, only `src/crewtimer/fetch.ts` should need to change. If they ask for a lower polling rate, race-day notifications get slower, and nothing else changes.

## Suggested repo About panel

These have to be set in the GitHub web UI: the gear icon next to "About" on the repo page.

- **Description:** Find your rower. Track your team. A phone-first app that shows a rowing club only its own boats and results, built on CrewTimer's public regatta results. TypeScript.
- **Website:** leave empty until the Netlify site exists.
- **Topics:** rowing, crew, regatta, crewtimer, rowing-club, sports-results, youth-sports, typescript

## Resuming in a new session

1. Read this file, PLAN.md and ROADMAP.md.
2. Run `npm install` and `npm run check`.
3. To test against real data, save results JSON into `data/` (gitignored). Never commit it.

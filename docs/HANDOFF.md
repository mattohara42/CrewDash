# Handoff

Where CrewDash stands, so the next person (or the next Claude session) can pick it up. The plan itself is in [PLAN.md](PLAN.md). This file covers status, decisions, findings and open items.

Last updated 2026-10-12.

## Status

Phase 0 is done: the CrewTimer parser (`src/crewtimer/`) and club matching (`club.json`).

Phase 1 is built: an Astro app with the club password gate, a season page grouped by year, regatta pages, year-over-year series pages, a per-season event page, an admin page and a scheduled refresh. Admins can count extra crew names as the club, group renamed events and override a regatta's series name. Those settings are stored in Netlify Blobs, not in git. `npm run check` runs lint, formatting, `astro check`, the tests and the production build. CI runs the same check on every PR.

Phase 1.5 is built: web push alerts. Phones subscribe on the Alerts page. The scheduled refresh runs every 5 minutes on race weekends only (Friday to Monday, 12:00 to 21:55 UTC, about 120 runs a race day), to save Netlify credits. It sends one alert per club event once every boat has a result, and an update if it changes later. Subscriptions and signing keys live in the `push` Blobs store. Push endpoints must be on a known push service's host, which prevents the server being pointed at arbitrary URLs.

Roadmap step 1 is built: a Rowing 101 page (`/guide`) for new families, linked from the menu. Terms on results pages (exhibition, margin, penalties, handicap, statuses) link to it. Step 2 is built: at `/admin/venues` the admin edits venues (places with map links, course length, tips for families), links each series to a venue and writes club tips for Rowing 101. Regatta and series pages show a venue card. Venue data is stored under the `venues` key of the `regattas` Blobs store, with a download button for backups.

Step 3 is built: a coach login (`COACH_PASSWORD`) opens `/coach`, where coaches and admins post short announcements. They show as a banner at the top of every page until they expire (4 hours to 3 days) and can also go out as a push to every subscriber, whatever they follow. The admin can add the club's group chat link on the venues page, and it shows on Rowing 101. Announcements are stored under the `announcements` key of the `regattas` Blobs store.

Step 4 is built: on the day before and the day of a regatta, the home page leads with a race-day card. It lists the club's events in start order with each boat's result so far, counts down to the next start, and shows the venue card. A star follows an event on that phone only (stored in the browser), with a filter for followed crews. The page reloads every 5 minutes while open, matching the refresh. "Today" uses `timezone` from `club.json` (default `America/New_York`), which the announcement and regatta-page times now use too.

Step 5 is half built. Each placed boat shows its winning margin or the gap to the crew one place up, the gap to third, and how many crews it beat, all from adjusted times in the same race. Pace per 500 m (from raw time) shows on regatta and series pages when the venue has a course length. Each regatta has a weekend recap (`/recap?id=`) with medals, best finishes and the biggest gains on last year, and each season a Wrapped page (`/wrapped?year=`) with a full-screen banquet mode. Both can save a club-level image to post, drawn in the browser, with events and places but no names. Kilometres raced count only venues with a course length. Rival head-to-head was dropped. Coaches and admins can add notes to a regatta or to any event on its page. Notes are stored under `notes/<id>` in the `regattas` Blobs store, and the whole club can read them. The coach page also has a CSV download of each season's club results. It includes stroke names, so it's coach-only.

Step 6 (conditions) is built for wind, temperature and rain from Open-Meteo, with no key. Its free tier is for non-commercial use and needs the attribution link shown under each line. The Today card shows the forecast, regatta pages show the day's weather, and series pages list each year's conditions. Wind is described relative to the course when the venue has a course direction. Lookups use the venue's Finish place (or its first place) and the racing hours from event start times. They're cached in the `regattas` Blobs store under `conditions/<id>`: archive results forever, forecasts and failures for an hour. Open-Meteo rate-limits by IP, and Netlify's IPs are shared, so a lookup can fail. The page then just leaves the line out. River flow (USGS) is not built yet.

Step 7 is partly built. Regatta pages and the Today card have "Add to calendar", an `.ics` download with one entry per club event at its scheduled start, or one all-day entry when there are no start times. Estimated start and pass times for each boat are not built: they need to know whether CrewTimer publishes entries and start intervals before race day (experiment A). Starring an event on the Today card also adds it to this phone's alerts when the phone follows chosen events. The venue editor keeps what was typed when a save comes back with an error.

Phase 2 (lineups and rower pages) still needs a `boats.xls` sample. How quickly CrewTimer results appear on race day is still unmeasured, but the refresh now logs it: each regatta records when every event's first and last results appeared (`resultTimes`, accurate to the 5-minute refresh), and the admin page shows the median minutes after the start. Check it after the next race weekend.

A season is a calendar year for now. If the club thinks in fall and spring seasons, the event page can split them.

## Deployment

- Netlify site `crewdash` on the FamilyHub team: https://crewdash.netlify.app (dashboard: https://app.netlify.com/projects/crewdash). Site ID `b4a0232e-e03c-458d-ae67-59de2a3a36aa`.
- Deploys use Netlify credits, so they're batched and only made when the repo owner agrees, not after every merge.
- Deploys are currently uploaded from a Claude session, not built from GitHub. Linking the repo in Netlify (Project configuration, Build and deploy, Link repository) would make every merge to `main` deploy automatically.
- Environment variables, set by the repo owner in the Netlify dashboard for the production context only: `CLUB_PASSWORD`, `ADMIN_PASSWORD`, `COACH_PASSWORD` (optional, needed for coach logins) and `SESSION_SECRET`. Deploy previews and branch deploys have no session secret, so they stay locked. Changing a variable needs a redeploy. Changing `SESSION_SECRET` logs everyone out.
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
- **RegattaCentral API access.** Not yet requested. Findings and a draft email are below.
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

## RegattaCentral API

From RegattaCentral's API documentation (https://api.regattacentral.com/v4/oauth2.jsp), read on 2026-10-13:

- Every API call needs credentials, and RegattaCentral only issues them to "key clients and partners". Nothing can be built until they approve the club.
- **Standard API key.** A key sent as an `API-Key` request header, with no user login. It covers "general information about regattas, including events, entries and results". If entries include boats, bow numbers and event times before race day, this would feed the Today card and per-boat start times without relying on CrewTimer (roadmap experiment A). The key would be a Netlify environment variable like the passwords.
- **OAuth2 for detailed information**, probably including lineups. It uses the password grant: CrewDash would send a RegattaCentral username and password, with a client ID and secret, to `https://api.regattacentral.com/oauth2/api/token`. The response holds an access token (1 hour) and a refresh token. The account must have "staff" access to each regatta, granted by that regatta's director. A valid token can still get a 401 for a regatta the account isn't staff on.
- **Open question:** whether a club's own staff account can read its own crews' lineups at regattas it enters, or only at regattas where it's on the organising staff. If only the latter, OAuth won't give lineups for away regattas and Phase 2 stays with `boats.xls` uploads.
- **If OAuth is used:** the admin enters their RegattaCentral password once, CrewDash exchanges it for tokens and never stores it, and keeps only the refresh token in Blobs, with the client secret in a Netlify environment variable. The documentation doesn't say whether refresh tokens expire. A refresh token is a standing credential to a real person's account, so it should be revocable from the admin page.

## Draft email to RegattaCentral

Send to RegattaCentral support. The address isn't in the API documentation, so take it from their website's contact page.

> **Subject:** API access for a club results app (Pittsford Crew)
>
> Hello,
>
> I'm a parent volunteer with Pittsford Crew in Rochester, NY. We've built a small web app called CrewDash so our families and coaches can follow only our club's boats at regattas. It sits behind a club password because most of our rowers are minors, and it isn't commercial.
>
> We'd like to request a standard API key, and we have a few questions first:
>
> 1. Before race day, do the general entries returned with a standard key include each crew's bow number and event start time? We'd use these to show families when our boats race.
> 2. Can a club's own RegattaCentral staff account use OAuth to read its own crews' lineups at regattas it enters but doesn't organise, or is lineup access limited to regatta staff?
> 3. Do OAuth refresh tokens expire, and can they be revoked?
> 4. Are there rate limits or usage terms we should follow? We'd make a few requests per regatta, mostly in the days before and on race day.
>
> If a key isn't possible, is the `boats.xls` download from a club staff account the right way for a club to get its own lineups?
>
> Thanks for your help.
>
> [Your name]
> Pittsford Crew

## Suggested repo About panel

These have to be set in the GitHub web UI: the gear icon next to "About" on the repo page.

- **Description:** Find your rower. Track your team. A phone-first app that shows a rowing club only its own boats and results, built on CrewTimer's public regatta results. TypeScript.
- **Website:** leave empty until the Netlify site exists.
- **Topics:** rowing, crew, regatta, crewtimer, rowing-club, sports-results, youth-sports, typescript

## Resuming in a new session

1. Read this file, PLAN.md and ROADMAP.md.
2. Run `npm install` and `npm run check`.
3. To test against real data, save results JSON into `data/` (gitignored). Never commit it.

# Handoff

Where CrewDash stands, so the next person (or the next Claude session) can pick it up. The plan itself is in [PLAN.md](PLAN.md). This file covers status, decisions, findings and open items.

Last updated 2026-10-29.

## Status

Phase 0 is done: the CrewTimer parser (`src/crewtimer/`) and club matching (`matchClub` in `src/club.ts`).

Club settings are edited in Admin at `/admin/club` and stored under the `club` key of the `regattas` Blobs store, in `club.json`'s shape: name, aliases, time zone, locale, units, season start month and colors. `club.json` is now a neutral example ("Your Rowing Club") that only supplies starting values until an admin first saves. `loadClub()` in `src/lib/club-settings.ts` reads the saved settings at most every 30 seconds per server instance and updates the shared `club` object from `config.ts` in place, so modules keep importing `club` as before. The middleware calls it on every request and the scheduled refresh on every run. A bad saved value or a Blobs failure keeps the settings already in use and logs the problem. Saving runs the same checks as `club.json` plus `colorProblems()` (white header text at 4.5:1, chart marks at 3:1 on both themes). The manifest is made on request now, since it carries the club's name and color, with Netlify's CDN keeping it for an hour so it doesn't eat function runs.

Phase 1 is built: an Astro app with the club password gate, a season page grouped by year, regatta pages, year-over-year series pages, a per-season event page, an admin page and a scheduled refresh. Admins can count a near-miss crew name as the club, which adds it to the club's names in club settings (the old separate `extraAliases` list is moved there the first time Admin opens, by `moveExtraAliases()`), group renamed events and override a regatta's series name. Those settings are stored in Netlify Blobs, not in git. `npm run check` runs lint, formatting, `astro check`, the tests and the production build. CI runs the same check on every PR.

Phase 1.5 is built: web push alerts. Phones subscribe on the Alerts page. The scheduled refresh fires every 5 minutes around the clock, because clubs race in every time zone and on any day. A run outside 4:00 to 23:59 in the club's time zone ends after one small read of the club settings. The window is wide so a regatta up to three time zones away still fits. Racing further away than that may miss its earliest or latest results. Otherwise it reads a small index of race dates (the `calendar` key in the `regattas` Blobs store, kept in step by `put()` with etag-conditional writes, so two writers can't undo each other, and checked against the stored keys on every read, so a regatta missing from it is added back) instead of downloading every regatta. Race days and "recent" are counted in the club's time zone, not UTC. A regatta is fetched on every run only on its race day. The day before and the days after, it's fetched once an hour. It sends one alert per club event once every boat has a result, and an update if it changes later. It also sends a start alert when club boats in an event get a start time (CrewTimer's `G_Start_time_raw`), skipped if the start is more than 30 minutes old. Start alerts have their own tag so the result that follows alerts again. Every alert and coach announcement is also written to a log (`alerts` key in the `regattas` Blobs store, the last 14 days, at most 300 entries). The bell in the header opens it at `/alerts`, with a dot when something is newer than this phone's last visit and an "Only crews I follow" filter that uses the events starred on that phone. Whether CrewTimer posts start times live during racing, and how late, was first tested at the 2026 Head of the Fish Sunday. Subscriptions and signing keys live in the `push` Blobs store. Push endpoints must be on a known push service's host, which prevents the server being pointed at arbitrary URLs.

Roadmap step 1 is built: a Rowing 101 page (`/guide`) for new families, linked from the menu. Terms on results pages (exhibition, margin, penalties, handicap, statuses) link to it. Step 2 is built: at `/admin/venues` the admin edits venues (places with map links, course length, tips for families), links each series to a venue and writes club tips for Rowing 101. Regatta and series pages show a venue card. A **Venues** page in the menu (`/venues`) lists every venue with its course length and the regattas raced there. Venue data is stored under the `venues` key of the `regattas` Blobs store, with a download button for backups.

Step 3 is built: a coach login (`COACH_PASSWORD`) opens `/coach`, where coaches and admins post short announcements. They show as a banner at the top of every page until they expire (4 hours to 3 days) and can also go out as a push to every subscriber, whatever they follow. The admin can add the club's group chat link on the venues page, and it shows on Rowing 101. Announcements are stored under the `announcements` key of the `regattas` Blobs store.

Step 4 is built: on the day before and the day of a regatta, the home page leads with a race-day card. It lists the club's events in start order with each boat's result so far, counts down to the next start, and shows the venue card. A star follows an event on that phone only (stored in the browser), with a filter for followed crews. The page reloads every 5 minutes while open, matching the refresh. "Today" uses the club's time zone setting (default `America/New_York`), which the announcement and regatta-page times now use too.

The Today card also warns when results are late (`src/lib/stale.ts`). On the race day, once racing has begun, it shows a line when an event that started at least 45 minutes ago (`STALE_MINUTES`) still has boats without results and CrewTimer has posted nothing new for 45 minutes. That covers a regatta that never posts and one that goes quiet partway. An event's start is its latest actual boat start when CrewTimer has one, else its scheduled start, so a regatta running late doesn't trip it, and events CrewTimer marks official are skipped. "Posted nothing new" uses `resultsChangedAt`, which each refresh sets when the number of boats with results changes. If CrewDash's own copy is more than 20 minutes old, the line says that instead, since then the delay is ours. The 45 minutes is a first guess, to be tuned from the results-speed log after a race weekend. A boat CrewTimer leaves blank in an event it never marks official keeps the warning up once the rest of the regatta's results stop.

Step 5 is half built. Each placed boat shows its winning margin or the gap to the crew one place up, the gap to third, and how many crews it beat, all from adjusted times in the same race. Pace per 500 m (from raw time) shows on regatta and series pages when the venue has a course length. Each regatta has a weekend recap (`/recap?id=`) with medals, best finishes and the biggest gains on last year, and each season a Wrapped page (`/wrapped?year=`) with a full-screen banquet mode. Both can save a club-level image to post, drawn in the browser, with events and places but no names. Kilometres raced count only venues with a course length. Rival head-to-head was dropped. Coaches and admins can add notes to a regatta or to any event on its page. Notes are stored under `notes/<id>` in the `regattas` Blobs store, and the whole club can read them. The coach page also has a CSV download of each season's club results. It includes stroke names, so it's coach-only.

Lineups (Phase 2) are coach-entered from a club roster. The roster (`/coach/roster`, coaches and admins) is one list of rowers under the `roster` key of the `regattas` Blobs store. Each rower has an id, name, squad (free text like "Boys Novice"), role (rower or cox) and the seasons they're on, so a rower keeps their page and followers from one season to the next. A season runs from the club's season start setting (January by default, so a calendar year) and is named by the year it starts, such as "2026", shown as "2026-27" when it runs over New Year. Ids are the rower's normalized name when added and never change on rename, which keeps the follow keys phones already store working. Adding a name that matches an existing rower (ignoring case and spacing) reuses them, and a Merge form folds a misspelling into the right rower and moves every seat. On a regatta page, coaches fill each club boat seat by seat from dropdowns: rowers whose squad fits the event come first, and anyone on the roster can sub in, with a Sub tick that shows on the lineup and the rower's page. A seat can also add a new rower, who joins the season's roster. Boat size comes from the event name ("8+", "4x-"). Empty seats keep their place. Lineups are stored under `lineups/<regattaId>`, keyed by event number and bow number, with each seat's rower id and name. Lineups typed before the roster existed are plain names. They're read as unlinked seats and linked (adding their rowers to the season) when the season's roster page is opened or a lineup at that regatta is saved. The menu's **Following** page (`/rowers`) lists everyone who appears in a lineup. Tapping ☆ follows a rower on that phone only (browser storage). Each rower page (`/rower?name=<id>`) shows their races newest first, with seat, place, time, margin and whether they subbed in. CrewDash can't make a boat exhibition: the regatta does that, and CrewTimer reports it.

Step 6 (conditions) is built for wind, temperature and rain from Open-Meteo, with no key. Its free tier is for non-commercial use and needs the attribution link shown under each line. The Today card shows the forecast, regatta pages show the day's weather, and series pages list each year's conditions. Wind is described relative to the course when the venue has a course direction. Lookups use the venue's Finish place (or its first place) and the racing hours from event start times. They're cached in the `regattas` Blobs store under `conditions/<id>`: archive results forever, forecasts and failures for an hour. Open-Meteo rate-limits by IP, and Netlify's IPs are shared, so a lookup can fail. The page then just leaves the line out. River flow (USGS) is not built yet.

Step 7 is partly built. Regatta pages and the Today card have "Add to calendar", an `.ics` download with one entry per club event at its scheduled start, or one all-day entry when there are no start times. Estimated start and pass times for each boat are not built yet. Experiment A is answered (see Verified against real data), so they can be: CrewTimer publishes entries, bow numbers and event start times the night before, and each boat's actual start time once it has raced. Starring an event on the Today card also adds it to this phone's alerts when the phone follows chosen events. The venue editor keeps what was typed when a save comes back with an error.

Phase 2 (lineups and rower pages) still needs a `boats.xls` sample. How quickly CrewTimer results appear on race day is still unmeasured, but the refresh now logs it: each regatta records when every event's first and last results appeared (`resultTimes`, accurate to the 5-minute refresh), and the admin page shows the median minutes after the start. Check it after the next race weekend.

Logins are rate-limited: 10 wrong passwords from one address in 15 minutes and that address waits (`src/lib/login-limit.ts`). Counts live in the `logins` Blobs store under a salted hash, never the raw address. If the store can't be reached, logins go through rather than lock the club out. The demo skips it.

The scheduled refresh also warms the weather cache for regattas racing today or tomorrow, so race-day page views don't wait on Open-Meteo. The home page asks iPhones that haven't added CrewDash to the Home Screen to do so, and installed phones that never turned alerts on to turn them on. "Not now" hides it for two weeks on that phone. A volunteer's setup guide for other clubs is in [SETUP.md](SETUP.md).

Sharing is built. Any logged-in parent can open **Invite a parent** from the settings menu (`/share`, also linked at the end of Rowing 101). It makes an invite link (`/join?k=...`) to send through the phone's share sheet or copy, and shows it as a QR code to scan in person. The link logs a new phone in as a member, with no password, and lands on Rowing 101. It's signed with `SESSION_SECRET`, works for anyone who has it, and expires after 14 days (`INVITE_DAYS`). Nothing is stored, so the only way to cancel invites early is changing `SESSION_SECRET`, which logs everyone out. A phone that's already logged in keeps its session when it opens an invite. If the club moves to its own accounts later, this is the piece to revisit.

Stored regattas keep the parser's output, not CrewTimer's raw JSON, so a parser change only reaches a stored regatta when it's fetched again. Each stored copy records the `PARSER_VERSION` (in `src/crewtimer/normalize.ts`) that made it. **Bump it whenever `normalizeRegatta`'s output changes.** The scheduled refresh then re-fetches older copies of past regattas five per run, on top of the recent ones. This came from the 2026 Head of the Fish: the multi-day fix was deployed late on the Saturday, but the stored copy was still the old parse on Sunday morning, so it didn't show as Today until a refresh. Coaches and admins now have a **Refresh results** button on each regatta page and Today card for cases like that. It fetches the regatta and sends alerts the same way the scheduled refresh does.

Blades are drawn by CrewDash, never copied from OarSpotter. A blade is a base color with up to three shapes layered on top, each in its own color (`src/lib/blade.ts`): tip, band, stripes, chevrons, a chevron tip and its edging, halves, quarters, a diagonal and a line along it, thin stripes and spots. Later layers sit on top. Blades saved in the older one-pattern, two-color form are read as one layer. The club's own blade is edited the same way in club settings (older settings with a base and tip color become a tip layer). The admin sets other clubs' blades at `/admin/blades`, which lists every club in the stored results under "Needs a blade" and "Has a blade", most entries first, with a search box that filters as you type. In a regatta's whole-field list, admins get an "Add" link beside any club without a blade, which opens the editor for just that club (`?club=`) and returns to the regatta after saving. They're stored under the `blades` key of the `regattas` Blobs store and matched to crew names ignoring boat letters (with or without brackets) and "- EXH". Each event on a regatta page has a collapsed "See the whole field" list with every crew's place, blade, club name, bow and time, the club's own boats highlighted. Other clubs' rowers are never named.

A made-up demo club (`npm run demo`, code in `src/demo/`) runs the whole app from memory with fictional data, for screenshots and trying CrewDash out. `CREWDASH_DEMO=1` (checked by `isDemo()` in `src/lib/config.ts`) swaps `blobsStore()` for the demo store and `club.json` for `src/demo/club.json`. The demo store never has saved club settings, so the demo club always comes from that file. It is safe to put online: the passwords are fixed and printed on the login page (`DEMO_PASSWORDS` in `auth.ts`), the middleware refuses every admin and coach change and push sign-ups, `fetchRegattaResults` refuses to fetch so no real rower can appear, the scheduled refresh does nothing, and every page says it's a demo. The public copy is the Netlify site `crewdash-demo` (https://crewdash-demo.netlify.app) with only `CREWDASH_DEMO=1` set. Today's regatta is rebuilt around the clock on every read. `scripts/screenshots.mjs` saves phone screenshots from it into `docs/screenshots/`. Plans for sharing CrewDash with other clubs are in [GOING_PUBLIC.md](GOING_PUBLIC.md).

Seasons start in the month set in club settings, for clubs that race fall to spring or in the southern summer. Season pages, Wrapped, the roster and the CSV export all follow it. Series pages still compare calendar years, since each year is a separate edition of a regatta. Dates, times and numbers are written in the club's `locale` (default `en-US`). The words stay English.

## Deployment

- Netlify site `crewdash` on the FamilyHub team: https://crewdash.netlify.app (dashboard: https://app.netlify.com/projects/crewdash). Site ID `b4a0232e-e03c-458d-ae67-59de2a3a36aa`.
- Deploys use Netlify credits, so they're batched and only made when the repo owner agrees, not after every merge.
- Pittsford's club settings were saved in Admin on 2026-10-26, after the deploy that moved them out of `club.json`. Deploys now build straight from `main`, with the neutral `club.json`. Download a copy of the settings from `/admin/club` now and then, since Blobs keeps no history.
- Deploys are currently uploaded from a Claude session, not built from GitHub. Linking the repo in Netlify (Project configuration, Build and deploy, Link repository) would make every merge to `main` deploy automatically.
- Environment variables, set by the repo owner in the Netlify dashboard for the production context only: `CLUB_PASSWORD`, `ADMIN_PASSWORD`, `COACH_PASSWORD` (optional, needed for coach logins) and `SESSION_SECRET`. Deploy previews and branch deploys have no session secret, so they stay locked. Changing a variable needs a redeploy. Changing `SESSION_SECRET` logs everyone out.
- The Netlify connector's environment-variable writes reported success but didn't save (seen twice on 2026-10-12). Set variables in the dashboard instead.
- Results are stored in a site-wide Netlify Blobs store named `regattas`. Only production uses the site-wide stores (`regattas`, `push`, `logins`). Deploy previews and branch deploys get deploy-scoped stores of their own that start empty (`clubStore()` in `src/lib/blobs.ts`, from the context in `Netlify.context`), so testing a branch can't touch real data. A deploy whose context Netlify doesn't report is treated as production.
- `npm audit` was clean on 2026-10-26 after `npm audit fix` (a lockfile-only update). The advisories had all been in Netlify's dev and build tooling and Astro's font tooling, none of which handles visitor requests. Run it again when dependencies change.
- Every response carries `frame-ancestors 'none'` and `X-Frame-Options: DENY` (so no other site can frame the admin and coach buttons), plus `nosniff` and a strict referrer policy. They're set in `src/middleware.ts`. Login redirects only go to same-site paths, read the way a browser reads them (`safeNext` in `auth.ts`).

## Decisions made

- Pittsford Crew is the first club. Code stays club-neutral. Club settings are edited in Admin and stored in Netlify Blobs (decided 2026-10-26), so nothing about Pittsford is in git, forks never conflict on `club.json`, and changing settings costs no rebuild. Other clubs reuse CrewDash by forking. A hosted multi-club service waits until clubs ask.
- Access is one shared club password for Phase 1. The default is a password gate built into CrewDash (free). Netlify's own password protection needs a paid Pro plan, so the club could choose that instead.
- Hosting is on Netlify.
- Raw times are never compared across different regattas. Year over year at the same regatta is fine.
- Exhibition boats are tagged in comparisons and show an unofficial "would have placed".
- Push notifications are Phase 1.5.
- PRs merge automatically once CI is green and there are no open review comments.
- The repo is public as of 2026-10-26. The full history was checked first: no regatta data, rower names or secrets were ever committed. No real rower data goes into git, ever.
- The licence is AGPL-3.0 or later (decided 2026-10-26). See GOING_PUBLIC.md.
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

These came from the 2026 Head of the Fish (`r16426`), a two-day regatta, fetched on the Saturday evening. The data was kept outside the repo.

- `regattaInfo.Date` is the first day only. Each event has a `Day` ("Saturday", "Sunday") that indexes `regattaInfo.DayList`. CrewDash now dates each event from it, so the Today card, calendar, weather and results-speed log use the right day. Before this, the Today card dropped the regatta on its second day.
- A club with two boats in an event races as "Pittsford Crew (A)" and "Pittsford Crew (B)", even with only one boat. Genesee used the plain name. A trailing single boat letter now counts as the club. Some regattas write it without brackets ("Brighton RC A"), so a bare trailing letter from A to H counts too, for the club and for other clubs' blades (`stripBoatLetter()` in `src/club.ts`).
- Sunday's entries, bow numbers and event start times were all there the night before racing. `Stroke` was filled for most boats. This answers experiment A.
- Each raced entry has `G_Start_time_raw`, the boat's actual start time of day. Saturday's morning events started 13 to 41 minutes behind schedule and caught up after lunch. Boats left about 27 seconds apart. Bow numbers run on across events, so a boat's place in the start order is its bow minus the event's first bow.

These came from the 2026 Pull The Plug (`r15201`), checked on 2026-10-29, two days before racing, against the same regatta's RegattaCentral entries page.

- CrewTimer had an early copy of the entries: 20 events and about 63 entries against RegattaCentral's 87. A Pittsford boat entered in RegattaCentral was missing from CrewTimer. RegattaCentral says bow numbers are assigned after registration closes, and its bows were all still 0.
- Event numbers differ between the two systems. RegattaCentral's event 16 was CrewTimer's event 2, so a join between them can't use event numbers.
- We expect CrewTimer to re-import once the draw is final, which can renumber bows and events. Coaches should enter lineups only once CrewTimer has the final entries, usually the night before. Each lineup now keeps the crew name CrewTimer had at its bow when saved. If that bow later holds a different crew, the regatta page warns on the lineup and rower pages leave it out until a coach saves it again. Lineups saved before this have no crew name and can't be checked. A lineup whose bow disappears from the club's boats simply stops showing.

Not yet seen: a sprint regatta. Sprint results may use fields the parser doesn't handle.

## Open items

- **Club admin.** Unknown. They would add regattas after each race weekend and, in Phase 2, upload lineups. The repo owner is finding out who.
- **RegattaCentral staff login.** Unknown whether Pittsford has one. A `boats.xls` lineup sample from a past regatta is needed before Phase 2.
- **RegattaCentral API access.** Declined on 2026-10-12. API access is limited to approved timing vendors for now. They're considering broader access and invited specific requirements, with no timeline. Our requirements reply (below) was sent on 2026-10-12. Lineups are coach-entered instead (see Status). Don't scrape RegattaCentral's website as a workaround.
- **Sprint regatta link.** A CrewTimer link to a sprint regatta (for example the Pittsford Regatta) would let us test the parser on sprint results.
- **Athlete-data policy.** The club should check whether it has a policy on publishing athlete information.
- **OarSpotter.** Declined (2026-10-26). CrewDash draws blades itself instead (see Status).
- **Entazza (CrewTimer's developer).** Emailed on 2026-10-12 (the draft below). No reply as of 2026-10-26. A follow-up is drafted in GOING_PUBLIC.md.
- **Replacing CrewTimer and RegattaCentral.** Researched 2026-10-26 (GOING_PUBLIC.md). CrewTimer's app is free and partly open source, Streamline offers free hosting, and the real barrier is USRowing's free sanctioning only for RegattaCentral events. Emails to Entazza, USRowing and Streamline are drafted there, not yet sent. Nothing gets built until they're answered.
- **CrewTimer's documented export.** `https://www.crewtimer.com/results?asfile=true&regatta=<id>&format=json` returns results as JSON (tested 2026-10-26), but only the events: no regatta title or date, no `Day` on events, no `Official`, and no `G_Start_time_raw`. Start alerts and multi-day dating depend on those, so CrewDash stays on the Firebase feed, which CrewTimer's own open-source tools also read.
- **Function runs.** On the Head of the Fish Sunday, 39% of function runs were for `/manifest.webmanifest`, and more were for missing root icons. Fixed: the manifest is now built once as a static file (in the club's colours), and `favicon.ico` and `apple-touch-icon*.png` are static files at the site root.
- **Change-marker check (next race day).** Each scheduled refresh now also reads CrewTimer's tiny `lastUpdatedEvent` field and logs `Marker check <id>: ...` in the refresh-recent function log. After a race day, search the log for "marker missed a change". If it never appears, the refresh can skip the full download (about 665 KB) whenever the marker hasn't moved. If it does appear, the marker doesn't track start times or corrections and can't be relied on.
- **Repo About panel.** Not yet set. Suggested values are below.

## Draft email to Entazza

Support contact from https://www.entazza.net/about-entazza.html: Glenn Engel, glenne@entazza.net. Updated 2026-10-12 to describe the live app.

> **Subject:** CrewDash: a club results view built on CrewTimer data
>
> Hi Glenn,
>
> I'm a parent volunteer with Pittsford Crew in Rochester, NY. Our club races at many regattas timed with CrewTimer, and we've built a small web app called CrewDash so our families and coaches can see only our club's boats and results. It's live for our club now, behind a club password because most of our rowers are minors. It's volunteer-run and not commercial.
>
> CrewDash reads the public results JSON that the CrewTimer results pages load (`crewtimer-results.firebaseio.com/results/<regattaId>.json`), one regatta at a time, after a club admin adds the regatta link. It keeps a copy so it doesn't re-fetch old regattas. It only checks for new results on race weekends: every 5 minutes, during the day, only for regattas from the day before race day to three days after. A typical race day is around 120 small requests per active regatta. When a club event's results are complete, it sends our families a notification.
>
> Before we rely on this further, I wanted to check a few things with you:
>
> 1. Are you comfortable with us using the results data this way?
> 2. Is there a supported API or feed you'd prefer we use? The site links to an API.md in the crewtimer-doc repo, but that link currently returns 404.
> 3. Is a request every 5 minutes per regatta on race day acceptable, or would you prefer a different rate?
> 4. Are start times and entries (bow numbers by event) published to the results feed before racing begins? It would let us show families when their crews race.
> 5. We've written the code so other clubs could run their own copy. Any concerns with that?
>
> Happy to share the code or change anything to suit you. Thanks for CrewTimer. It's made following regattas much easier for all of us.
>
> [Your name]
> Pittsford Crew

If they point us to a supported API, only `src/crewtimer/fetch.ts` should need to change. If they ask for a lower polling rate, race-day notifications get slower, and nothing else changes.

## RegattaCentral API

**Outcome (2026-10-12):** an API engineer at RegattaCentral replied that API access is limited to approved timing vendors and their regatta timing workflows, so CrewDash can't have a key for now. They're considering broader capabilities for rowing organizations and third-party apps, with athlete privacy central to that, and welcomed specific requirements. They gave no timeline. The notes below stay as reference in case access opens up.

From RegattaCentral's API V4 documentation (`https://api.regattacentral.com/v4/`, the cookbook PDF and the `rc-api.xsd` schema), read on 2026-10-12. The pages sit behind Cloudflare, so read them in a browser.

**Access.** Every call needs credentials, and RegattaCentral issues them only to approved applications (contact api@regattacentral.com). A standard key is sent as an `API-Key` header and needs no user login. OAuth2 (password grant, with regatta staff access) is only needed for `/bulk` and the guaranteed-entry endpoints, and CrewDash needs neither. So CrewDash never has to handle anyone's RegattaCentral password.

**Pittsford's RegattaCentral organization ID is 2068.** It goes in the club settings when the integration is built.

**Endpoints that take a standard key** (all `GET https://api.regattacentral.com/v4.0/...`):

| Path                                                                            | Returns                                                                                                  |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `regattas/{RegattaId}`                                                          | Regatta details: dates, time zone, venue with latitude, longitude and course distances, `timingProvider` |
| `regattas/{RegattaId}/organizations/{ClubId}/events`                            | Events the club entered                                                                                  |
| `regattas/{RegattaId}/organizations/{ClubId}/lanes`                             | The club's lane draw (bow numbers)                                                                       |
| `regattas/{RegattaId}/organizations/{ClubId}/races`                             | The club's races, with `scheduledStart`                                                                  |
| `regattas/{RegattaId}/organizations/{ClubId}/results`                           | The club's results, when the timing system reports to RegattaCentral                                     |
| `regattas/{RegattaId}/entries/{EntryId}`                                        | One entry with its lineup                                                                                |
| `regattas/{RegattaId}/events/{EventId}/entries`, `/lanes`, `/races`, `/results` | The same for a whole event                                                                               |

**Fields CrewDash would use** (from `rc-api.xsd`):

- `Entry`: `entryId`, `eventId`, `organizationId`, `status`, `entryLabel` (e.g. "A"), `bow` (the registration bow number), `averageAge`, `handicap`, `entryParticipants`.
- `EntryParticipant`: `name` (one full-name string), `sequence` (seat), `type` (`rower`, `coxswain`, `spare`, `coach`). Whether sequence 1 is bow or stroke is unconfirmed.
- `Race`: `scheduledStart`, `actualStart`, `status` (`PreDraw`, `Draw`, `Racing`, `Unofficial`, `Official` and others), `displayNumber`, `stageName` (heat, final), `lanes`.
- `Lane`: `displayNumber` (the bow or lane number the timing system uses), `entryId`, `status`, `results`. The schema warns this can differ from `Entry.bow`. Joins should prefer it when a race has lanes.
- `Result`: `place`, `elapsedTime`, `adjustedTime`, `marginToFirst`, `penaltyTime`, `penaltyCode`, `status`.
- `Venue`: `latitude`, `longitude`, and `courses[].distance`. These could prefill CrewDash venue pages.
- `Organization.blade`: an OarSpotter blade image.
- `Participant.birthdate` is blurred to January 1st of the birth year. CrewDash shouldn't store it.

**What this means for the plan.** Lineups (Phase 2) and race start times (roadmap step 7) can come from the standard key, with no `boats.xls` uploads. The join to CrewTimer results is by event and bow number, as planned.

**Still unknown:**

1. Whether regattas timed by CrewTimer populate RegattaCentral races and lanes. If not, CrewDash still gets lineups and registration bow numbers, but no start times.
2. How RegattaCentral events map to CrewTimer event numbers. The fallback is event name plus bow number.
3. How to find a regatta's RegattaCentral ID. The Search RegattaCentral pages (Regattas, Organizations) should cover this.
4. Usage limits and terms.

## Reply to RegattaCentral (requirements, as they invited, sent 2026-10-12)

> Hi [name],
>
> Thanks for the quick and clear reply, that's understood. Since you asked, here's what we'd use if broader access opens up:
>
> - Our own organization's entries, lane draw and race schedule for a regatta (`/organizations/{ClubId}/events`, `/lanes`, `/races`), so families can see when our crews race.
> - Lineups for our own entries only (`/entries/{EntryId}`), shown behind our club password, with no birthdates stored.
> - Venue location and course distance from the regatta details.
>
> Read-only access limited to our own club's data would cover everything we need. Happy to answer any questions, and good luck with the busy season.
>
> Matt O'Hara
> Pittsford Crew

## Draft email to OarSpotter

For showing other clubs' blades next to their crews. Kept for reference: OarSpotter declined, so CrewDash only draws Pittsford's own blade, from the blade colors in club settings (default: the stripe colors).

> **Subject:** Permission to show OarSpotter blade images in a club results app
>
> Hello,
>
> I'm a parent volunteer with Pittsford Crew in Rochester, NY. We've built a small, non-commercial web app called CrewDash so our families and coaches can follow our club's results at regattas. It sits behind a club password because most of our rowers are minors.
>
> We'd love to show each club's blade next to its crews on our results pages. It makes a results list much easier to scan, and it's a nice touch for families who are new to the sport. OarSpotter is clearly the best source for that.
>
> Would you be comfortable with us linking to OarSpotter blade images for the clubs that appear in our results? We'd credit and link to OarSpotter wherever the blades appear. We could hotlink your images or keep a small cached copy, whichever you prefer. The number of views would be modest: one club's families and coaches, mostly on race weekends.
>
> If you'd rather we didn't, we completely understand. Thanks for building OarSpotter.
>
> Matt O'Hara
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

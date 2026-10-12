# CrewDash plan

CrewDash is a phone-first web app that shows a rowing club its own racing: every boat it entered, how each boat did, and (once lineups are in) who rowed in it. Results sites list every club at a regatta, so finding your own crews means a lot of scrolling. CrewDash shows only yours.

Pittsford Crew is the first club. The code is club-neutral from the first commit. Everything club-specific lives in one settings file, so another club can fork the repo, edit that file and deploy its own copy.

## Data sources

**CrewTimer (results).** Each regatta's results are readable as public JSON at `https://crewtimer-results.firebaseio.com/results/<regattaId>.json`, where the regatta ID comes from the CrewTimer link (for example `r16329` in `crewtimer.com/regatta/r16329`). This is the same data the CrewTimer results page loads. It needs no login. Each entry has the event, bow number, club name and abbreviation, stroke's name, place, raw and adjusted times, and penalties. There is also a flag for whether results are official yet.

The full list of regattas is not readable, so CrewDash cannot discover which regattas a club raced. A club admin adds each one by pasting its CrewTimer link.

This is not a documented API. CrewTimer can change or lock it down at any time. CrewDash therefore stores everything it fetches, and we should let CrewTimer's developer (Entazza) know about the project before other clubs use it.

**RegattaCentral (lineups).** CrewTimer only names the stroke. Full lineups (who sat in which seat) are only in RegattaCentral. A club staff login can download a `boats.xls` lineup file per regatta. The RegattaCentral API has lineups too, but needs approved credentials. We have not yet seen a real `boats.xls`, so the exact columns are unconfirmed.

**The join.** Lineups attach to results by regatta, event number and bow number, which both systems share.

## What the data looks like in practice

These come from the 2026 Head of the Genesee results (`r16329`) and shape the parser:

- One club can appear under more than one name in a single regatta ("Pittsford Crew" and "Pittsford Crew - EXH"). Each club configures a list of name aliases. The admin view shows near-misses for review instead of guessing.
- Average crew age is buried in the penalty text, as in `buoy(5s), Age 16(0)`.
- Exhibition entries have a blank place and a time like `Exh 09:34.509`.
- Times are strings such as `19:28.427`.
- Results can be marked pending official. CrewDash re-fetches until they are final.

## Data model

Regatta, Event, Boat (one entry, identified by bow number), Result, Athlete and Seat. Athlete and Seat stay empty until lineups arrive, and nothing else changes when they do.

## Comparing performances

Raw times are not compared across regattas. Head race courses differ in length and conditions, so a time at one regatta says nothing about a time at another. Season and boat views show place, the number of crews in the event, and the margin behind the winner.

## Phases

**Phase 0: Scaffold.** TypeScript project with lint, formatting, tests and CI. The CrewTimer parser comes first, tested against a made-up fixture that mirrors the real structure.

**Phase 1: Results from public data.** Needs nothing from anyone.

- Season view: regattas the club raced, with headline results.
- Regatta page: only the club's boats, grouped by event, with place, time, penalties and official status.
- Boat page: one entry followed across the season, labeled by event and stroke.
- Admin page: paste a CrewTimer link to add a regatta, and review possible club-name matches.

**Phase 2: Lineups and rower pages.** Blocked on a real `boats.xls` sample. An admin uploads the lineup file for each regatta, CrewDash joins it by bow number, and each rower gets a page with every race they rowed, their seat and the result.

**Phase 3: Less manual work.** Use the RegattaCentral API instead of file uploads if the club gets access. Look into finding CrewTimer regatta IDs automatically from RegattaCentral regatta pages.

**Phase 4: Other clubs (optional).** Start with the fork-and-configure template. A hosted service for many clubs waits until clubs ask for one.

## Privacy

Most rowers are minors. Their results are already public on CrewTimer, but collecting them into per-rower pages makes them much easier to find, so the whole app sits behind a login.

- No real rower data is committed to git. Tests use made-up fixtures, and fetched data lives only in the deployed app's storage.
- Phase 1 uses a single shared club password.
- The club should check whether it has a policy on publishing athlete information.

## Hosting and access

The app is hosted on Netlify. Netlify Functions handle fetching, Netlify Blobs stores normalized data, and a scheduled function refreshes results that are still pending official.

Netlify's built-in shared-password protection requires a paid Pro plan. The two options are:

1. **Netlify Pro password protection.** No code, set in the Netlify dashboard. Costs a monthly Pro subscription.
2. **A password gate built into CrewDash.** A small edge function checks a signed cookie and shows a password page. Free, but it's code we own and must get right. The password lives in a Netlify environment variable, never in git.

## Decisions

Made:

- Access: one shared club password for Phase 1.
- Hosting: Netlify.
- Scope: club-neutral code, Pittsford first, template-style reuse later.

Open:

- Netlify Pro password protection versus a built-in gate (see above). The built-in gate is the default unless the club prefers to pay.
- Who the club admin is. They add regattas after each race weekend and, in Phase 2, upload lineup files.
- Whether Pittsford has a RegattaCentral staff login, and a `boats.xls` sample from a past regatta.
- Repo visibility. The plan works either way because no rower data goes into git. Private is still the safer default.

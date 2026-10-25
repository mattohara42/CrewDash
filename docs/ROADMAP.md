# CrewDash roadmap: ideas and next updates

A design pass on what to build after Phase 1.5. [PLAN.md](PLAN.md) stays the record of what's decided. This file is the agreed order of the next updates, written and agreed with the repo owner on 2026-10-12. The decisions are near the end.

## Who uses it, and when

| Who                | Before a race                                                   | On race day                                    | Afterwards                                              |
| ------------------ | --------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------- |
| New parent         | What is this event? What do I bring? Where do I park and stand? | When does my kid race, and where do I watch?   | How did they do, and what does that place mean?         |
| Experienced parent | Schedule and weather                                            | Live results, team tent location, food plan    | Results, photos, year over year                         |
| Rower              | My races and launch times                                       | Next race, results as they land                | How we did against rivals and last year                 |
| Coach              | Schedule, conditions, hot seats                                 | Every boat at a glance, a way to reach parents | Margins, head-to-head, notes for practice               |
| Club               | Calendar, volunteer and food sign-ups                           | Announcements                                  | Recaps for social media, the newsletter and the banquet |

## Constraints that shape the ideas

Results are the only data we have until lineups arrive (Phase 2), so anything about a specific rower waits for that. There are no personal accounts, only a shared club password and an admin password, so "my kid" features have to live on the phone itself rather than on the server. Most rowers are minors, which rules some ideas out entirely. Every page view runs a function, and Netlify bills in credits, so race-day features should be light. Code stays club-neutral, with club-specific content kept out of the code.

## Ideas by theme

### Race day: a "Today" view

On a race weekend the home page becomes a single race-day screen. It shows the club's boats in start order, a countdown to the next one, results as they land, the venue card (map links, weather, team tent) and any announcement from the coaches. It leans on what already exists: the refresh, the push alerts and the event-follow list on the Alerts page.

A parent can mark the crews they care about, and that choice is stored on their phone. It highlights those crews in the Today view and pre-fills their alert choices. This gives a "my kid" experience without accounts, and once lineups exist it becomes "follow a rower".

### Planning a race

The most useful planning feature is answering "when should I be at the finish line?" A head race starts boats in bow-number order at a fixed interval. With the event's start time, the bow number and last year's typical time for that event at the same venue, CrewDash can estimate when each boat starts and when it passes each viewing spot. That's a fair use of year-over-year data, because it's the same course.

This depends on whether CrewTimer publishes entries and start times before racing begins. The parser already reads an event `Start` field, but we haven't seen it populated ahead of a race (see Experiments).

Smaller pieces: an "Add to calendar" button for each regatta (an `.ics` download, which works behind the password), a list of upcoming regattas, and a packing checklist per venue type.

Once lineups exist, a **hot-seat checker** can flag a rower entered in two boats whose races are too close together. Coaches currently do this by hand.

### Venues, maps and conditions

Each regatta series (already tagged by the admin) links to a venue. A venue page holds course facts (length, direction, launch, start, finish), viewing spots, parking, restrooms, where the club's trailer and tent usually go, and tips from parents who've been before. Map links open Apple or Google Maps at each spot. That's free and needs no map library. An embedded map (Leaflet with OpenStreetMap tiles) can come later if people want one.

**Conditions.** With the venue's location and course direction stored, CrewDash can show the race-day forecast as a headwind, tailwind or crosswind along the course, plus temperature and rain. For river courses it can add current flow from the nearest USGS gauge. Open-Meteo and USGS are both free and need no key, though Open-Meteo's terms should be checked before relying on it.

The same data looked up after the race answers an open question in the year-over-year view. PLAN.md says conditions vary between years. With historical weather we can show "2025: 12 mph headwind. 2026: calm" next to the times, so a slow year has an explanation.

### New families

A **Rowing 101** page explains head races and sprints, what "4+" and "8+" mean, coxswains, bow numbers, adjusted times, age handicaps and exhibition boats, and how to read a results page. Results pages get small "what's this?" links on terms like Exh and Adj. Most of this is club-neutral and can ship with the code. A club section adds local know-how: what to bring, how the food tent works, and who to ask. It's cheap to build and probably the most appreciated thing on this list.

### Better post-race analysis

These stay within the rule that raw times are never compared across regattas.

- **The gap that mattered:** seconds to the next place up and to third place. "1.2 s off a medal" means more to a rower than "4th of 12".
- **Crews beaten**, as well as place and field size.
- **Pace per 500 m** once the venue has a course length. It's the unit rowers think in, and it's labeled as this course only.
- **Head-to-head with rival clubs**, counted only between crews in the same race, across the season. Rival clubs would be listed in the club's settings. Rowers would love this.
- **A coach's notes** on a regatta or event ("rough start, crab at 1000 m"), visible to the club. It needs a decision on who counts as a coach (see Decisions).
- **CSV export** for coaches who want their own spreadsheet.

One idea for discussion: time as a percentage behind the winner is a relative measure that some rankings use to compare across regattas. It bends the "no cross-regatta comparison" rule, so it should only go in if the club wants it, and it would need clear labels.

### Communication

See the messaging section below. The short version is one-way announcements from coaches and admins, sent as a push alert and shown as a banner, plus a link to the group chat the club already uses.

### Season and club

- **Weekend recap:** an automatic summary after each regatta (medals, best finishes, biggest gains on last year) with a club-level image the club can post. It names events and places, never rowers, and that information is public on CrewTimer anyway.
- **Season Wrapped:** an end-of-season summary in the style of Spotify Wrapped, with regattas raced, medals, kilometres raced and most improved event. It doubles as a banquet slideshow. It's club-level now and per rower after lineups.
- **Results speed log:** record when each result first appears relative to the event start. This answers the open question about how quickly CrewTimer posts results, and lets us tell parents what to expect.

## In-app messaging

I'd hold off on two-way parent chat. Everyone shares one password, so posts can't be tied to a person. Rowers have the password too, which means a chat would put adults and minors in the same unmoderated space. USRowing clubs generally have to follow SafeSport's MAAPP rules, which cover electronic messages between adults and minor athletes. It would also mean building moderation, notifications and storage, and families already have a group chat they won't leave.

What fits instead is one-way **announcements**. An admin or coach types a short message ("Team tent moved to the east lot", "Lunch at the trailer at noon"). It goes out through the existing push alerts and sits as a banner on the Today view for the rest of the day. The plumbing already exists, so this is small. A link to the club's chat in the settings covers the conversation side. If the club ever moves to personal logins, two-way messaging can be reconsidered.

## Proposed sequence of updates

Each step is one or two PRs, ordered by value for effort. None of it is blocked on outside data except step 7.

| #   | Update                                                                                                           | Mainly for            | Depends on                            | Size            |
| --- | ---------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------- | --------------- |
| 1   | Rowing 101 page and term explanations on results                                                                 | New parents           | Nothing                               | Small           |
| 2   | Venue pages with map links, course facts and club tips, linked from each series, and an editor on the admin page | Parents               | The club admin entering venue content | Medium          |
| 3   | Coach login, announcements (push and banner) and a link to the club chat                                         | Coaches, parents      | A coach password in Netlify           | Small to medium |
| 4   | Race-day Today view, with crews you follow saved on your phone                                                   | Everyone              | Steps 2 and 3 help                    | Medium          |
| 5   | Analysis: gap to next place and to third, crews beaten, rivals head-to-head, pace per 500 m, weekend recap card  | Rowers, coaches, club | Course lengths from step 2 for pace   | Medium          |
| 6   | Conditions: forecast along the course, flow, and historical weather in year over year                            | Everyone              | Step 2, Open-Meteo terms              | Medium          |
| 7   | Schedule: estimated start and pass times, Add to calendar                                                        | Parents               | Experiment A                          | Medium          |
| 8   | Season Wrapped and banquet mode                                                                                  | Club                  | End of season                         | Small           |

Phase 2 (lineups) then unlocks rower pages, follow-a-rower alerts, the hot-seat checker and a Wrapped for each rower.

## Experiments to run first

These are small and low-risk, and they decide whether some of the steps above are possible.

- **A. Pre-race data.** Fetch the CrewTimer JSON for a regatta a few days before it runs, then again on the morning of the race. Does it list entries, bow numbers and event start times before any results exist? If it does, step 7 and a pre-race Today view work. If not, schedules would need RegattaCentral or manual entry. **Answered 2026-10-24 (Head of the Fish): yes.** Entries, bow numbers and event start times were there the night before, and raced boats carry their actual start time. See HANDOFF.md.
- **B. Results speed.** Add the results speed log before the next race weekend. It's a few lines in the refresh and answers an open item in HANDOFF.md.
- **C. Historical weather.** Look up Open-Meteo's archive for the 2025 and 2026 Head of the Genesee mornings and check the wind looks plausible against what people remember.

## Decisions

Made with the repo owner on 2026-10-12:

1. **Order.** The sequence above stands, starting with steps 1 to 3.
2. **Venue pages are edited by the admin** on the admin page and stored in Netlify Blobs with the other admin settings, so they stay out of git and `club.json` keeps its current role. The club tips on the Rowing 101 page use the same editor. The general Rowing 101 text is club-neutral and ships with the code. Blobs has no history, so the editor should include an export to a file the admin can keep.
3. **Coaches get their own login.** A coach password, set in Netlify like the others, lets coaches post announcements and coach's notes but not change settings. The admin can do everything a coach can.
4. **Announcements instead of chat.** Two-way messaging stays parked unless the club moves to personal logins.
5. **Recap images** at club level (events and places, no rower names) can be posted publicly.

## Parked, and why

- **Two-way chat and photo uploads:** these raise the identity and minors issues above, and photo storage costs money. Linking to the club's existing shared album per regatta covers photos.
- **Erg scores and fitness data:** this is sensitive data about minors that coaches already keep elsewhere.
- **Live GPS tracking:** CrewTimer doesn't provide it.
- **Volunteer and food sign-ups:** these need personal identities. Linking to the club's SignUpGenius (or similar) from the Today view is enough.

## Something to watch

Every page renders on request with `Cache-Control: private, no-store` (`src/middleware.ts:24`), so each page view uses a function call. That's the right call for the password gate, but a Today view that many parents refresh all race day could add up. After the next race weekend it's worth checking Netlify's usage page. If it's high, the Today view could fetch a small JSON update every minute instead of reloading the whole page.

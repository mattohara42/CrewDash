# Going public: a draft post and what it would take

A first pass at sharing CrewDash beyond Pittsford, written 2026-10-26. It has a draft post, notes on screenshots, privacy and licensing, an honest look at the money, and what replacing CrewTimer or RegattaCentral would really involve. Decisions so far are noted where they were made.

## Status

Updated 2026-10-26. Entazza (CrewTimer) still hasn't replied. OarSpotter declined, so CrewDash draws every club's blade itself. The licence is settled as AGPL-3.0 (see below). A made-up demo club runs locally with `npm run demo` and publicly at https://crewdash-demo.netlify.app (read-only, never fetches real results). Phone screenshots from it are in [screenshots/](screenshots/). A setup guide for a second club is in [SETUP.md](SETUP.md), with an outreach email below.

## Draft post

For a rowing parents' group, a coaches' forum or r/Rowing. It leads with the one thing no current tool does: show a parent their own kid's races today, and nothing else. It is written to invite replies, not to sell anything.

> **Subject:** "When does my kid race?" We built the app that answers it.
>
> I'm a parent volunteer with a youth rowing club. Every regatta, I'd open the results site and see everything: every club, every event, hundreds of boats, in a layout built for regatta officials. What I actually wanted to know was simple. When does my kid race today? Where do I stand to watch? How did they do, and what does "4th, +0:12.3, Exh" even mean?
>
> None of the regatta apps answer that, because none of them are built for one club, let alone one family. So a few of us built CrewDash, a phone-first web app that shows a club only its own boats. It reads the public results CrewTimer already publishes, took about two weeks of evenings, and costs our club close to nothing to run.
>
> Open it on race day and the home page is just your club's events, in start order, with a countdown to the next one and results as they land. Star your kid's crews and that's all you see. Your phone buzzes when they start and again when their results are in.
>
> Around that:
>
> - **Rowing 101 for new families**, linked from every confusing term on a results page.
> - **Venue guides**: where to park, where to stand, when crews pass the footbridge, tips from parents who've been before.
> - **Coach announcements** ("Tent moved to the east lot") as a push and a banner.
> - **Results with context**: gap to a medal, crews beaten, pace per 500 m, this year against last year at the same regatta, and the weather along the course.
> - **Rower pages** from coach-entered lineups, so you can follow your kid across the season.
> - **Recaps and a season "Wrapped"** for the club's socials and the banquet, with no names on them.
> - **Invite links** so an experienced parent can bring a new one on board with a QR code.
>
> It's private by design. Most of our athletes are minors, so everything sits behind a club login, and each club runs its own copy, so no one else holds your club's data. The code will be free and open source.
>
> I'd love to know:
>
> 1. Would your club use something like this?
> 2. Would your club run its own copy, or would you want someone to host it? We're still working out how to make setup easy for a club volunteer.
> 3. What's the one thing you wish your regatta tools did that they don't?
>
> You can try it here, with a made-up club: https://crewdash-demo.netlify.app

Two notes on tone. The post doesn't criticise CrewTimer, RegattaCentral or anyone else, and I'd keep it that way. CrewDash depends on CrewTimer's public results feed, and Entazza hasn't replied to our email (see HANDOFF.md). CrewTimer is also a small developer with a cheap product, so a "these companies are garbage" post would land on the wrong target and could get the feed locked. The contrast speaks for itself: their tools show everything to everyone, and CrewDash shows one family what they care about.

The post says "two weeks" because the first commit was 2026-10-12. "A few days" would be challenged by anyone who looks.

Because Entazza hasn't replied, it's worth sending one short follow-up before posting, and saying in the README that CrewDash reads CrewTimer's public results page data and will switch to an official feed if one is offered.

## Screenshots

The screenshots come from a demo copy of CrewDash with a made-up club ("Riverside Rowing Club"), made-up rivals, rowers, venues and three seasons of regattas. Nothing in them is real, so nothing needs blurring. Blurring real screenshots was the riskier route: names leak through blur, through crew names and through stroke names in small print.

`npm run demo` starts it locally with the password `demo` (`coach` and `admin` open those pages). Nothing is fetched or saved: the data is built in memory, and today's regatta is rebuilt around the clock on every page view, so the Today card always has some results in, one event racing and more to come. That works best between about 10 am and 6 pm in the demo club's time zone (US Eastern). In the evening every event already has a result.

With the demo running, `node scripts/screenshots.mjs docs/screenshots` saves phone-sized shots of the main pages. Set `DEMO_THEME=dark` for dark mode or `DEMO_FULL=1` for full-length pages. The best ones for a post are `today.png`, `alerts.png`, `rower.png`, `rowing-101.png` and `venue.png`.

The same demo could later be deployed as a public "try it" site. That's one Netlify site with `CREWDASH_DEMO=1` and the demo passwords set, and it costs a deploy, so it waits for your go-ahead.

## Why it matters most to new parents

New parents are the people the current tools serve worst. A results site assumes you already know your club's crew name, which event your kid is in, what a bow number is and why a boat finished third but is listed seventh. CrewDash answers "when does my kid race, where do I stand, and how did they do" on one screen, explains the jargon where it appears, and tells them where to park. The invite link means an experienced parent can hand all of that to a new one in the car park with a QR code. For a club, that's fewer repeated questions in the group chat and new families who feel part of it sooner, which helps retention in a sport where the first season decides whether a family stays.

## Privacy and compliance

The current design is a strong starting point, and the post should lean on it.

**Each club runs its own copy.** If CrewDash stays fork-and-deploy, each club is the only holder of its data, on its own Netlify account. We never hold another club's rower names, so we aren't a data processor for anyone's minors. That is the simplest compliance position available, and it's a real selling point against hosted platforms.

**The login stays.** Results are public on CrewTimer, but gathering them into per-rower pages makes minors much easier to find. The shared club password plus signed invite links is fine for one club. A public release should add login rate limiting first (HANDOFF.md notes there is none) and document how to rotate `SESSION_SECRET`.

**What we already avoid.** No birthdates, no erg scores, no photos, no two-way chat between adults and minors (which keeps clubs clear of SafeSport's MAAPP rules on electronic messages), no rower names in notifications unless someone follows that rower, and no names in shareable recap images.

**What a club would need to check.** Whether it has an athlete-data policy (still open for Pittsford). School-affiliated teams may fall under district rules on student data, and FERPA could apply if a school runs the team. COPPA only covers children under 13, so it matters for middle-school and learn-to-row programs. Its 2025 amendments (tighter consent and data-retention rules) had to be met by April 22, 2026. Clubs outside the US would need to think about GDPR. A short "privacy notes for clubs" page in the repo would cover this without us giving legal advice.

**Third-party terms.** Open-Meteo's terms allow "non-profit websites or apps that do not have subscriptions or advertising" and say "voluntary donations, including contributions through a tip jar, are permitted", with a limit of 10,000 calls a day. A donation-supported CrewDash fits. A paid hosted service would need their paid plan. CrewTimer documents a JSON results export (see the research below), which is a sturdier footing than the Firebase path CrewDash reads today. Entazza still hasn't confirmed they're happy with clubs using it. OarSpotter declined, so CrewDash only ever draws the club's own blade.

**If we ever host it for many clubs**, everything changes. We'd need personal accounts, a privacy policy, data processing agreements with clubs, a security and breach process, and probably insurance. That is the point where volunteer-run stops being realistic.

## Open source, donations, or paid

Decided 2026-10-26: open source under AGPL-3.0 (or any later version), with an optional donation link, and no hosted service for now. The licence is in `LICENSE`.

Open source suits this for three reasons. Clubs can see exactly what happens to their athletes' data, which matters more than any privacy promise. Each club hosts its own copy, which keeps the compliance position above. And other parent-developers can contribute sprint support, other timing systems or other countries' formats. A donation link (GitHub Sponsors or Open Collective) can cover your time without creating an obligation to support anyone.

AGPL means any club can use and change CrewDash freely, but anyone who offers it as a hosted service must publish their changes under the same licence. A regatta software company can't quietly fold it into a paid product. MIT would have allowed that.

A paid hosted version is possible later if clubs ask for it and someone wants to run it as a small business. It would need the work in the last privacy paragraph above. As the copyright holder you can still offer it under other terms yourself, as long as outside contributions are covered (a simple contributor agreement, or only accepting contributions under AGPL). That matters for the most promising route to every family: if Entazza wanted these features inside CrewTimer, AGPL would oblige them to open-source CrewTimer too, so you would offer them the code under MIT or similar. Don't accept outside contributions without an agreement until that's settled.

Before the repo goes public it still needs a README written for a club volunteer rather than a developer, setup steps that don't assume a Claude session, a scan of the git history for anything real (the club config is Pittsford's, which is fine, but the history is worth a look), and a decision on whether to keep Pittsford as the example `club.json` or point newcomers at the demo club.

## The money, honestly

The savings story is weaker than it feels, and the post shouldn't promise it.

**What CrewDash costs.** Netlify's logs for the Head of the Fish Sunday (the 24 hours to 02:00 UTC on 2026-10-26) show 782 page renders and 120 scheduled refreshes, about 900 function runs for a race day. Netlify now bills in credits. The free plan has 300 a month, compute is metered at 10 credits per GB-hour, and each production deploy costs 15 credits (third-party summaries of Netlify's 2026 pricing, worth confirming on Netlify's own page). On those numbers a race day costs about one credit of compute, and the deploys are the main cost. That's why batching deploys matters more than anything about page views. The team is on Netlify's Personal plan.

The same logs show easy savings. 305 of the 782 renders (39%) were for `/manifest.webmanifest`, which never changes but is rendered by a function on every request. Another 40 or so were for `/favicon.ico` and `/apple-touch-icon*.png` at the site root, which don't exist as static files, so each request runs the function and returns an error. Prerendering the manifest and adding those icon files would cut function runs by about 40%. These are small, separate fixes (see Next steps).

**What CrewDash saves.** Nothing a club currently pays for. Clubs pay regatta entry fees, which the organiser sets. The research below found that the timing and registration software is cheaper than it looks: CrewTimer's app is free, and Streamline charges hosts nothing beyond card fees. The money in this sport goes to boats, travel, coaching, entry fees and USRowing membership, not to results software.

What CrewDash does save is volunteer time and parent confusion, and it shows how cheaply good software can now be built. That is a more honest and more persuasive pitch.

## Replacing CrewTimer and RegattaCentral: research

Researched 2026-10-26 with one question in mind: not making money, but improving the experience and lowering the barrier for smaller or less well-funded clubs. The research changed the answer. Sources are listed at the end.

### CrewTimer is not the problem

CrewTimer is more complete and more open than we assumed. The mobile app is free on both app stores. Its documentation covers head and sprint races, multiple timing points, penalties, exhibition boats, multi-day regattas, progressions (a Google Sheets add-on), kiosk and livestream overlays, a FinishLynx connector, and a video finish system built on a roughly $1,230 network camera and an ordinary laptop. Configuration is a Google Sheet, and it imports RegattaCentral's `boats.xls` lineups directly.

Entazza has published nine repositories on GitHub under the MIT licence: the documentation, the video review and recorder apps, the FinishLynx connector, a points calculator and shared types. The shared-types README says they were released "to facilitate migration of additional CrewTimer modules to open source". Their own open-source code reads the same `crewtimer-results.firebaseio.com` feed CrewDash uses.

Their FAQ documents a results export: `https://www.crewtimer.com/results?asfile=true&regatta=<id>&format=json`. Tested on 2026-10-26 with a public regatta ID, it returns the same results as JSON. That is a supported endpoint, and CrewDash should move to it.

I couldn't find what CrewTimer charges a regatta, if anything. The app is free, but the admin site doesn't publish prices. That goes on the list for Entazza.

What CrewTimer lacks is exactly what CrewDash adds: a view for one club and one family, alerts, venue guides, explanations for new parents. So the right move is to build on CrewTimer and offer CrewDash as its family-facing companion, not to replace it. Rebuilding phone timing would spend a season of volunteer effort recreating something that is already free, mature and partly open.

### Free registration already exists

Streamline Rowing says "hosting a regatta is completely FREE". The only charge is card processing at 2.9% plus 30 cents, the standard Stripe rate, which any replacement would pay too. It covers scheduling, roster import, entries, invoicing, progressions, a sprint split timer and published results, with no app to install. It isn't a niche option: the Head of the Fish and the Saratoga Invitational take entries through it. It doesn't mention USRowing membership or waiver checks.

So a small club that wants to host an unsanctioned scrimmage or regatta can already do it for close to nothing: Streamline for entries, CrewTimer for timing, a Google Sheet in between. What's missing is a guide to doing it and a good experience for families, not software.

### The real barrier is USRowing's sanctioning rules

USRowing's 2026 membership announcement says: "Free Regatta Sanctioning continues for events that utilize RegattaCentral." Its sanctioning page says Plus members get event insurance at "$0 if utilizing RegattaCentral as the event platform", that organisers not using RegattaCentral "must pay sanctioning fees in full", and that if not using RegattaCentral "the Regatta Director must submit compliance records for all clubs and athletes before racing begins". RegattaCentral is the "recommended platform", and the sanctioning application itself is submitted through a RegattaCentral login.

That is the lock-in. A sanctioned regatta that leaves RegattaCentral pays sanctioning fees it otherwise wouldn't, and its volunteers have to check every athlete's membership, waiver and SafeSport status by hand. Better software can't remove either cost. Only USRowing can. I couldn't open the sanctioning price sheet (a PDF linked from the page), so the size of the fee is still unknown.

USRowing has no public API for checking membership. Its 2026 policy notes describe integrations with its own background-check provider and with RegattaCentral (a coach dashboard), and nothing for other platforms.

For comparison, British Rowing runs its own entry system, BROE2, which every affiliated competition must use. It checks memberships and ages against British Rowing's own database. That model removes the private-vendor dependency, though it doesn't make entries free.

### What a small club pays to take part at all

Clubs entering sanctioned regattas need a USRowing organisational membership. Dues rose in 2026 by about 3% for uninsured organisations and 7% for insured ones, and the Small tier now covers 26 to 60 members. A club that isn't a member can buy a one-off Regatta Pass for each regatta. Regatta pages quote about $250 to $265 with insurance and $100 to $105 for the Lite version, which covers up to 12 entries. Athletes racing for a member club need a Basic individual membership and a signed waiver. These costs are set by USRowing and have nothing to do with software.

### What this means

For a club that only travels to regattas, no software change lowers its costs much. For a club that wants to host, the free tools exist for unsanctioned events, and the barrier for sanctioned events is a USRowing policy that favours one vendor. Building a new registration or timing platform would put a great deal of volunteer effort into the parts that are already cheap, and would leave the real barrier where it is.

The useful work is, in order:

1. **Make the free stack usable.** Write a "host a small regatta for free" playbook: Streamline for entries, CrewTimer for timing, CrewDash for families. Include a timeline, a volunteer list, the spreadsheet set-up and what to do when something breaks. This is documentation, not code, and it's the single most useful thing for a small club thinking about hosting.
2. **Make CrewDash the family layer for any CrewTimer regatta.** Switch to CrewTimer's documented export, keep it easy for any club to run, and make the demo public so people can try it.
3. **Build the glue where it's missing.** Turning a Streamline entry export into a CrewTimer configuration sheet is a likely candidate. It needs a real Streamline export to check first.
4. **Advocate, with evidence.** Ask USRowing what a non-RegattaCentral sanctioned regatta pays and what "compliance records" means in practice. Ask whether they'd offer a membership-check API to other platforms, or apply free sanctioning to any platform that meets a published standard. A note from a few small clubs, with numbers, carries weight. This costs nothing to try.
5. **Build a replacement only for a proven gap.** If, after steps 1 to 4, small hosts still hit a wall that no free tool covers, that specific wall is worth building for. Nothing found so far is one.

### Open questions, and who can answer them

| Question                                                                                                                                                  | Who                         | Why it matters                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------- |
| What does a regatta pay for CrewTimer, if anything? Are they happy for club apps to use the results export? Would they link to a companion like CrewDash? | Entazza                     | Whether the free stack is really free, and CrewDash's footing                      |
| What is the sanctioning fee for a regatta not on RegattaCentral, and what do the "compliance records" involve?                                            | USRowing                    | The size of the real barrier                                                       |
| Is there, or will there be, a way for other platforms to check membership and waivers?                                                                    | USRowing                    | Whether any non-RegattaCentral path can scale                                      |
| Has Streamline hosted USRowing-sanctioned regattas, and how did the compliance check work?                                                                | Streamline                  | Whether a sanctioned regatta can leave RegattaCentral today                        |
| Can Streamline export entries in a form CrewTimer's spreadsheet can take?                                                                                 | Streamline, or a real event | Whether the glue in step 3 is needed                                               |
| Would a local small regatta or scrimmage try the free stack, with CrewDash for families?                                                                  | Local clubs                 | A real test before anyone builds anything                                          |
| Does Pittsford have an athlete-data policy?                                                                                                               | Pittsford Crew              | Already open in HANDOFF.md, and other clubs will ask the same about their own data |

### Draft: follow-up to Entazza

> **Subject:** Re: CrewDash: a club results view built on CrewTimer data
>
> Hi Glenn,
>
> Following up on my note from October 12. CrewDash has been running for Pittsford Crew this fall, including the Head of the Fish, and families have found it really helpful alongside CrewTimer's results.
>
> Since then I found the JSON results export in your FAQ (`results?asfile=true&format=json`), and I'd like to switch CrewDash to it, since it's documented. Is that the endpoint you'd prefer clubs use, and is a check every 5 minutes on race days alright?
>
> Two other questions. Other clubs have asked about running their own copy, and I'm planning to open-source CrewDash. Would you be comfortable with that, and with it being described as a companion to CrewTimer? And for a guide I'm writing on hosting small regattas cheaply: what does CrewTimer cost a regatta, if anything?
>
> One idea, if it's of interest. What families tell us they want is a view of their own club: their crews in start order, a star to follow their kid's boat, an alert when it starts and finishes, and plain-English explanations of the jargon. If any of that would be useful inside CrewTimer itself, so every regatta got it without clubs running anything, I'd be glad to share the code under whatever licence suits you. There's a demo with a made-up club at https://crewdash-demo.netlify.app.
>
> Thanks again for CrewTimer, and for open-sourcing so much of it.
>
> Matt O'Hara
> Pittsford Crew

### Draft: to a friendly club

For the club most likely to say yes, ideally one whose coach or a parent you already know. The point is to learn what setup takes for someone who isn't us.

> **Subject:** A free race-day app for your club's families?
>
> Hi [name],
>
> This fall a few of us at Pittsford built CrewDash, a phone app that shows families only their own club's boats from CrewTimer results: their crews in start order on race day, alerts when a boat starts and finishes, a Rowing 101 page for new parents, venue guides, and season recaps. Our families have taken to it.
>
> There's a demo with a made-up club here: https://crewdash-demo.netlify.app
>
> We'd love one more club to try running its own copy this spring, so we can see what setup is like for someone who didn't build it. It's free: it runs on a free Netlify account, and your club's data stays in your own copy. A parent volunteer who's comfortable with a website form could set it up in an evening, and I'm happy to help on a call.
>
> Interested?
>
> Matt O'Hara
> Pittsford Crew

### Draft: to USRowing

Send to regatta services or membership support (check the current address on usrowing.org).

> **Subject:** Sanctioning a small regatta that doesn't use RegattaCentral
>
> Hello,
>
> I'm a volunteer with Pittsford Crew, a youth club in Rochester, NY. We're looking at how smaller and less well-funded clubs could host regattas and scrimmages affordably, and I'd be grateful for help with a few questions.
>
> 1. What does sanctioning cost for a small regatta (under 500 competitors) that takes entries through a platform other than RegattaCentral? The 2026 price sheet linked from the sanctioning page didn't open for me.
> 2. What do the compliance records for clubs and athletes involve in practice, and how would a regatta director check membership, waivers and SafeSport status without RegattaCentral?
> 3. Does USRowing offer, or plan to offer, a way for other registration platforms to check membership and waiver status?
>
> We'd love to see more small clubs hosting, and these answers would help us write an accurate guide for them.
>
> Thank you,
> Matt O'Hara
> Pittsford Crew

### Draft: to Streamline Rowing

> **Subject:** Small regattas on Streamline: USRowing sanctioning and CrewTimer
>
> Hello,
>
> I'm a volunteer with Pittsford Crew. We raced at the Head of the Fish, which used Streamline for entries and CrewTimer for timing, and I'm writing a guide to help small clubs host regattas affordably. Two questions:
>
> 1. Have regattas on Streamline been USRowing-sanctioned, and if so, how did they handle the membership and waiver compliance check?
> 2. Can a host export entries (event, crew, bow number, lineup) in a form that fits CrewTimer's configuration spreadsheet?
>
> Thanks for making hosting free. It's exactly what small clubs need.
>
> Matt O'Hara
> Pittsford Crew

### Sources

- CrewTimer documentation and FAQ: github.com/crewtimer/crewtimer-doc (MIT). Repositories: github.com/crewtimer.
- CrewTimer on the App Store and Google Play (free).
- Streamline Rowing, regatta hosting: streamlinerowing.com/regatta-hosting. Regatta listings: streamlinerowing.com/regattas.
- USRowing, Sanction a Regatta: usrowing.org/sanction-a-regatta.
- USRowing's 2026 Membership Program: usrowing.org/news/usrowings-2026-membership-program.
- USRowing policy changes for 2026, and the member organisation certification announcement (usrowing.org/news).
- Regatta Pass prices: Head of the Schuylkill regatta pages on RegattaCentral (two pages give different figures).
- British Rowing Online Entry (BROE2): britishrowing.org.
- U.S. Center for SafeSport, MAAPP communication one-pagers.
- FTC COPPA Rule amendments: Federal Register, 2025-04-22.
- Open-Meteo terms: open-meteo.com/en/terms.
- Netlify pricing changelog, 2026-04-14, plus third-party pricing summaries.
- Stripe support: fee discount for nonprofit organisations (donations only, not registration fees).
- Netlify observability logs for the crewdash site, 2026-10-25 to 2026-10-26.

## Suggested next steps

Research and outreach first, as agreed on 2026-10-26. Nothing gets built until the answers are in.

1. Send the emails above: Entazza (with the CrewTimer partnership idea), a friendly club, USRowing and Streamline.
2. Find one local scrimmage or small regatta willing to try the free stack, with CrewDash for families.
3. Post on Reddit with the demo link and screenshots, and ask what small clubs struggle with.
4. Write the "host a small regatta for free" playbook from the answers.

Done on 2026-10-26: the manifest and icons are static, polling is lighter off race day, logins are rate-limited, the "ET" label uses the club's time zone, race-day weather is cached ahead of page views, iPhones are prompted to install for alerts, other clubs' blades and the whole field are on regatta pages, the public demo is up, and [SETUP.md](SETUP.md) is written. CrewTimer's documented export turned out to lack regatta details and start times, so CrewDash stays on the Firebase feed.

Before the repo goes public: the git-history check described above. The Deploy to Netlify button in the README only works once it's public.

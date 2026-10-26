# Going public: a draft post and what it would take

A first pass at sharing CrewDash beyond Pittsford, written 2026-10-26. It has a draft post, notes on screenshots, privacy and licensing, an honest look at the money, and what replacing CrewTimer or RegattaCentral would really involve. Decisions so far are noted where they were made.

## Status

Updated 2026-10-26. Entazza (CrewTimer) still hasn't replied. OarSpotter declined, so CrewDash keeps drawing only the club's own blade. The licence is settled as AGPL-3.0 (see below). A made-up demo club is built for screenshots and trying the app (`npm run demo`), and phone screenshots from it are in [screenshots/](screenshots/).

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
> 2. Would you run your own copy (it takes a volunteer an hour or so), or would you want someone to host it?
> 3. What's the one thing you wish your regatta tools did that they don't?
>
> Screenshots below use a made-up club.

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

**What a club would need to check.** Whether it has an athlete-data policy (still open for Pittsford). School-affiliated teams may fall under district rules on student data, and FERPA could apply if a school runs the team. COPPA only bites for under-13s, so middle-school programs should be careful. Clubs outside the US would need to think about GDPR. A short "privacy notes for clubs" page in the repo would cover this without us giving legal advice.

**Third-party terms.** Open-Meteo's free tier is for non-commercial use. A volunteer-run, donation-supported copy is very likely fine, but a paid hosted service would need their paid plan. CrewTimer's feed isn't a documented API and Entazza hasn't replied, so other clubs should know it could change or be locked down, and that CrewDash keeps its own copy of every regatta it has fetched. OarSpotter declined, so CrewDash only ever draws the club's own blade.

**If we ever host it for many clubs**, everything changes. We'd need personal accounts, a privacy policy, data processing agreements with clubs, a security and breach process, and probably insurance. That is the point where volunteer-run stops being realistic.

## Open source, donations, or paid

Decided 2026-10-26: open source under AGPL-3.0 (or any later version), with an optional donation link, and no hosted service for now. The licence is in `LICENSE`.

Open source suits this for three reasons. Clubs can see exactly what happens to their athletes' data, which matters more than any privacy promise. Each club hosts its own copy, which keeps the compliance position above. And other parent-developers can contribute sprint support, other timing systems or other countries' formats. A donation link (GitHub Sponsors or Open Collective) can cover your time without creating an obligation to support anyone.

AGPL means any club can use and change CrewDash freely, but anyone who offers it as a hosted service must publish their changes under the same licence. A regatta software company can't quietly fold it into a paid product. MIT would have allowed that.

A paid hosted version is possible later if clubs ask for it and someone wants to run it as a small business. It would need the work in the last privacy paragraph above. As the copyright holder you can still offer it under other terms yourself, as long as outside contributions are covered (a simple contributor agreement, or only accepting contributions under AGPL).

Before the repo goes public it still needs a README written for a club volunteer rather than a developer, setup steps that don't assume a Claude session, a scan of the git history for anything real (the club config is Pittsford's, which is fine, but the history is worth a look), and a decision on whether to keep Pittsford as the example `club.json` or point newcomers at the demo club.

## The money, honestly

The savings story is weaker than it feels, and the post shouldn't promise it.

CrewDash costs a club almost nothing. Netlify's free allowance covers a club's normal traffic, and the scheduled refresh only runs on race weekends. A busy season might reach a paid tier. That should be measured on Netlify's usage page after the next race weekend before quoting any figure.

But CrewDash doesn't replace anything a club currently pays for. Clubs pay regatta entry fees, which the regatta organiser sets. RegattaCentral's charges are folded into those entry fees or charged to the organiser, and card processing (around 3%) costs money whoever does it. CrewTimer is a free app, and whatever it charges goes to the regatta, not the club. I couldn't find CrewTimer's current pricing published anywhere, so I can't say how much a regatta pays for it. The money a club could save is small. The money a regatta organiser could save is real, but only by replacing the systems below.

What CrewDash does save is volunteer time and parent confusion, and it shows how cheaply good software can now be built. That is a more honest and more persuasive pitch.

## What it would really take to replace CrewTimer and RegattaCentral

The short answer is that a club can't leave them on its own. Regattas choose their registration and timing systems, and every club entering that regatta goes along. Replacing them means building for regatta organisers, and convincing them to switch.

The work splits into layers, from easiest to hardest.

**1. Results and the family experience (done).** This is what CrewDash already does, on top of CrewTimer's data. It's the part the incumbents do worst and the part families see.

**2. Head race timing.** CrewTimer's core idea, volunteers at the start and finish tapping phones, is already cheap and clever. A replacement is technically small: a phone app that records bow numbers and timestamps, syncs them, handles disputes and corrections, and publishes results live. The hard parts are reliability with bad cell signal at a riverbank, clock sync between start and finish, and a referee workflow for penalties and protests. Regattas would need to trust it on their biggest day of the year, and that trust takes seasons of use at small regattas.

**3. Sprint timing.** Much harder. Sprint racing needs lane timing and photo finish to settle close races, which means hardware (high frame-rate line-scan or video cameras), precise start signals, and software that referees accept. This is where specialist vendors earn their money, and I wouldn't attempt it early.

**4. Draws, schedules and progressions.** Turning entries into heats, semis and finals, lane draws, schedules with minimum gaps between a rower's races, and handling scratches. It's well-defined logic, but every regatta has its own rules and there are many edge cases. Streamline Rowing already offers this for free to regatta hosts, so that market isn't empty.

**5. Registration and payments.** This is RegattaCentral's real moat. It covers club accounts, entries, lineups, changes up to race day, entry fees with early and late rates, refunds, card processing (Stripe would do), invoicing, waivers, and checking every rower's and coach's USRowing membership and SafeSport status. That last part needs an agreement with USRowing. It also carries the heaviest legal load: payments, tax, refunds and holding thousands of minors' birthdates and membership numbers.

**6. Adoption.** The hardest layer. Every club, coach and regatta already has RegattaCentral accounts and habits. Regattas won't switch mid-season or without a track record, and governing bodies may have arrangements in place. A replacement needs a few friendly regattas willing to run it alongside the old system for a season.

A realistic path, if you wanted one, starts with what CrewDash does well and works down. First, make CrewDash something any club can run (open source, a demo, good setup docs). Then offer it to a few local regattas as their family-facing results app. Then build head race timing for small regattas and scrimmages, where the stakes are low. Registration and sprint timing come last, if at all. Each step is useful by itself, so stopping anywhere still leaves something good.

Steps one and two are volunteer-sized. Step three is a serious side project. Steps four and five are a small company, with real legal and financial obligations.

## Suggested next steps

1. Send Entazza one short follow-up, then post whether or not they reply.
2. Add login rate limiting.
3. Measure Netlify usage after the next race weekend so the cost claim has a real number.
4. Make the repo public when the post gets interest, after the history check above.
5. Post the draft in one or two places with the demo screenshots, and see what people ask for before building more.

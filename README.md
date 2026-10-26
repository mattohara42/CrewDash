# CrewDash

Find your rower. Track your team.

CrewDash shows a rowing club only its own boats and results, pulled from CrewTimer's public results. See [docs/PLAN.md](docs/PLAN.md) for the plan.

**Try it:** [crewdash-demo.netlify.app](https://crewdash-demo.netlify.app) is a demo with a made-up club and made-up results. The password is on its login page.

## Setting up for your club

[docs/SETUP.md](docs/SETUP.md) walks a club volunteer through it, start to finish.

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/mattohara42/CrewDash)

The short version for developers:

A club's name, the crew names it races under, time zone, locale, units, season start and colors are edited by an admin at `/admin/club` and stored in Netlify Blobs. Saving refuses a header too light for white text and chart colors too faint for either theme. `club.json` holds the starting values used until the first save, in the same shape as the settings download, so a fork can commit its own. Check chart colors for colorblind separation before changing them.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Report security problems privately, as described in [SECURITY.md](SECURITY.md).

## Development

Requires Node 22 or later.

```sh
npm install
npm run check   # lint, format check, typecheck and tests
```

## Trying it with a made-up club

`npm run demo` starts CrewDash with a fictional club, its rivals, rowers, venues and three seasons of regattas, all built in memory. Log in with `demo` (or `coach`, or `admin`). Today's regatta follows the clock, so the race-day view always has some results in and more to come. With the demo running, `node scripts/screenshots.mjs` saves phone-sized screenshots. See [docs/GOING_PUBLIC.md](docs/GOING_PUBLIC.md#screenshots).

Never commit real regatta data. It contains rowers' names, most of them minors. Tests use the made-up fixture in `test/fixtures/`. The `data/` folder is ignored by git for local experiments.

## Licence

CrewDash is free software under the [GNU Affero General Public License v3.0](LICENSE) or any later version. Any club can use and change it. Anyone who runs a changed copy as a service for others must share their changes under the same licence.

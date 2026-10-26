# CrewDash

Find your rower. Track your team.

CrewDash shows a rowing club only its own boats and results, pulled from CrewTimer's public results. See [docs/PLAN.md](docs/PLAN.md) for the plan.

## Setting up for your club

Edit `club.json`: set the club's name and every crew name it appears under in CrewTimer results.

Set `colors` in `club.json` too. `primary` is the header background behind white text, so it must be dark. `secondary` and `accent` are the two stripes under the header. `chart` holds bar and dot colors for light and dark themes, with a paler `muted` shade for last year in year-over-year charts. `npm run check` tests that the header text and chart marks keep enough contrast. Check chart colors for colorblind separation before changing them.

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

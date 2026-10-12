# CrewDash

Find your rower. Track your team.

CrewDash shows a rowing club only its own boats and results, pulled from CrewTimer's public results. See [docs/PLAN.md](docs/PLAN.md) for the plan.

## Setting up for your club

Edit `club.json`: set the club's name and every crew name it appears under in CrewTimer results.

## Development

Requires Node 22 or later.

```sh
npm install
npm run check   # lint, format check, typecheck and tests
```

Never commit real regatta data. It contains rowers' names, most of them minors. Tests use the made-up fixture in `test/fixtures/`. The `data/` folder is ignored by git for local experiments.

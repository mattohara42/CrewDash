# Contributing to CrewDash

Thanks for helping. CrewDash is built by volunteers for rowing clubs, so small, focused changes are the easiest to take.

## Before you start

- Read [docs/HANDOFF.md](docs/HANDOFF.md) for how things work and why, and [docs/ROADMAP.md](docs/ROADMAP.md) for what's planned.
- Open an issue before a large change, so we can agree the approach first.
- Run `npm run check` before opening a pull request. It runs the linter, formatting, type checks, tests and the build.

## Rules that keep clubs safe

- **Never commit real regatta data or real rower names.** Most rowers are minors. Tests use the made-up fixtures in `test/fixtures/`, and the demo uses the made-up club in `src/demo/`.
- **Keep code club-neutral.** Anything about one club belongs in the admin settings (club settings live at `/admin/club`), never in the code or in the upstream `club.json`, which stays a neutral example.
- **Don't scrape** RegattaCentral or any site whose terms don't allow it.

## Licence of contributions

CrewDash is licensed under the [GNU AGPL v3.0 or later](LICENSE). By submitting a contribution, you agree that:

1. it is your own work, or you have the right to submit it, and
2. it may be distributed under the AGPL v3.0 or later, and that the project maintainer may also license it under other open-source licences, for example so these features can be offered to a timing provider such as CrewTimer.

If you can't agree to the second point, say so in your pull request and we'll talk.

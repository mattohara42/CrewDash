# CrewDash notes for Claude

Start with `docs/HANDOFF.md` for current status, decisions and open items, then `docs/PLAN.md`, then `docs/ROADMAP.md` for what's next.

- Never commit real regatta data or real rower names. Tests use made-up fixtures only.
- Keep code club-neutral. Club-specific settings are edited in Admin (`/admin/club`) and stored in Netlify Blobs. `club.json` is only a neutral example of starting values, so never put a real club's settings in it.
- Run `npm run check` before pushing.
- The repo owner wants PRs merged automatically once CI is green.
- Don't deploy to Netlify after every merge. Deploys use Netlify credits. Batch changes and ask the repo owner before deploying.

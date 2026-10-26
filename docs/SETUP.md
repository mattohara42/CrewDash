# Setting up CrewDash for your club

This guide is for a club volunteer, not a developer. If you've used GitHub before, expect 30 to 60 minutes. If you haven't, allow an evening and ask someone who has to sit with you for the first part.

To see what you're setting up first, try the demo (a made-up club with made-up results). Its link is in the README.

## What you need

- A free GitHub account (github.com).
- A free Netlify account (netlify.com). Sign up with your GitHub account, which saves a step later.
- Your club's exact name as it appears in CrewTimer results. Open a recent CrewTimer results page your club raced in and search for your club. Note every spelling it uses, such as "Riverside Rowing Club" and "Riverside Rowing Club - EXH".
- Your club's colors as hex codes (like `#14402f`). A website color picker or your club's style guide will have them.

## 1. Make your own copy and put it online

The way that keeps updates easy:

1. On GitHub, open the CrewDash repository and click **Fork**. This makes your own copy that can pull in improvements later.
2. In Netlify, choose **Add new project**, then **Import an existing project**, and pick your fork. Leave the build settings as they are.
3. Give the site a name, such as `riverside-crewdash`. It becomes `riverside-crewdash.netlify.app`.
4. Under **Project configuration**, then **Environment variables**, add the four settings below, then deploy.

The **Deploy to Netlify** button in the README is quicker and asks for the same settings, but it makes a standalone copy rather than a fork, so getting updates later means copying changes by hand. It's fine for trying CrewDash out.

| Setting          | What to enter                                                                                                                                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLUB_PASSWORD`  | The password families use. Long and not used anywhere else. Invite links mean most people never type it.                                                                                                        |
| `ADMIN_PASSWORD` | For whoever adds regattas and edits venues. Keep it to one or two people.                                                                                                                                       |
| `COACH_PASSWORD` | Optional. For coaches to post announcements, notes and lineups.                                                                                                                                                 |
| `SESSION_SECRET` | A long random string, at least 32 characters. A password manager can make one. Nobody types it. Changing it later logs everyone out and cancels every invite link, which is your emergency "lock everyone out". |

## 2. Tell CrewDash who you are

In your GitHub copy, open `club.json`, click the pencil icon to edit it, and change:

```json
{
  "name": "Riverside Rowing Club",
  "aliases": ["Riverside Rowing Club", "Riverside Rowing Club - EXH"],
  "timezone": "America/Chicago",
  "units": "imperial",
  "colors": {
    "primary": "#14402f",
    "secondary": "#2e8b57",
    "accent": "#f2c14e"
  }
}
```

- `aliases`: every crew name from your CrewTimer search. Boat letters like "(A)" and "(B)" are handled for you.
- `timezone`: your time zone, written like `America/New_York`, `America/Los_Angeles` or `Europe/London`. It sets "today" and every time shown.
- `units`: `imperial` (mph and °F) or `metric` (km/h and °C), for the weather.
- `colors`: `primary` is the header behind white text, so it must be dark. `secondary` and `accent` are the two stripes under it, and your blade.

Commit the change. Netlify rebuilds the site by itself in a minute or two. If a value is malformed, like a color that isn't a six-digit hex code or a misspelled time zone, the build stops and Netlify's deploy log says which. Pick a `primary` dark enough for white text to read easily.

## 3. Add your first regatta

Open your site, log in with the admin password and go to **Admin**. Paste a CrewTimer results link, such as `https://www.crewtimer.com/regatta/r16329`, and add it. Your boats appear on the home page.

Then, in Admin:

- Give each regatta a **series** name so year-over-year comparison works. CrewDash suggests one by dropping the year from the title.
- Add **venues** (parking, viewing spots, course length) and link each series to one. Families like this more than anything.
- Write **club tips** for the Rowing 101 page: where your tent is, how food works, who to ask.
- Set **other clubs' blades** for the clubs you race most.

After each race weekend, add that weekend's regattas the same way. On race weekends CrewDash checks for new results every 5 minutes and sends alerts by itself.

## 4. Invite families

Log in, open the settings menu and choose **Invite a parent**. Share the link in your club's group chat, or show the QR code at a parents' meeting. It logs people straight in without the password, and expires after 14 days.

On iPhones, alerts only work after adding CrewDash to the Home Screen. The home page tells iPhone users how.

## What it costs

On Netlify's free plan (300 credits a month), a club our size has used about one credit of compute on a busy race day. The scheduled refresh only runs on race weekends. Each time the site rebuilds, which happens when you edit `club.json` or pull in an update, costs about 15 credits. So edit in batches.

## Privacy

Most rowers are minors. Their results are public on CrewTimer, but CrewDash gathers them by club and by rower, so:

- Keep the site behind its password. Never share the admin password widely.
- Check whether your club has a policy on publishing athlete information, and follow it.
- School-run teams may have district rules about student data.
- Each club runs its own copy, so nobody else, including the people who wrote CrewDash, can see your club's data.

## Getting updates

If you forked, GitHub shows "This branch is behind" on your copy when CrewDash improves. Click **Sync fork** to pull in the changes, and Netlify rebuilds. Everything you entered in Admin is kept, because it lives in Netlify, not in GitHub. If GitHub reports a conflict in `club.json`, keep your version.

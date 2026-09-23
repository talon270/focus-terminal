# focus terminal

A single-file attention trainer: four timed drills, a paced breathing guide, a
noise generator and a short task list. The page never makes a network request.
Everything is stored in this browser's `localStorage`, and nothing leaves the
device.

## Run it

Open `index.html`. It runs from `file://` with no build step and no install.
There's also a hosted copy at <https://talon270.github.io/focus-terminal/>.

## What's in it

| Section | What it does | What's saved |
|---|---|---|
| reaction | 5 trials: click when the panel turns white. Clicking early voids that trial | Best average, in ms |
| schulte table | Find 1 → 25 while keeping your eyes on the centre cell | Best score: seconds + 1 per miss |
| 2-back | 24 letters. Respond when a letter matches the one two back | Best score: hit % − false-alarm % |
| digit span | Digits flash one at a time. Type them back; each success adds one | Longest length recalled |
| breathe | Box, 4-7-8, coherent and 4-6 patterns | 4 completed cycles count as a session |
| sound | White, pink, brown and filtered "rain" noise, generated with Web Audio | Nothing |
| tasks | A list of next actions | The list |
| stats | Streak, best streak, sessions, a 21-day chart, personal bests | — |

Keys: `1`–`5` switch sections, `space` responds in a drill, `b` starts or
pauses breathing, `s` stops sound, `f` toggles fullscreen, `?` shows the key
sheet, `esc` backs out of a drill. Shortcuts that use ctrl, alt or cmd are left
to the browser.

## The things most trainers like this get wrong

**A score you can get by doing nothing is not a score.** Scoring 2-back as
(hits + correct rejections) / total gives a median **71%** to someone who never
presses anything, because about 70% of the letters aren't matches. In a
20,000-run simulation, the 10th–90th percentile was 58–83%. The score here is
hit rate minus false-alarm rate, so never pressing and always pressing both
score 0.

**Digit span is the longest length you recalled, not the one you failed.** If
you fail at 5 digits, your span is 4. Failing the very first 3-digit sequence
records nothing, because 3 is the starting length and you never recalled it.

**A streak shows 0 as soon as it's broken.** The stored streak only updates when
you log a session, so the number on screen is recomputed from the last active
day. If that day was before yesterday, the display is 0. Today's count resets
at midnight even if you never touch the page.

**The Schulte clock starts when the numbers appear.** Before you press start,
the grid is blank so you can't pre-scan it, and the search for "1" is timed
like the other 24. Misses add a second each. The best score is labelled with
that penalty, and the finish message shows the raw time separately.

**Looped noise has to join at the seam.** Each noise track loops a 4-second
buffer. Brown noise is a random walk, so the buffer ends somewhere other than
where it started. The measured jump at the loop point was 4.8× the average
step between samples. A linear tilt across the buffer now makes the two ends
meet.

## Data and privacy

- **Storage:** one `localStorage` key, `focus_terminal_v1`, with a schema
  version (currently 2).
- **Upgrade from v1:** the 2-back best is dropped, because it was on the old
  71%-for-nothing scale. The digit-span best loses one, which is exact, since v1
  always saved the failed length.
- **Corrupt save:** the footer says `corrupt save, not overwriting` and the
  page never writes over the damaged data. "Erase all saved data" (two clicks,
  no dialog) is the way out.
- **Browser only:** it's all in this browser, and clearing site data erases it.
  Take a backup if you care about the history.

## Backup, restore and export

All three are at the bottom of **stats**.

| Button | What you get |
|---|---|
| export backup (.json) | Everything (days, streaks, bests, tasks) as `focus-terminal-backup-YYYY-MM-DD.json` |
| restore backup | Replaces what's here with a backup file. An **undo** link stays up until you leave the page |
| export sessions (.csv) | `date,sessions`, one row per active day, for a spreadsheet |

**A restore file is treated as untrusted.** Every field is rebuilt from known
keys and types. Dates must look like dates, bests must be numbers for drills
that exist, and tasks must be non-empty strings of at most 140 characters.
Anything else is dropped, not guessed at. A file that isn't valid JSON, isn't
a focus terminal backup, or comes from a newer schema version is refused with
an inline message, and nothing changes.

**Restoring a v1 backup applies the v1 → v2 migration.** You get the same
result as if the save had been upgraded in place.

**When the save is corrupt, "export backup" downloads the damaged original as
text instead.** At that point the page's own data is blank, so the untouched
original is the only thing worth keeping. Restoring a backup then replaces the
corrupt save and turns storage back on.

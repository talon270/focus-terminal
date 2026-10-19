# focus terminal

An attention trainer in one page: four timed drills, a paced breathing guide, a
noise generator and a short task list. The page never makes a network request.
Everything is stored in this browser's `localStorage`, and nothing leaves the
device.

## Run it

Open `index.html`. It runs from `file://` with no build step and no install.
There's also a hosted copy at <https://talon270.github.io/focus-terminal/>.
Once that copy has loaded online, it opens without a network, and you can
install it on a phone. `sw.js`, `manifest.webmanifest` and the two icons exist
only for the hosted copy. A local file doesn't need them.

## What's in it

| Section | What it does | What's saved |
|---|---|---|
| reaction | 5 trials. Press the mouse or space the moment the panel flips. A press before the flip voids the trial | Every run's average in ms, and the best |
| schulte table | Find 1 → 25 while keeping your eyes on the centre cell | Every run's score (seconds + 1 per miss), and the best |
| 2-back | 24 letters, exactly 7 of them matches. Respond when a letter matches the one two back | Every run's score (hit % − false-alarm %), and the best |
| digit span | Digits flash one at a time. Type them back; each success adds one | Every run's longest recalled length, and the best |
| breathe | Box, 4-7-8, coherent and 4-6 patterns | 4 completed cycles count as a session |
| sound | White, pink, brown and filtered "rain" noise, generated with Web Audio, all at the same loudness | Nothing |
| tasks | A list of next actions | The list |
| stats | Streak, best streak, sessions, a 21-day chart, and per drill: run count, trend and best | — |

Keys: `1`–`5` switch sections. `space` responds in reaction and 2-back, and
starts the next round in schulte and digit span. `b` starts or pauses
breathing, `s` stops sound, `f` toggles fullscreen, `?` shows the key sheet,
and `esc` backs out of a drill. Shortcuts that use ctrl, alt or cmd are left to
the browser.

The theme is dark by default. The `theme` switch in the footer cycles through
dark, light and system. It is a preference for this browser only, so it isn't
part of a backup.

## The things most trainers like this get wrong

**A score you can get by doing nothing is not a score.** Scoring 2-back as
(hits + correct rejections) / total gives a median **71%** to someone who never
presses anything, because about 70% of the letters aren't matches. In a
20,000-run simulation, the 10th–90th percentile was 58–83%. The score here is
hit rate minus false-alarm rate, so never pressing and always pressing both
score 0.

**A session you can log by doing nothing is not a session either.** Before
this rule, two runs counted toward the streak with no effort at all. Pressing
enter on an empty digit-span answer took about 3 seconds, and a 2-back with no
presses scored 0 but still counted. Now a 2-back with no responses isn't
recorded, and a digit-span run only counts once you recall a sequence.
Breathing still counts four cycles whether you watched them or not. A pacing
guide can't tell the difference.

**Reaction time is measured at the press, not the release.** A browser `click`
fires when you let go. Timed that way, a 145 ms reaction held for 150 ms scored
300 ms. A press made 3 seconds before the signal was accepted as 318 ms
because the release came after the signal. The panel now listens for the press
itself, so an early press voids the trial, as the instructions say.

**A personal best improves even when you don't.** A best is your single
luckiest run, and the best of more noisy runs keeps getting lower. Suppose
every trial is drawn around 280 ms with a 40 ms spread (an assumption), and
there is no real change at all. The expected best is then 252 ms after 10 runs
and 243 ms after 30. That is 37 ms of "progress" from noise alone. So stats also
shows a **trend**: the median of your first five runs against your last five.
It needs ten runs, and until then it says how many more it needs. A median of
five ignores a single fluke.

**Every 2-back run has the same number of targets.** With a 30% chance per
letter, the 22 scorable letters held anywhere from 4 to 10 targets (10th–90th
percentile), and 12% of runs had 4 or fewer. In those runs one missed letter
cost 25 points or more. Exactly 7 targets makes two runs comparable.

**Digit span is the longest length you recalled, not the one you failed.** If
you fail at 5 digits, your span is 4. Each success is saved the moment it
happens, so leaving after recalling 5 digits keeps the 5. Failing the very
first 3-digit sequence records nothing, because 3 is the starting length and
you never recalled it.

**A streak shows 0 as soon as it's broken.** The streak and the totals are
counted from the per-day record every time they're shown, never stored on
their own. The current streak counts back from today, or from yesterday while
today is still empty. Today's count resets at midnight even if you never touch
the page.

**The Schulte clock starts when the numbers appear.** Before you press start,
the grid is blank so you can't pre-scan it, and the search for "1" is timed
like the other 24. Misses add a second each. The best score is labelled with
that penalty, and the finish message shows the raw time separately.

**Noise tracks are matched for loudness.** Left raw and measured above 20 Hz,
white noise was 11.4 dB louder than rain, 10.2 dB louder than pink and 9.1 dB
louder than brown at the same volume setting. Every buffer is now scaled to the
level rain already had, the quietest, so switching tracks never makes the sound
louder than it was. The four tracks now sit within 0.8 dB of each other. The
level is measured before the seam fix below is applied. That fix adds a
0.25 Hz ramp you can't hear, and counting the ramp made the level swing by
about 2 dB from one buffer to the next.

**Looped noise has to join at the seam.** Each noise track loops a 4-second
buffer. Brown noise is a random walk, so the buffer ends somewhere other than
where it started. The measured jump at the loop point was 4.8× the average
step between samples. A linear tilt across the buffer now makes the two ends
meet.

**The drills train the drills.** You will get better at each one. Studies of
brain training find that the gains mostly stay with the task practised, so the
page calls them a warm-up, not a cure.

## Data and privacy

- **Storage:** one `localStorage` key, `focus_terminal_v1`, with a schema
  version (currently 3). The theme lives under its own key,
  `focus_terminal_ui`.
- **Upgrade from v1:** the 2-back best is dropped, because it was on the old
  71%-for-nothing scale. The digit-span best loses one, which is exact, since v1
  always saved the failed length.
- **Upgrade from v2:** the reaction best is dropped. Every old reaction score
  included however long the button was held, and that was a different amount
  each run. The stored streak, best streak and session count are dropped too,
  because they are now counted from the per-day record, which is kept. Run
  history starts empty.
- **Two tabs:** when another tab saves, this tab reloads that save, so neither
  can erase what the other logged.
- **A save the page can't use:** the save might be unreadable, have the wrong
  shape, or come from a newer version. In every case the page never writes over
  it, and a banner under the title says so: nothing you do is being saved until
  you restore a backup or erase. A browser that refuses to save at all, such as
  a private window, gets the same banner.
- **Browser only:** it's all in this browser, and clearing site data erases it.
  Take a backup if you care about the history.
- **Old copies of this page:** pages from the same folder opened as files share
  one storage in Chromium. The timestamped `*.backup-*.html` copies each use
  their own key, `focus_terminal_v1_backup`, so opening one can't write
  old-scale scores into your live save.

## Backup, restore and export

All three are at the bottom of **stats**.

| Button | What you get |
|---|---|
| export backup (.json) | Everything (days, runs, bests, tasks) as `focus-terminal-backup-YYYY-MM-DD.json` |
| restore backup | Replaces what's here with a backup file. An **undo** link stays up until you leave the page |
| export sessions (.csv) | `date,sessions`, one row per active day, for a spreadsheet |

**A restore file is treated as untrusted, and so is the save itself.** Every
field is rebuilt from known keys and types, by the same check whether the data
comes from a file or from storage at startup. Dates must look like dates. Bests
and runs must be numbers for drills that exist. Tasks must be non-empty strings
of at most 140 characters. Anything else is dropped, not guessed at. If a file
isn't valid JSON, isn't a focus terminal backup, or comes from a newer schema
version, the page refuses it with an inline message and nothing changes.

**Restoring an older backup applies the same migrations.** You get the same
result as if the save had been upgraded in place.

**When the save can't be used, "export backup" downloads the untouched
original as text instead.** At that point the page's own data is blank, so the
original is the only thing worth keeping. Restoring a backup then replaces it
and turns storage back on.

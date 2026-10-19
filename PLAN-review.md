# Focus terminal — review and plan

Written 2026-10-11, against `index.html` at commit `5a4add8` (1888 lines).

Method: a line-level read of all of `index.html`, then every finding marked
**reproduced** was run in headless Chromium (Playwright 1.63). Each test used
a fresh profile and real clicks and key presses. Timings came from observers
on the page, not from Playwright's own clock. Two findings are **simulations**,
and their assumptions are given where the numbers appear. Findings marked
**read** follow from deterministic code and were not run. One is
**unconfirmed**. A fresh profile and a seeded v1 save both load with zero
console errors.

**Implemented 2026-10-11.** Part C lists what changed from the plan and how it was verified.

---

## Part A — findings, ranked

### A1 · BUG (high): a second open tab silently erases sessions logged in the first

Each tab reads `Store` once at boot (`index.html:812`). After that,
`Store.save()` writes the whole in-memory copy back. Nothing listens for
another tab's writes, so whichever tab saves last wins.

**Reproduced:** tab A finishes a drill, and storage reads `sessions: 1`. Tab B,
opened before that, adds a task, and storage reads `sessions: 0`. Tab A reloads
and shows `today 0`. Any save in B erases it, whether a task, a personal best
or a restore. Having the page open twice, one tab on sound and one on drills,
is the ordinary way this happens.

**Fix:** listen for the `storage` event. When `KEY` changes, reload `Store`'s
data and call `renderAll()`. That is about six lines. It is smaller than
turning every mutation into a read-modify-write, and the browser fires the
event exactly when the other tab writes.

### A2 · BUG (high): reaction time is measured when you let go, not when you press

`stage.addEventListener("click", hit)` (`index.html:1083`). A `click` fires on
release, so the score includes how long the button was held down. A press that
starts before the signal also counts, as long as it ends after the signal.

**Reproduced.** Timestamps come from observers on the panel's class and on
`pointerdown`:

| What the hand did | True reaction | Scored |
|---|---|---|
| Pressed 64 ms after the signal, released at once | 64 ms | 70 ms |
| Pressed 145 ms after the signal, held 150 ms | 145 ms | 300 ms |
| Pressed 2993 ms **before** the signal, released after it | early, so it should void | 318 ms, accepted |

`space` is read on `keydown`, so keyboard and mouse scores are on different
scales, yet they share one personal best.

**Fix:** change `"click"` to `"pointerdown"`. That one word covers mouse,
touch and pen. An early press then lands in the `waiting` state and voids the
trial, as the blurb promises. **This needs a migration.** Every stored reaction
best includes an unknown hold time, so v3 drops `best.reaction`. That is the
same reasoning v2 used for the old 2-back scale.

### A3 · BUG (medium): opening the v1 backup page writes old-scale scores into the live save

Chromium gives every `file://` page one localStorage origin, and
`focus-terminal.backup-20260923-082750.html` uses the same key,
`focus_terminal_v1`. Its loader keeps whatever `v` it finds. So it writes
v1-scale scores under a `v: 2` label, and the migration never runs on them.

**Reproduced:** the live save starts with a 2-back best of 40. In the backup
page, a 2-back run with no presses scores 71 on v1's scale. `index.html` then
shows `best 71 %`, and the save still says `v: 2`. On the current scale, 71 is
a strong run, earned by doing nothing.

**Fix:** in the backup file, change `KEY` to `focus_terminal_v1_backup`. It is
one line, and the backup still opens for comparison. The other backup,
`index.backup-20260923-083457.html`, is byte-identical to commit `1e4031e`, so
git already holds it.

**The mechanism isn't specific to this app.** Any single-file app whose
timestamped backup HTML keeps the live storage key probably has the same
problem. Bob the Builder's backups are the obvious case. That project was
not checked here.

### A4 · BUG (medium): digit span forgets what you recalled unless the run ends in a failure

`recordBest` and `logSession` run only in the failure branch of `check()`
(`index.html:1368–1382`).

**Reproduced:** recall 3, 4 and 5 digits, then press "back to drills". The
stored span best is empty, and the header reads `today 0`.

**Fix:** on each success, call `recordBest(self.id, len, false)` before
`len++`. Log the session on the first success of a run. The failure branch
only shows the message. The calls are the same, just moved, and this also
closes half of A6.

### A5 · BUG (medium, unconfirmed on iOS): digit span has no button to submit an answer

The only way to submit is `Enter` in the field (`index.html:1386`). On iPhone,
`inputmode="numeric"` opens a number pad with no return key, so the drill
can't be finished there. **Unconfirmed:** there is no iOS device here. The
missing control itself is confirmed by reading the markup.

There is a smaller keyboard gap too (**read**, not run). After an answer, focus
drops to the page, and no key starts the next sequence. The key sheet says
`space` starts the current drill, but `spanDrill` has no `space()` method.

**Fix:** put a "check" button beside the field. Add a `space()` method that
presses start/continue when that button is enabled.

### A6 · DESIGN RISK (medium): the streak can be earned by doing nothing

The README's first rule is that a score you can get by doing nothing is not a
score. The drill scores follow that rule. The streak doesn't.

**Reproduced:**
- Digit span: press start, then `Enter` on an empty field. `today` goes from
  0 to 1 in about 3 seconds.
- 2-back with no presses: `today` goes from 1 to 2, with a score of 0.

**Fix:** A4's change stops digit span from logging a run with no success. In
2-back, call `logSession()` only when `hits + falseAlarms > 0`. Breathing still
logs four cycles whether or not anyone watched. A pacing guide can't tell the
difference, so leave it as it is.

### A7 · DESIGN RISK (medium): an unwritable save is announced in 11 px grey, off-screen

`renderStorageFlag()` (`index.html:880`) puts `corrupt save, not overwriting`
or `unavailable` into the footer, at 11 px in `rgb(106,106,106)`.

**Reproduced:** with a corrupt save, the warning sits at y = 1018 in a 1080 px
window. It is below the fold at both 1366×768 and 1440×900, on both the drills
view and the stats view. In a private window, `unavailable` means every session
disappears when the tab closes, and that footer is the only notice.

**Fix:** add a banner under the top bar and toggle it from
`renderStorageFlag()`. That function already runs on load, on restore, and when
a quota error turns storage off mid-session. It is one element and one line of
logic.

### A8 · INCONSISTENCY (medium): loading a save skips the checks that restoring one gets

Restore passes the file through `cleanBackup()`. Boot runs
`Object.assign(DEFAULTS(), parsed)` (`index.html:835`) and trusts the rest.

**Reproduced:**
- On load, a `v: 3` save is rewritten as `v: 2`. The same file through restore
  is refused as "from a newer version".
- `"days": null` throws `Cannot read properties of null (reading '2026-10-11')`
  at boot. No drills render, and the page stays dead until someone clears
  storage by hand.

**Fix:** pass the loaded object through `cleanBackup()`. Treat a refusal like a
corrupt save: keep the original and never overwrite it. That leaves one
validator for both paths. `cleanBackup` reads `DRILLS`, so `Store.load()` has
to move out of the IIFE and run at boot.

### A9 · INCONSISTENCY (medium): the copy promises transfer that the drills don't deliver

The drills page says "these train different parts of attention… reaction trains
alertness, schulte trains visual search" (`index.html:592`). Practice reliably
improves the task you practise. The evidence that the gain carries over to
other work is weak: Simons et al. 2016, *Do "Brain-Training" Programs Work?*
(cited from memory, not re-checked this session). The note "4-7-8 — strongest
downshift" (`index.html:1422`) has a similar problem: I know of no comparison
that ranks it first.

**Fix:** edit the copy to say what is measured. For example: "you will get
better at these drills. whether that reaches your work is unproven. use them as
a warm-up." It is the same move as calling a rank "conditioning, not strength".

### A10 · MODEL GAP (medium): 2-back scores swing with how many targets a run happens to get

`makeSeq()` (`index.html:1207`) gives each letter an independent ~30% chance
of being a target.

**Simulation:** 100,000 sequences from a copy of `makeSeq`. Among the 22
scorable letters, the 10th–90th percentile was 4–10 targets, and the full range
was 0–16. 12% of runs have 4 targets or fewer, so one missed letter costs at
least 25 points. Two runs at the same skill aren't comparable, and the best
score partly rewards a lucky sequence.

**Fix:** place exactly 7 targets at shuffled positions among the 22, and draw
the other letters so they can't match by accident. The score formula stays the
same, so no migration is needed.

### A11 · MODEL GAP (medium): "personal best" improves when nothing improves

Best-of-N is the only progress figure in the app, and best-of-N falls as N
grows, from noise alone.

**Simulation:** each trial is drawn around 280 ms with an **assumed** SD of
40 ms, five trials per run, and zero real change. The expected best is 280 ms
after 1 run, 252 ms after 10, 243 ms after 30 and 235 ms after 100. That is
37 ms of "progress" by the 30th run. The SD is a guess. The direction of the
effect is not.

**Fix:** Part B, step 4. Store each run, and show the recent median against the
early median, with n.

### Low

| # | Label | Finding | Evidence | Fix |
|---|---|---|---|---|
| A12 | DESIGN RISK (low) | At the same volume, switching tracks jumps up to 11 dB. Audible RMS vs white: pink −10.2, brown −9.1, rain −11.4 dB. Going from brown to white is almost 3× the amplitude, which contradicts the blurb's "start quiet". *Corrected 2026-10-11: the first numbers here (−7.1, −9.1, −9.3) also counted the inaudible 0.25 Hz ramp left by the seam fix, which varies from buffer to buffer* | **Reproduced**, rendered offline through the app's own `noiseBuffer()`, high-passed at 20 Hz, mean of 8 renders (SD ≤ 0.12 dB). Rain was measured with its filter fixed at 1800 Hz and no drift | Scale each buffer to one target RMS at the end of `noiseBuffer()`, plus a fixed makeup gain for rain |
| A13 | BUG (low) | After a resume, the breathing label stays "paused" until the phase changes, which takes up to 8 s on 4-7-8 | **Reproduced**: still "paused" 0.8 s after resume | In `breathToggle()`'s resume path, set `#b-phase` to `PHASE_NAMES[bPhase]` (one line) |
| A14 | INCONSISTENCY (low) | The footer says "offline capable" (`index.html:729`), but the hosted copy has no service worker, so it won't open offline | **Reproduced**: hosted page 200, `/sw.js` 404 | Add `sw.js` and a manifest from `Helth/`, registered only on `http(s)` |
| A15 | COSMETIC (low) | Hint text in `--rule-2` (#2b2b2b) has 1.5:1 contrast on black: key hints, drill numbers, chart dates, table headers, the task delete ×. `--muted` text is 3.9:1 at 11–12.5 px. The WCAG minimum for text is 4.5:1 | Computed from the tokens | Split `--rule-2` into a border token and a text token of at least #767676 |
| A16 | COSMETIC (low) | The Schulte toast reads "23.4 s (21.4 s + 2 per miss)" | **Read**, `index.html:1158` | Change it to "… + 2 s for 2 misses" |
| A17 | INCONSISTENCY (low, house style) | The page is dark only, and `skills.md` says both themes, always | **Read**: no `prefers-color-scheme` rule | Your call: the CRT look may be the point |

Layout was checked and is fine. At 1920×1080 the shell is centred, with no
empty space stranded on one side. At 390 px wide nothing overflows sideways.

---

## Part B — the build

Each step can ship on its own and is verified with the same scripts that
reproduced its findings.

1. **Data safety, no schema change.** A1 (storage listener), A8 (one validator,
   load moved to boot) and A7 (banner). Verify with the two-tab script, the
   `days: null` seed, the `v: 3` seed, and the corrupt-save banner at 1366×768.
2. **Scores that measure the right thing → schema v3.** A2 (`pointerdown`), A4
   (span records on success), A6 (no session for a 2-back with zero
   responses), and A5 (check button plus `space`). The v3 migration drops
   `best.reaction`. Verify by re-running the reaction timing table and
   expecting the 150 ms hold to score about 145 and the early press to void.
3. **Small fixes.** A10 (fixed 2-back targets), A12 (loudness), A13 (breathing
   label) and A16 (toast). Verify by re-running the target-count simulation
   (expect exactly 7 targets every time) and the loudness render (expect all
   four tracks within 1 dB).
4. **Run history → schema v4.** Store
   `runs: [{d:"2026-10-11", id:"reaction", v:243}]`. Stats shows, per drill,
   the median of the last 5 runs against the first 5, the run count, and the
   best beside them. In the same change, derive `streak`, `bestStreak`,
   `sessions` and `lastDay` from `days` instead of storing them. That removes
   four fields that can disagree with the day map, and it deletes
   `liveStreak()`'s workaround. Restore currently accepts `streak: 999` with no
   active days (**read**). Size: about 40 bytes per run, so 10 runs a day comes
   to about 146 KB a year, well inside localStorage's limit.
5. **Copy pass.** A9.
6. **Offline for real.** A14. After this the project is a folder, not a single
   file.
7. **Contrast tokens.** A15. Add a light theme only if you want one (A17).

### Ask first

- **A focus block timer tied to a task.** This is the largest product gap. The
  tasks view says "what this session is for", but nothing times the session
  itself. A 25- or 50-minute block against the top unfinished task, logging
  focus minutes per day, would make the stats measure the work and not only
  the warm-up. It changes what the app is, so it needs your decision.
- **Remember volume and last track.** Trivial. Store them under a `prefs` key.
- **Adaptive N.** Once the 2-back median over 5 runs passes about 80, the drill
  stops being hard. This needs step 4's history first.

## Out of scope

- **Accounts, sync, a backend.** They don't fit the house style, and A1's
  listener already covers several tabs on one machine.
- **More drills.** Four drills with honest scoring beat eight with noisy ones.
- **A framework or build step.**

---

## Part C — implementation record (2026-10-11)

Backup taken first: `index.backup-20261011-194015.html`.

### What differs from Part B

| Plan said | Done instead | Why |
|---|---|---|
| Two schema bumps, v3 (drop reaction best) then v4 (run history) | One bump to v3, doing both | Both shipped in the same change, so one migration step is the smaller correct one |
| Change `KEY` in the v1 backup only | Changed it in all three backup pages | Fix the class, not the instance. A v2 backup page relabels a v3 save as v2 when it loads, and the next load of `index.html` would then drop the new reaction best |
| Loudness target: brown's old level, rain makeup 1.29 | Target is rain's old level, makeup 1.15 | The first measurement counted the inaudible seam-tilt ramp (see A12). Measured above 20 Hz, rain was the quietest track and its filter costs 1.2 dB, not 2.2 |
| `space` starts the round in every drill | Starts schulte and digit span. In reaction it arms and responds. In 2-back it only responds | In 2-back, a late press just after the 24th letter would start a new 62 s run. The key sheet says exactly this |
| Light theme "your call" (A17) | Built. Dark stays the default; the footer `theme` switch cycles dark, light, system | Nothing changes for you unless you click it. It's stored in its own key, `focus_terminal_ui`, so it isn't in backups |

### Found during implementation

**A18 · BUG (medium): the keyboard focus ring never showed.**
`:focus-visible{outline…}` and `.btn{all:unset}` have equal specificity, and
`.btn` comes later, so `all:unset` erased the outline on every button, rail
item, drill, cell, track and pattern. **Reproduced:** after Tab, the first rail
item reported `outline-style: none`. **Fix:** `html :focus-visible`, which wins
on specificity. After the fix it reports `solid 2px`.

### Verification

The same harness (`verify3.py`: real clicks and keys, fresh profile per check)
ran against `git HEAD` and against the new file. It was run by the test-runner
agent.

| | Before | After |
|---|---|---|
| Checks passed | 11 / 42 | 43 / 43 (adds C18b, served over http) |
| Reaction, 150 ms hold | true 266 ms, scored 421 | true 183 ms, scored 184 |
| Press before the signal | scored as a reaction | "too early" |
| Two tabs, A's session after B adds a task | lost (`today 0`) | kept (`today 1`) |
| Span: recall 3, 4, 5 then quit | no best, `today 0` | best 5, `today 1` |
| Empty span answer / silent 2-back | +1 session each | nothing logged |
| Corrupt save at 1366×768 | 11 px grey footer, off-screen | banner under the title |
| `v: 99` save on load | rewritten as `v: 2` | kept, banner names the version |
| `days: null` save | page dead, 0 drills | boots, banner, 4 drills |
| Audible loudness vs white | pink −10.2, brown −9.2, rain −11.4 dB | −0.8, +0.1, −0.7 dB |
| 2-back targets, 15 runs | 4–10 | 7 every time |
| Dim text contrast, dark / light | 1.48:1 / no light theme | 4.89:1 / 5.24:1 |
| Offline over http | no worker | worker ready, reopens with network off |

Some before-failures follow from other checks rather than standing alone. C4c
failed because C4a/C4b had already logged two empty sessions. C13, C14a and
C14b fail on v3 data that the old page can't read. The other before-failures
are the findings themselves.

Every check also confirmed: zero console errors on fresh, v1-seeded and
v2-seeded profiles; backup → erase → restore round-trips exactly; the CSV
parses; no `alert()` or `confirm()`; no overflow at 390 or 1440 px in either
theme.

### Not built

The "ask first" items (focus block timer, remembered volume and track,
adaptive N) still need your decision.


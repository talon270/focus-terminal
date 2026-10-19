# Focus terminal — suggestions

Written 2026-10-19, against commit `5a4add8` plus 8 uncommitted files (the
11 Oct review implementation; `PLAN-review.md` says "Implemented
2026-10-11").
Method: headless Chromium on `file://`, light and dark, at 390, 1440 and
1920 px, with a click-through. A read of `load()` and `save()`, the
cross-tab listener and the service worker. The worker was run on one local
origin next to `vis`.

**One fix applied in this pass (A1). Everything else is a suggestion and is
not implemented.** Backup: `sw.backup-20261019-053918.js` (`sw.js` was
untracked).

## Result

Zero page errors and console errors, both themes, all three widths. No
sideways scroll at 390 px. Ferm already does the two things most apps here
don't. An unreadable save is refused rather than overwritten (`durable =
false`, kept until restore or erase). A `storage` listener adopts another
tab's save. Its 5-line listener is the model suggested for the others.

## Part A — findings, ranked

### A1 · BUG (high): the service worker deleted every other app's offline cache — FIXED

The site is live at `talon270.github.io/focus-terminal/`, the same origin as
vis, Study, Docket, attendance-budget, epok, inkstone, filin, shirorekha and
fowler, which share one CacheStorage. On activate, `sw.js` deleted every cache
except `focus-terminal-v3`. Reproduced with one of the apps carrying the same
filter: `vis` opened offline afterwards returns 504 "Offline, and this file
was never cached."
**Fix (applied):** delete only names starting `focus-terminal-`. That is one
line plus a comment. Checked on one local origin: `vis-shell-3` survives, a
planted `focus-terminal-stale-old` is deleted, and `focus-terminal-v3`
installs.

### A2 · NOISE (low): commit the review work

`PLAN-review.md`, the icons and the 11 Oct changes are uncommitted.

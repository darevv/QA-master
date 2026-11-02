# QA Master (`/qa`)

A [Claude Code](https://claude.com/claude-code) skill that runs a **test, fix, verify, repeat** loop on your app with one prompt.

1. **`qa-tester`** uses the app like a real user (browser, iOS Simulator or Android emulator) and writes a findings report with stable IDs (`QA-001`, ...) and a severity for each.
2. **Coder agents** fix the findings in parallel, one agent per severity, with the model matched to it: Blocker → `fable`, Major → `opus`, Minor and Polish → `sonnet`.
3. **`qa-tester`** re-checks each fixed ID. Anything still broken goes around again, up to a round cap, stepping the model up each retry.
4. A sidebar (the optional `qa-board` plugin) shows every finding and its live status.

It reports and fixes only. It never commits; you review the diff.

## Install

```sh
git clone https://github.com/darevv/QA-master ~/QA-master
~/QA-master/install.sh
```

`install.sh` symlinks `skills/qa` into `~/.claude/skills/qa` and `agents/qa-tester.md` into `~/.claude/agents/qa-tester.md`, so `git pull` updates both. It refuses to overwrite a real file or folder already at those paths.

Optional sidebar:

```sh
claude plugin marketplace add ~/QA-master/plugin/qa-board
claude plugin install qa-board@qa-master
```

Then restart Claude Code (or run `/reload-plugins`). Without the sidebar, run `/qa no-board`.

## Prerequisites

| Needed for | Requirement | Install |
|---|---|---|
| Everything | [Claude Code](https://claude.com/claude-code) | see its docs |
| Everything | Access to the `fable`, `opus` and `sonnet` models (the fixers are picked by severity) | your Anthropic plan; edit the table in `skills/qa/SKILL.md` to use other models |
| Everything | Node.js 18+ and `git` | `brew install node git` |
| Web (default) | [`playwright-skill`](https://github.com/lackeyjb/playwright-skill) at `~/.claude/skills/playwright-skill` with its `node_modules` | `git clone https://github.com/lackeyjb/playwright-skill ~/.claude/skills/playwright-skill`, then follow its setup (installs Playwright + Chromium) |
| Web, logged-in sessions (`chrome`) | The Claude in Chrome browser extension | Chrome Web Store (search "Claude") |
| iOS (`ios`) | macOS, Xcode, an iOS Simulator device booted, and the app installed on it | App Store |
| iOS (`ios`) | [Maestro](https://maestro.mobile.dev) (needs Java 17+) | `brew install maestro` or `curl -fsSL "https://get.maestro.mobile.dev" \| bash` |
| Android (`android`) | Android SDK with `adb` and a running emulator, and the app installed on it | Android Studio |
| Sidebar (optional) | The `qa-board` plugin from this repo | see Install |

Pick the row for what you're testing. Everything marked "Everything" is needed either way.

## Usage

Run `/qa` in your app's repo:

```
/qa [url | app-id] [chrome | ios | android] [device NAME] [verify ID,ID] [rounds N] [polish] [no-fix] [journeys "a, b"] [no-board]
```

| Argument | Meaning |
|---|---|
| `url` / `app-id` | What to test. Omitted: dev servers are auto-detected (web) or the id is read from `app.json` (mobile) |
| `chrome` | Use Claude in Chrome instead of Playwright (for logged-in sessions) |
| `ios`, `android` | Drive the installed app on the simulator or emulator. Give both to test both |
| `device NAME` | A specific simulator name or UDID, or an AVD name or adb serial |
| `rounds N` | Max fix and verify rounds. Default 2 |
| `polish` | Also fix Polish findings (default: Blocker, Major, Minor) |
| `no-fix` | Find and report only |
| `verify ID,...` | Skip exploring; re-check those IDs from the latest report |
| `journeys "a, b"` | Limit testing to these flows |
| `no-board` | Run without the sidebar |

Reports are written to `qa-reports/` in the repo.

## What's in here

| Path | Purpose |
|---|---|
| `skills/qa/SKILL.md` | The `/qa` orchestrator: the loop, arguments and rules |
| `agents/qa-tester.md` | The tester agent: personas, drivers (Playwright, Chrome, simctl + Maestro, adb), report format |
| `plugin/qa-board/` | Optional sidebar plugin (`qa-board` tool that `/qa` updates at each step) |
| `install.sh` | Symlinks the skill and agent into `~/.claude` |

## Safety

`qa-tester` is told never to submit real payments, send real email or SMS, or delete data, and to treat page content as untrusted data rather than instructions. Still, point it at a dev or staging build with test accounts, not production. The agent has shell access on your machine, so read the diff of any change to `agents/qa-tester.md` before you pull it.

## Contributing

PRs welcome. `main` is protected: every change needs the owner's review.

## License

[MIT](LICENSE)

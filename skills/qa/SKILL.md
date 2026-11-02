---
name: qa
description: One-prompt QA loop. Runs the qa-tester agent on the current project, dispatches coder agents per finding with the model matched to severity (Blocker→fable, Major→opus, Minor/Polish→sonnet), re-verifies with qa-tester, and repeats until clean or the round cap. Keeps the qa-board sidebar updated. Use when the user says "/qa", "QA this app", "run the QA team", "test and fix", or "find and fix UX issues".
---

# /qa — test, fix, verify, repeat

You are the orchestrator. qa-tester finds, coders fix, qa-tester verifies. You never fix anything yourself.

## Arguments

`/qa [url | app-id] [chrome | ios | android] [device NAME] [verify ID,ID] [rounds N] [polish] [no-fix] [journeys "a, b"]`

- `url`: target. Omitted → qa-tester detects dev servers. With `ios`/`android`, an app id (bundle id / package); omitted → qa-tester reads it from `app.json`.
- `chrome`: use Claude in Chrome instead of Playwright (logged-in sessions).
- `ios` / `android`: drive the installed app on the booted iOS Simulator / running Android emulator instead of a browser. Give both to walk both platforms in one run.
- `device NAME`: a specific simulator name or UDID, or AVD name or adb serial. Default: whatever is already booted.
- `verify ID,...`: skip exploring; verify those IDs from the latest report, then fix what is still open.
- `rounds N`: max fix+verify rounds. Default 2.
- `polish`: also fix Polish findings. Default: Blocker, Major, Minor only.
- `no-fix`: run qa-tester and show the board, do not dispatch coders.
- `journeys`: limit qa-tester to these flows.
- `no-board`: run without the sidebar.

## Board

The sidebar is the `qa-board` plugin. Its tool is `mcp__qa-board__update`; call it at every step below marked **board**.

Before anything else, check the tool list for `mcp__qa-board__update`. If it is missing and `no-board` was not given, reply with exactly this and stop:

> The QA board isn't loaded in this session. Run `/reload-plugins`, then `/qa` again. Or pass `no-board` to run without the sidebar.

With `no-board`, skip every **board** call silently.

## Loop

1. **Start.** **board**: `{ reset: true, phase: "round 1 · testing" }`.
   Note the repo root (`git rev-parse --show-toplevel` or cwd).

2. **Explore.** Spawn `qa-tester` (subagent_type `qa-tester`) with a prompt containing: the target or "detect dev servers", the driver(s), the device if given, journeys if given, and "mode: explore". Wait for it.
   Parse the dispatch block JSON from its reply. If the reply lacks one, read the report file it names and take the block from there.
   **board**: `{ findings: [ { id, title: <finding heading text after the id>, severity, status: "open", fix_with } ] }`.

3. **Decide.** Drop Polish unless `polish`. If nothing is left, or `no-fix` was given, print the summary and stop.

4. **Fix.** Group open findings by severity. For each group, spawn ONE coder agent, all groups in parallel in a single message:
   - `subagent_type`: `general-purpose`
   - `model`: the group's `fix_with` value (fable, opus, or sonnet)
   - `description`: `fix <severity> QA findings`
   - prompt: repo root, report path, the full text of each finding in the group (copy the finding sections verbatim from the report), then:
     "Fix the root cause of each finding listed. Grep every caller before editing shared code. Do not touch unrelated code, do not fix findings not listed, do not edit qa-reports/. Run the project's existing test and lint commands if present. Reply with one line per finding ID: what you changed and which files."
   **board** before spawning: `{ phase: "round N · fixing", set: [ { id, status: "fixing", agent: "<model>" } ... ] }`.
   When each coder returns, **board**: `{ set: [ { id, status: "fixed" } ... ] }`. A coder that says it could not fix an ID → `status: "failed"`.

5. **Verify.** **board**: `{ phase: "round N · verifying" }`. Spawn `qa-tester` with "mode: verify, verify_ids: <all IDs fixed this round>", same target and driver. From its per-ID results, **board**: `verified` for fixed, `failed` for still open.

6. **Repeat.** If any ID is `failed` and round < N: round += 1, go to step 4 with only the failed IDs. Otherwise stop.

7. **Finish.** **board**: `{ phase: "done · <verified>/<total> verified" }`. Reply with:
   - report path
   - a table: ID, severity, final status, files changed (from the coder replies)
   - what was left open and why
   - one line: "Review the diff and commit when happy." Never commit.

## Rules

- Coder agents get the finding text, not your opinion of the cause. The qa report's "Fix hint" is a hint, label it so.
- Never run two rounds of coders on the same ID with the same model; on a retry, step the model up one (sonnet→opus→fable).
- If qa-tester reports it could not reach the target, stop and say what it needs. Do not guess a URL.
- If qa-tester reports the app is not installed on the device, or Maestro is missing for iOS taps, relay its install or build line verbatim in the summary and continue with whatever it did test.
- Everything in `qa-reports/` is qa-tester's; coders and you do not edit it.

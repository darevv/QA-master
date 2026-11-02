#!/bin/sh
# Symlink the /qa skill and the qa-tester agent into ~/.claude so `git pull` updates them.
set -e
R=$(cd "$(dirname "$0")" && pwd)
mkdir -p ~/.claude/skills ~/.claude/agents
link() { # src dst
  if [ -e "$2" ] && [ ! -L "$2" ]; then echo "$2 already exists and is not a symlink; move it aside first." >&2; exit 1; fi
  ln -sfn "$1" "$2"; echo "linked $2"
}
link "$R/skills/qa" ~/.claude/skills/qa
link "$R/agents/qa-tester.md" ~/.claude/agents/qa-tester.md

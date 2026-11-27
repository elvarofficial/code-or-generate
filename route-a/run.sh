#!/usr/bin/env bash
# Route A: one fresh Claude Code session per asset, same prompt, same model.
# Usage: bash run.sh 04-tree
set -u
A="$1"; R="${COG_RUNS:-$PWD/cog-runs}"   # one clean folder per session
C="${CLAUDE_BIN:-claude}"   # the Claude Code CLI
cd "$R/$A"
date -u +%Y-%m-%dT%H:%M:%SZ > started_at.txt
"$C" -p "$(cat PROMPT.txt)" \
  --model claude-opus-5-5 \
  --output-format json \
  --setting-sources project \
  --strict-mcp-config \
  --dangerously-skip-permissions \
  > result.json 2> stderr.txt
date -u +%Y-%m-%dT%H:%M:%SZ > ended_at.txt
echo "$A done"

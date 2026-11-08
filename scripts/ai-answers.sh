#!/bin/zsh
# Ask Claude Code and Codex the questions in docs/research/ai-answers/questions.txt
# and save each answer under docs/research/ai-answers/<today>/, to see whether
# what the agents recommend has changed (docs/research/ai-answers/README.md).
#
#   scripts/ai-answers.sh
#
# Each run must start knowing nothing about Hostbeam, or the answer measures
# this repo instead of the web. So: run from /var/empty (an empty folder whose
# path names nothing; the first attempt ran from a folder called "hostbeam"
# and Claude Code said so), no MCP servers, no
# memory, no user settings, no session saved, and the question passed with
# nothing on stdin (the first attempt let `claude -p` read the rest of the
# question list). Uses whatever accounts Claude Code and Codex are signed in
# with. The chat apps (chatgpt.com, Perplexity, Copilot, Google) are asked
# separately, in a signed-out browser — see the README.
set -u
repo=${0:A:h:h}
questions=$repo/docs/research/ai-answers/questions.txt
out=$repo/docs/research/ai-answers/$(date +%F)
mkdir -p $out
cd /var/empty || exit 1

while IFS='|' read -r id q; do
  { echo "Claude Code $(claude --version) · $(date -u +%FT%TZ) · question $id"; echo "Q: $q"; echo "---"
    timeout 360 claude -p "$q" --setting-sources local --strict-mcp-config --no-session-persistence \
      --allowedTools "WebSearch,WebFetch" < /dev/null 2>&1; } > $out/claude-$id.txt

  last=$(mktemp)
  { echo "$(codex --version) · web search on · $(date -u +%FT%TZ) · question $id"; echo "Q: $q"; echo "---"; } > $out/codex-$id.txt
  timeout 360 codex --search exec --skip-git-repo-check --ephemeral -s read-only \
    -c features.memories=false -c 'mcp_servers={}' -o $last "$q" < /dev/null > /dev/null 2>&1
  cat $last >> $out/codex-$id.txt; rm -f $last
  echo "question $id done"
done < $questions

echo "saved in ${out#$repo/}"
grep -l -i hostbeam $out/*.txt 2>/dev/null | sed 's/^/names Hostbeam: /' || echo "no answer names Hostbeam"

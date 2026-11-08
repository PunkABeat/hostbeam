#!/bin/bash
# serve.command - double-click to preview the Hostbeam reference prototypes.
# First time only: right-click -> Open to clear the unidentified developer prompt.

cd "$(dirname "$0")" || exit 1

PORT=8000
URL="http://localhost:$PORT/prototypes/popover/index.html"

echo "Serving Hostbeam prototypes from: $(pwd)"
echo "Opening $URL"
echo "Press Ctrl+C to stop."
echo

(sleep 1; open "$URL") &

if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server "$PORT"
elif command -v npx >/dev/null 2>&1; then
  npx --yes serve -l "$PORT" .
else
  echo "Need python3 or node/npx installed to run a local server."
  read -r -n 1 -p "Press any key to close..."
fi

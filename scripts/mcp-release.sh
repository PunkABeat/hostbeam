#!/bin/bash
# Release the Hostbeam MCP server: its public repo, npm, and the official MCP
# registry.
#
#   scripts/mcp-release.sh check      stage the package and prove it runs; changes nothing anywhere
#   scripts/mcp-release.sh mirror     push it to github.com/PunkABeat/hostbeam-mcp, tagged v<version>
#   scripts/mcp-release.sh publish    npm publish as @hostbeam/mcp (the owner runs this: npm asks for a code)
#   scripts/mcp-release.sh registry   list that version in registry.modelcontextprotocol.io
#   scripts/mcp-release.sh key        once: the key that proves hostbeam.app to the registry
#
# mirror, publish, registry, in that order, and each refuses to run before the
# one ahead of it has gone through. The public repo goes first so the npm page's
# repository link resolves the moment the package appears; the registry goes
# last because it checks the package on npm, and reads `mcpName` from the
# version already there.
#
# What ships is apps/agent/hostbeam-mcp.mjs and the files in apps/agent/publish/.
# The prompt hook and the tests stay in this repo (ADR 0021). The version lives
# in publish/package.json, publish/server.json and VERSION in the server; the
# agent tests hold all three together.
#
# A version never goes out twice with different contents: npm will not take a
# package back after 72 hours, the registry never deletes one, and a tag that
# moves under someone's install is worse than a missing one. Rerunning a step
# that already went through says so and exits 0.
set -euo pipefail

die() { echo "mcp-release: $*" >&2; exit 1; }

ROOT=$(cd "$(dirname "$0")/.." && pwd)
AGENT="$ROOT/apps/agent"
MIRROR_REPO="${HOSTBEAM_MCP_REPO:-git@github.com:PunkABeat/hostbeam-mcp.git}"
REGISTRY="https://registry.modelcontextprotocol.io"
DOMAIN="hostbeam.app"
KEY_SERVICE="hostbeam-mcp-registry" # Keychain item: the Ed25519 seed, as hex
PROOF="$ROOT/apps/web/public/.well-known/mcp-registry-auth"
SHIPPED=(hostbeam-mcp.mjs publish/package.json publish/README.md publish/LICENSE publish/server.json)

manifest() { node -p "require('$AGENT/publish/package.json').$1"; }
NAME=$(manifest name)
VERSION=$(manifest version)
MCP_NAME=$(manifest mcpName)

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
STAGE="$TMP/package"

stage_and_check() {
  mkdir -p "$STAGE"
  for f in "${SHIPPED[@]}"; do cp "$AGENT/$f" "$STAGE/"; done
  chmod 755 "$STAGE/hostbeam-mcp.mjs"

  (cd "$ROOT" && npm run --silent test:agent >/dev/null 2>&1) \
    || die "the agent tests fail — run: npm run test:agent"

  local packed
  packed=$(cd "$STAGE" && npm pack --dry-run --json 2>/dev/null | node -e '
    const [p] = JSON.parse(require("fs").readFileSync(0, "utf8"));
    console.log(p.files.map((f) => f.path).sort().join(" "));')
  [ "$packed" = "LICENSE README.md hostbeam-mcp.mjs package.json" ] \
    || die "the tarball would hold: $packed"

  # Checked before npm, because npm keeps a version that names a bad entry.
  command -v mcp-publisher >/dev/null || die "mcp-publisher is not installed — run: brew install mcp-publisher"
  (cd "$STAGE" && mcp-publisher validate server.json >/dev/null 2>&1) \
    || die "server.json does not validate — run: mcp-publisher validate apps/agent/publish/server.json"

  # Through a symlink, the way npx starts a bin. A server that answers only when
  # run by its own file name exits silently for every npx user.
  mkdir "$TMP/bin"
  ln -s "$STAGE/hostbeam-mcp.mjs" "$TMP/bin/hostbeam-mcp"
  local reply
  reply=$(printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' \
    | HOSTBEAM_DIR="$TMP/empty" "$TMP/bin/hostbeam-mcp")
  case "$reply" in
    *"\"serverInfo\":{\"name\":\"hostbeam\",\"version\":\"$VERSION\""*) ;;
    *) die "the staged server did not answer initialize as $VERSION: ${reply:-no reply}" ;;
  esac
  echo "mcp-release: $NAME@$VERSION staged and checked"
}

mirror() {
  local repo="$TMP/mirror"
  git clone --quiet "$MIRROR_REPO" "$repo" 2>/dev/null \
    || die "could not clone $MIRROR_REPO — does it exist, and can this Mac's SSH key push to it?"

  local latest
  latest=$(git -C "$repo" tag -l 'v*' | sed 's/^v//' | sort -V | tail -1)
  if [ -n "$latest" ] && [ "$(printf '%s\n%s\n' "$latest" "$VERSION" | sort -V | tail -1)" != "$VERSION" ]; then
    die "the mirror is at $latest; refusing to go back to $VERSION"
  fi

  # The mirror holds exactly what ships, so it is replaced rather than merged.
  git -C "$repo" ls-files | while IFS= read -r f; do rm -f "$repo/$f"; done
  cp "$STAGE"/* "$repo/"
  git -C "$repo" add -A

  if [ "$latest" = "$VERSION" ]; then
    git -C "$repo" diff --cached --quiet "v$VERSION" \
      || die "v$VERSION is tagged in the mirror with different contents — bump the version"
    echo "mcp-release: mirror already at $VERSION"
    return
  fi

  git -C "$repo" diff --cached --quiet HEAD 2>/dev/null \
    || git -C "$repo" commit --quiet -m "hostbeam-mcp $VERSION"
  git -C "$repo" tag "v$VERSION"
  git -C "$repo" push --quiet origin "HEAD:refs/heads/main" "refs/tags/v$VERSION" \
    || die "push failed — rerun: scripts/mcp-release.sh mirror"
  echo "mcp-release: mirror now at $VERSION"
}

publish() {
  [ -n "$(git ls-remote --tags "$MIRROR_REPO" "v$VERSION" 2>/dev/null)" ] \
    || die "the mirror has no v$VERSION yet — run: scripts/mcp-release.sh mirror"
  npm whoami >/dev/null 2>&1 || die "not logged in to npm — run: npm login"

  if npm view "$NAME@$VERSION" version >/dev/null 2>&1; then
    # Already out: fine if it is this code, refused if it is not. package.json
    # is left out of the comparison because npm normalises it on publish.
    (cd "$TMP" && npm pack --quiet "$NAME@$VERSION" >/dev/null 2>&1) \
      || die "$NAME@$VERSION is on npm but could not be downloaded to compare"
    mkdir "$TMP/published"
    tar -xzf "$TMP/hostbeam-mcp-$VERSION.tgz" -C "$TMP/published"
    for f in hostbeam-mcp.mjs README.md LICENSE; do
      cmp -s "$STAGE/$f" "$TMP/published/package/$f" \
        || die "$NAME@$VERSION is on npm with a different $f — bump the version"
    done
    echo "mcp-release: $NAME@$VERSION already on npm"
    return
  fi

  (cd "$STAGE" && npm publish --access public) \
    || die "npm publish failed — if npm says the scope is not found, create the free npm organization \"hostbeam\" first"
  echo "mcp-release: published $NAME@$VERSION — https://www.npmjs.com/package/$NAME"
}

registry() {
  # Right after `publish` this can fail for a few minutes: npm serves the
  # tarball at once but not the package metadata (0.1.0 took three).
  npm view "$NAME@$VERSION" version >/dev/null 2>&1 \
    || die "npm does not serve $NAME@$VERSION yet, and the registry checks it there — if you just published, wait a few minutes; if not, run: scripts/mcp-release.sh publish"

  local encoded status
  encoded=$(node -p 'encodeURIComponent(process.argv[1])' "$MCP_NAME")
  status=$(curl -s -o /dev/null -w '%{http_code}' "$REGISTRY/v0.1/servers/$encoded/versions/$VERSION")
  if [ "$status" = "200" ]; then
    echo "mcp-release: $MCP_NAME $VERSION already in the registry"
    return
  fi

  # The registry fetches this file to check the key; catch a stale deploy here
  # rather than as a login failure.
  [ -f "$PROOF" ] || die "no $PROOF — run: scripts/mcp-release.sh key"
  [ "$(curl -sf "https://$DOMAIN/.well-known/mcp-registry-auth" || true)" = "$(cat "$PROOF")" ] \
    || die "https://$DOMAIN/.well-known/mcp-registry-auth does not serve $PROOF — run: npm run deploy:web"

  local seed
  seed=$(security find-generic-password -s "$KEY_SERVICE" -w 2>/dev/null) \
    || die "no registry key in the Keychain — run: scripts/mcp-release.sh key"
  mcp-publisher login http --domain="$DOMAIN" --private-key="$seed" >/dev/null \
    || die "registry login failed"
  (cd "$STAGE" && mcp-publisher publish server.json) || die "registry publish failed"
  echo "mcp-release: $MCP_NAME $VERSION is in the registry"
}

# The registry grants app.hostbeam/* to whoever signs with the key whose public
# half hostbeam.app serves at /.well-known/mcp-registry-auth. The private half
# lives only in this Mac's login Keychain. Losing it costs a new one, nothing
# more: delete the Keychain item, run this again, commit the proof and deploy
# the site, and the old key stops working.
key() {
  if ! security find-generic-password -s "$KEY_SERVICE" >/dev/null 2>&1; then
    local seed
    seed=$(node -e '
      const { privateKey } = require("crypto").generateKeyPairSync("ed25519");
      const { d } = privateKey.export({ format: "jwk" });
      console.log(Buffer.from(d, "base64url").toString("hex"));')
    security add-generic-password -s "$KEY_SERVICE" -a "$DOMAIN" \
      -l "Hostbeam MCP registry key ($DOMAIN)" -w "$seed" \
      || die "could not store the key in the Keychain"
    echo "mcp-release: new registry key stored in the Keychain as $KEY_SERVICE"
  fi

  local line
  line=$(security find-generic-password -s "$KEY_SERVICE" -w | node -e '
    const { createPrivateKey, createPublicKey } = require("crypto");
    const seed = Buffer.from(require("fs").readFileSync(0, "utf8").trim(), "hex");
    // A bare Ed25519 seed wrapped as PKCS#8 (RFC 8410), so Node can load it.
    const der = Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), seed]);
    const spki = createPublicKey(createPrivateKey({ key: der, format: "der", type: "pkcs8" }))
      .export({ format: "der", type: "spki" });
    console.log(`v=MCPv1; k=ed25519; p=${spki.subarray(-32).toString("base64")}`);')

  mkdir -p "$(dirname "$PROOF")"
  if [ "$(cat "$PROOF" 2>/dev/null)" = "$line" ]; then
    echo "mcp-release: $PROOF already carries this key"
  else
    echo "$line" >"$PROOF"
    echo "mcp-release: wrote $PROOF — commit it, then: npm run deploy:web"
  fi
}

case "${1:-}" in
  check) stage_and_check ;;
  mirror) stage_and_check && mirror ;;
  publish) stage_and_check && publish ;;
  registry) stage_and_check && registry ;;
  key) key ;;
  *) die "usage: $0 check | mirror | publish | registry | key" ;;
esac

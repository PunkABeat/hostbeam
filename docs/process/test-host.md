# The development SSH host

`scripts/testhost.sh` runs a disposable OpenSSH server in Docker so the beam
path can be exercised without a live remote box.

It exists because the alternative is depending on a real server that can go
away — and when it does, nothing about the product's core workflow is testable:
not the upload contract, not host-key pinning, not diagnostics, not iPhone
pairing.

```sh
npm run testhost:up      # start it and add it to ~/.ssh/config
npm run testhost         # status: is it up, who may log in, what has landed
npm run testhost:down    # stop it and take it out of ~/.ssh/config
npm run testhost:logs    # follow sshd
scripts/testhost.sh clear   # empty /tmp/hostbeam
scripts/testhost.sh reset   # wipe its identity and every authorized device
```

`up` prints everything worth knowing:

```
container : running on port 2222
ssh alias : hostbeam-testhost → dev@192.0.2.87:2222
reachable : yes
host key  : SHA256:<the test host's key>
authorized:
            SHA256:<iphone key>…  hostbeam-iphone
            SHA256:<mac key>…     hostbeam-testhost
beamed    : 0 file(s) in /tmp/hostbeam
agent     : Claude Code 2.1.283, tmux, mosh
mosh      : mosh -p 60000:60009 hostbeam-testhost
```

`up` rebuilds the image when anything in `scripts/testhost/` has changed (the
image carries a hash of it) and replaces a container running an older one —
its identity is on volumes, so nothing paired is lost. Before 2026-09-27 it
reused whatever image existed, so a new tool never reached anyone's host.

## What it is

Alpine + OpenSSH, **publickey auth only** on **port 2222** — deliberately not
22, because a non-default port is the case most likely to be got wrong (see the
0.1.9 pairing bug), and a test host that only exercises the easy path is worth
less. Password auth is off, matching the hardened hosts ADR 0016 assumes.

It is also an **agent host**: Claude Code (whatever version was current when
the image was built), tmux and mosh, for [next.md](next.md) § 10a — `scripts/spikes/ctrl-v/`
runs Ctrl+V through all three. mosh needs UDP, so each host maps ten ports
keyed on its SSH port (60000–60009 for 2222) and has to be told them: `mosh -p
60000:60009 hostbeam-testhost`. Claude Code runs at its prompt without an
account when `ctrl-v.sh test` seeds it; nothing it does there calls the API.

Other agents are not in the image (they add Node and a few hundred MB). For
`ctrl-v.sh paste`, which checks what each agent makes of a pasted beam path,
add them to the running container — a rebuild removes them again:

```sh
docker exec hostbeam-testhost sh -c 'apk add --no-cache nodejs npm &&
  npm i -g @openai/codex @google/gemini-cli opencode-ai'
```

Codex's background server fails on Alpine, so the script runs `codex
--no-daemon`, and signs it in with a dummy key; none of them is ever sent a
message.

sshd keeps **Alpine's stock `AllowTcpForwarding no`**, on purpose: OpenSSH
refuses remote Unix-socket forwards under it too, which is the case the
Ctrl+V relay exists for. Do not turn it on to make something pass.

## Four decisions worth knowing

**The address is the Mac's LAN IP, never a loopback.** The pairing QR hands
this value to the phone, where `localhost` would mean the phone itself. `up`
re-detects it each time, because it changes with the network. With no LAN
address it falls back to `127.0.0.1` and says so: the Mac can still reach the
host, the iPhone cannot.

**The Include line goes at the top of `~/.ssh/config`.** ssh is
first-obtained-wins, so a wildcard `Host *` block above it can override the
port and send beams somewhere else entirely — which is exactly what happened
during development. `status` re-checks the resolved port against the intended
one and warns if something upstream has taken it over.

**Identity lives on volumes, not in the image.** Host keys and
`authorized_keys` survive rebuilds, `down`, and restarts. A regenerated host key
makes every paired device refuse to connect as a suspected MITM, and a lost
`authorized_keys` means re-authorizing every phone. Only `reset` destroys them,
and it says what that costs.

**The key is dedicated and lives outside the repo** — generated on first `up`
into `~/.config/hostbeam-testhost/`, never your own key, never committed (repo
rule: no credentials in the tree).

`/tmp/hostbeam` is *not* on a volume: beamed files are disposable and a fresh
container should start clean.

## More than one at a time

`HOSTBEAM_TESTHOST_ALIAS` and `HOSTBEAM_TESTHOST_PORT` key the container, its
volumes and its ssh entry, so a second host is one more invocation:

```sh
HOSTBEAM_TESTHOST_ALIAS=hostbeam-testhost2 \
HOSTBEAM_TESTHOST_PORT=2223 scripts/testhost.sh up
```

Anything about *pairing* needs two hosts — device authorization is per host, and
a remembered device (ADR 0018) only proves itself on the second one. Aiming that
at a real server to try a feature is the wrong trade.

## Using it

Add `hostbeam-testhost` in Preferences → Hosts on the Mac like any other host —
it comes from `~/.ssh/config`, so it is discovered normally.

For the iPhone: on the **first** host, pair it the usual way (Preferences →
Hosts → **Share to iPhone…**) and paste the phone's key into the authorize
field. It is appended to the container's `authorized_keys`, where it persists.

After that the Mac remembers the device (ADR 0018), so a second host takes one
click — **Authorize {device}** in the host's own row, no phone in hand. That is
why two containers are worth having: the remembered-device path, and the phone
skipping its authorize step entirely, only show up on host two.

To force the other branches: `ssh <alias> "sed -i '/hostbeam-iphone/d'
~/.ssh/authorized_keys"` puts a host back to needing the key, and a host at
`192.0.2.1` (reserved, swallows packets) exercises the unreachable path and the
probe watchdog.

When a beam fails, `npm run testhost:logs` is usually the fastest answer:
sshd logs the fingerprint of the key that was offered, which distinguishes
"wrong key" from "never connected" immediately. That distinction is what
identified the share-extension bug in milestone 008.

## What it does not cover

A container on your own LAN is not a substitute for a real remote host on every
axis: no latency worth measuring, no jetsam pressure on the share extension, no
captive networks or flaky links. Use it for correctness — the upload contract,
pinning, pairing, diagnostics, error taxonomy — and keep at least one real host
in the loop before a release.

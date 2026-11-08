# ADR 0027: Removing a Device From Every Host

Status: **Accepted** (2026-09-26, owner decision). The owner approved the idea
in principle on 2026-09-25 on two conditions, which this ADR treats as fixed:
the user explicitly approves the removal, and sees exactly what would be
removed before anything is. Amends ADR 0018 §3. Not yet built: see the last
consequence.

Relates to: ADR 0018 (remembered device keys, and the probe that asks a host
which of them it holds), ADR 0016 §2 (the iPhone's device key), ADR 0003
(Hostbeam works through the user's own SSH access).

## Context

Authorizing an iPhone on a host adds one line to that host's
`~/.ssh/authorized_keys`: one click per host from the Mac, idempotent
(ADR 0018). Nothing takes the line off again. Forgetting a remembered device in
Preferences → Hosts removes it from the Mac's list, which stops the Mac
offering it to new hosts, but every host it was already installed on still
accepts it.

The gap matters most exactly when it is needed. A phone that is lost, stolen,
sold or replaced keeps its access to every server until someone signs in to
each one and edits the file by hand. ADR 0018 §3 made "which devices can reach
my servers" answerable in the app; it is still not fixable there. Termius's
SSH ID, assessed on 2026-09-25, leaves the same gap and documents the manual
edit as the answer (questions.md § Security).

`authorized_keys` is the most sensitive file on the host. A bug that removes
the wrong line, or leaves the file half-written, locks the user out of their
own server, possibly with no other way in. So the owner's conditions shape the
whole decision, not just its UI.

## Decision

1. **Only a remembered device's key, only on hosts the Mac lists.** The action
   exists on a device in the remembered-devices list and nowhere else. It is
   not an `authorized_keys` editor: it cannot remove a key the Mac did not
   remember, and it touches no other file, in the spirit of AGENTS.md's fence
   on SSH config editing.

2. **Check first, read-only, then show everything.** "Remove from hosts…"
   connects to every host the Mac lists and only reads. The sheet then shows,
   per host:
   - each line that would be removed, verbatim, with the key's SHA256
     fingerprint and comment;
   - "not on this host" when nothing matches;
   - "didn't answer" when the host is unreachable. That host is left alone,
     and the sheet says so. As in ADR 0018's amendment, silence is not
     evidence about what a host would accept.

   The sheet also says what it cannot see: it reads `~/.ssh/authorized_keys`
   on hosts Hostbeam knows. A host using `AuthorizedKeysCommand` or another
   `AuthorizedKeysFile`, or one the Mac does not list, may still accept the
   key.

3. **Explicit approval, per host.** Each host with a match has its own
   checkbox. The confirm button names what it will do ("Remove from 3
   hosts"), and Cancel is the default. Nothing is removed as a side effect of
   anything else: not forgetting a device, not deactivating a licence, not a
   schedule.

4. **A line matches by its key, not its exact text.** `install_pubkey` writes
   `ssh-ed25519 <base64> <comment>`, but the same key can also sit on a host
   under another comment or with options in front (`restrict …`), added by
   hand. A device is only revoked if every such line goes, so a line matches
   when one of its whitespace-separated fields is exactly the key's base64
   body. Every match is shown verbatim, so the wider match never removes
   anything the user did not see. The authorized badge keeps its exact
   `grep -qxF`: it answers "is what we installed still there", a narrower
   question.

5. **What was shown is what is removed, or nothing is.** On each host, the
   removal recomputes the matches and compares them with what the sheet
   showed. If they differ, because the file changed between the check and the
   confirmation, that host is not touched and is reported as changed.

6. **The file is never left half-written.** The new contents go to a temporary
   file in `~/.ssh` with the original's permissions and are renamed over it in
   one step. An `authorized_keys` that is a symlink or not a regular file is
   refused, not followed. Removing the last line leaves an empty file, not a
   missing one.

7. **Never cut off the Mac's own access.** If the device's key is one the Mac
   itself offers to that host (a key in its agent, or an identity file
   `ssh -G` reports), that host is refused with the reason. The pairing sheet's
   paste field accepts any ed25519 line, so a Mac key remembered as a "device"
   is possible.

8. **A report, then the host's own answer.** Afterwards the sheet lists each
   host as removed, already gone, changed since the check, didn't answer, or
   failed, with the reason. The reachability probe then runs again, so the
   authorized badges show what the hosts now say, not what Hostbeam did.

9. **Forgetting stays separate.** A user may want a key kept on hosts but no
   longer offered from this Mac, so forgetting without removing stays
   possible, and says that the key stays on the hosts that hold it. After a
   removal, forgetting is offered, not done. While any host is left unknown or
   changed the device stays listed, because its key is what a second attempt
   needs.

## Out of scope

- **The iPhone removing itself.** The phone could edit the file over its own
  SFTP access, but the case that matters, a lost phone, is exactly when the
  phone cannot act. Revisit only if iPhone-only users ask.
- **Anything automatic**: on a schedule, on Deactivate, on forgetting, or when
  a host is removed. Same fence as remote cleanup.
- **Keys the Mac never remembered**, other authentication files, and other
  accounts on the host.

## Consequences

- Two new Rust commands beside `install_pubkey`: a read-only check that returns
  the matching lines per host, and a removal that takes the lines the user
  approved. Both take the key through `valid_pubkey` and single-quote it into
  the remote script, as `install_pubkey` does.
- Tests follow the house rule. `tests/fake_ssh.rs` pins the commands sent; the
  proof is against `hostbeam-testhost`: the removed key no longer
  authenticates, every other key still does, the mode is still 600, a
  symlinked file is refused, and a line added between check and confirmation
  leaves that host untouched. `npm run testhost` lists the authorized
  fingerprints before and after.
- ADR 0018 §3's list becomes where a device is both seen and revoked. Its
  footnote and the forget control's wording change with it, in every locale.
- The questions.md entry "Removing a device from every host" points here.
- Accepting this ADR did not open the work: it needs a milestone or a
  `next.md` item first.

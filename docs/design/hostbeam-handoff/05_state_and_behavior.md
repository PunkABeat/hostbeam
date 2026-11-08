# 05 — State, data model & behavior

The prototype's single source of truth is `window.HB` + `useHBConfig()` in
`reference/prototypes/onboarding/shared.jsx`. In Flutter, model this as one
**`ConfigRepository`** (persisted) exposed via your state layer (Riverpod/Provider/
Bloc — your choice) so the popover, onboarding, and Preferences all read/write the
same store and stay in sync live.

## Config model (persisted)

```dart
class Host {
  String id;
  String name;        // ssh alias, e.g. "prod-box"
  String address;     // e.g. "10.4.0.12"
  String user;        // e.g. "dev"
  String folder;      // default "/tmp/hostbeam"
  bool online;        // last-known reachability
}

class Settings {
  bool launch = true;          // launch at login
  bool menubar = true;         // show in menu bar
  bool immediate = true;       // beam immediately on hotkey (no confirm)
  bool copySentence = true;    // copy the paste-ready sentence after beam
  bool notify = true;          // success notification
  bool sound = false;          // soft chime on landing (off by default)
  String folder = "/tmp/hostbeam";          // global default remote folder
  String sentence = "Use this screenshot: {path}"; // paste-ready template
}

class RecentBeam {
  String id;
  String hostId;
  String hostName;
  String path;        // full remote path
  int at;            // epoch ms
}

class Config {
  List<String> addedIds;          // hosts the user added (subset of ssh-config + manual)
  String defaultId;               // the default beam target
  List<Host> manualHosts;         // hosts typed in by hand (not from ~/.ssh/config)
  Map<String,String> folders;     // per-host folder overrides, keyed by host id
  List<RecentBeam> recent;        // most-recent first
  Settings settings;
  List<String> hotkey;            // e.g. ["cmd","shift","7"]
}
```

Persistence key in prototype: `hostbeam.config.v1` (localStorage). In Flutter use a
file in Application Support (or `shared_preferences`). On change, persist and notify
all listeners (the prototype broadcasts a `hb:config` event + cross-tab `storage`).

### Derived rules (match these exactly)
- **allHosts()** = `~/.ssh/config` entries + `manualHosts`.
- **hostById(id)** = lookup across allHosts.
- **folderFor(id)** = `config.folders[id]` if set, else `settings.folder`. (Per-host
  override wins; otherwise the global default.)
- The popover's selected host = `defaultId`. Changing default anywhere updates both
  surfaces.

## The hosts the picker searches (the `~/.ssh/config` universe)

In the real app, **parse `~/.ssh/config`** for `Host` entries (alias, HostName,
User). The prototype mocks this as `window.OB.sshConfig` (prod-box, staging,
dev-box, edge-eu, gpu-trainer, db-replica, bastion, sandbox, ci-runner, old-vps) —
use that list as test fixtures. The onboarding subset is `window.OB.detected`.

## Beam state machine

```
idle ──(hotkey / Beam button)──▶ beaming
beaming ──(upload ok)──▶ landing ──(≈0.7s)──▶ done
beaming ──(upload fails)──▶ error(kind)
done ──(Beam again / new clipboard)──▶ idle
error ──(Retry)──▶ beaming   ·   (Switch host)──▶ idle   ·   (diagnostics)──▶ sheet
```

On each transition:
- **beaming:** read clipboard payload (image data OR file-url — see file-architected
  note), open SSH to `defaultId`, ensure `folderFor(defaultId)`, upload to
  `{folder}/{timestamp}.png`. Show BeamMark `uploading`.
- **landing:** BeamMark `landing` (node pop + ring bloom once) + menu-bar **blip** +
  optional **chime**. Build the sentence from `settings.sentence` (`{path}` →
  remote path). If `copySentence`, write it to the clipboard. If `notify`, post the
  notification. Prepend a `RecentBeam`.
- **done:** show the result block with the copied sentence.
- **error:** classify into `timeout | auth | perm` (doc 01 taxonomy) and render the
  matching title/detail/hint/recovery actions.

### Beam payload (file-architected)
```dart
enum BeamKind { image, file }
class BeamItem {
  BeamKind kind;
  Uint8List? bytes;     // when kind == image (clipboard image data)
  String? sourcePath;   // when kind == file (clipboard file-url)
  String filename;      // timestamped for images; original name for files
  String mime;
  int size;
}
```
The clipboard resolver returns a `BeamItem`. v1 only ever produces `image`, but the
upload + sentence code paths take a `BeamItem` so files "just work" later.

## Hotkey
- Global system hotkey, default `⌘⇧7`. Recorder in Preferences captures a live combo.
- Warn if the combo collides with a macOS system shortcut (prototype list in
  `window.OB.SYSTEM_SHORTCUTS`: ⌘⇧3/4/5, Spotlight ⌘Space, ⌘Tab, ⌘Q, ⌘W,
  Mission Control ⌃↑). Show the colliding shortcut's name.

## Connection test & diagnostics
- **Test** (onboarding / add-host): returns ok (`ssh-agent · ed25519 · {folder}
  writable`) or an error (`Operation timed out after 10s`). Hosts flagged
  `online:false` fail.
- **Diagnostics** (Hosts pane): 4 sequential checks — SSH reachable / Authentication
  / Remote folder writable / Round-trip latency — each ok/warn/fail/skip with a mono
  detail. If SSH is unreachable, later checks are `skip`.

## Empty / edge states
- No host configured → empty hero (popover + onboarding share copy).
- Nothing on clipboard → `Nothing to beam yet` + helper.
- File moved/deleted since clipboard copy (file-architected path) → an error:
  "That file's gone — copy it again." (new failure mode vs. image data).
- Recents > 3 in popover → `+N more` → Preferences › Recent.

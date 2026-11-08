// The app's strings: `t(key, vars)` over eight dictionaries. The active locale
// comes from the user's setting (`config.settings.locale`, "system" or a code)
// → the macOS/browser language → English, and re-resolves live when the setting
// changes in this window or another. Every user-facing string is a key here,
// in every locale; English is the fallback for a key a locale lacks.

import { HB } from "./lib/config";
import { refreshTrayMenu } from "./lib/ipc";

export const SUPPORTED = ["en", "fr", "ja", "es", "de", "zh", "pt", "ko"] as const;
export type Locale = (typeof SUPPORTED)[number];

type Dict = Record<string, string>;

const en: Dict = {
  "common.ready": "Ready",
  "common.beamed": "Beamed",
  "pop.onClipboard": "Screenshot on clipboard",
  "pop.noClipboard": "No screenshot on clipboard",
  "pop.checking": "Checking clipboard…",
  "pop.readingClipboard": "Reading the clipboard",
  "pop.copyThenBeam": "Copy a screenshot, then beam it",
  "pop.pngImage": "PNG image",
  "pop.beam": "Beam screenshot",
  "pop.orPress": "or press",
  "pop.copyToBeam": "Copy a screenshot, or drop one here",
  "pop.hotkeyBeams": "beams it from anywhere",
  "pop.dropHere": "Drop to beam to {host}",
  "pop.dropRefused": "Hostbeam beams files up to 100 MB, not folders.",
  "pop.beamingTo": "Beaming to {host}…",
  "pop.beamedTo": "Beamed to {host}",
  "pop.copiedToClipboard": "Copied to clipboard",
  "pop.tryAgain": "Try again",
  "pop.nOfTotal": "{n} of {total}",
  "pop.nFiles": "{n} screenshots",
  "pop.fileOnClipboard": "File on clipboard",
  "pop.filesOnClipboard": "{n} files on clipboard",
  "pop.oneFile": "1 file",
  "pop.nFilesAny": "{n} files",
  "pop.beamFile": "Beam file",
  "pop.beamFiles": "Beam {n} files",
  "pop.heldTitle": "{name} looks like a secret",
  "pop.heldTitleMany": "{n} files look like secrets",
  "pop.heldDetail": "Nothing was sent. Send to {host} anyway?",
  "pop.dontSend": "Don’t send",
  "pop.sendAnyway": "Send anyway",
  "pop.showInFinder": "Show in Finder",
  "pop.fileGone": "No longer on this Mac",
  "pop.partialTitle": "Some of them reached {host}",
  "pop.partialDetail": "{n} of {total} beamed. The rest are still here.",
  "pop.beamTheRest": "Beam the other {n}",
  "pop.changeFolder": "Change folder",
  "pop.runDiagnostics": "Run diagnostics",
  "pop.runningChecks": "Running checks…",
  "pop.switchHostBelow": "or switch host below",
  "pop.recent": "Recent",
  "pop.clear": "Clear",
  "pop.moreInPrefs": "+{n} more in Preferences",
  "pop.noHostYet": "No host yet",
  "pop.noHostBody": "Point me at a host and I’ll beam your screenshots there.",
  "pop.missingTitle": "{host} is not in ~/.ssh/config",
  "pop.missingBody":
    "Beams are paused, so nothing goes to another host. Bring it back, or choose another host below.",
  "pop.addHost": "Add a host",
  "pop.beamTo": "Beam to",
  "host.addEllipsis": "Add a host…",
  "host.filter": "Filter hosts…",
  "host.noMatching": "No matching hosts",
  "host.allMatchingAdded": "You've added every host matching this search.",
  "host.clearSearch": "Clear search",
  "host.noHostSelected": "No host selected",
  "host.default": "Default",
  "host.missing": "Not in ~/.ssh/config",
  "time.justNow": "just now",
  "time.minutesAgo": "{m}m ago",
  "time.hoursAgo": "{h}h ago",
  "time.daysAgo": "{d}d ago",
  "err.timeout.title": "{host} didn’t answer.",
  "err.timeout.detail": "Operation timed out after 10s",
  "err.many.title": "That is a lot of files at once.",
  "err.many.detail": "Hostbeam beams up to {n} files in one go. Nothing was sent.",
  "err.many.hint": "Drop them in smaller batches — each batch is still one beam.",
  "err.file.title": "Not sent",
  "err.auth.title": "{host} refused the key.",
  "err.auth.detail": "Permission denied (publickey)",
  "err.auth.hint": "Add your key with ssh-add, then beam again.",
  "err.perm.title": "Remote folder isn’t writable.",
  "err.perm.detail": "mkdir {folder}: permission denied",
  "err.perm.hint": "Pick another folder in Preferences.",
  "err.owner.title": "The remote folder belongs to another user.",
  "err.owner.detail": "{folder} is not owned by this login",
  "err.owner.hint": "Nothing was sent. Pick a folder of your own in Preferences.",
  "settings.language": "Language",
  "settings.languageSystem": "System",
  "prefs.appearance": "Appearance",
  "prefs.appearanceSystem": "System",
  "prefs.appearanceLight": "Light",
  "prefs.appearanceDark": "Dark",
  "ob.welcomeTitle": "Welcome to Hostbeam",
  "ob.welcomeBody": "Beam a clipboard screenshot to a remote host and get a paste-ready path back.",
  "ob.getStarted": "Get started",
  "ob.skipSetup": "Skip setup",
  "ob.chooseHost": "Choose a host",
  "ob.addHostTitle": "Add a host",
  "ob.almostDone": "Almost done",
  "ob.whereBeams": "Where should beams go?",
  "ob.fromSshConfig": "From your {config}.",
  "ob.addNotListed": "Add a host that isn’t listed",
  "ob.skipChooseLater": "Skip — choose later",
  "ob.noHostsInConfig": "No hosts in your SSH config",
  "ob.addByHand": "Add one by hand to start beaming — you can change it later.",
  "ob.testConnection": "Test connection",
  "ob.testing": "Testing…",
  "ob.reachable": "Reachable",
  "ob.couldntConnect": "Couldn’t connect",
  "ob.optional": "Optional",
  "ob.addHostBtn": "Add host",
  "ob.addAnyway": "Add anyway",
  "ob.testTheConnection": "Test the connection",
  "ob.test": "Test",
  "ob.retry": "Retry",
  "ob.connectingTo": "Connecting to {host}…",
  "ob.reachableWritable": "Reachable · folder is writable",
  "ob.didntAnswer": "{host} didn’t answer.",
  "ob.globalHotkey": "Global hotkey",
  "ob.launchAtLogin": "Launch Hostbeam at login",
  "ob.startUsing": "Start using Hostbeam",
  "ob.startAnyway": "Start anyway",
  "ob.changeHost": "Change host",
  "ob.setUp": "Set up",
  "ob.beamAgain": "Beam again",
  "field.name": "Name",
  "field.user": "User",
  "field.address": "Address",
  "field.remoteFolder": "Remote folder",
  "nav.general": "General",
  "nav.hosts": "Hosts",
  "nav.hotkey": "Hotkey",
  "nav.recent": "Recent",
  "nav.about": "About",
  "prefs.search": "Search",
  "prefs.searchSettings": "Search settings",
  "prefs.noResults": "No results",
  "hotkey.press": "Press a shortcut…",
  "hotkey.record": "Record",
  "hotkey.cancel": "Cancel",
  "common.clickEnlarge": "Click to enlarge",
  "common.back": "Back",
  "common.imagePreview": "Image preview",
  "common.closePreview": "Close preview",
  "pop.enlargeClipboard": "Enlarge clipboard preview",
  "diag.failed": "Diagnostics failed",
  "prefs.sections": "Settings sections",
  "prefs.sentenceTitle": "What a beam copies",
  "prefs.sentenceFoot":
    "Off, a beam copies just the file’s remote path, which coding agents attach as the picture itself. With a sentence around it, most of them see only text. {code} is replaced with the path. Left as it is, the sentence says “file” rather than “screenshot” for anything that isn’t a picture.",
  "prefs.copySentence": "Add a sentence around the path",
  "prefs.copySentenceSub": "Most agents then see text, not the picture",
  "prefs.reset": "Reset",
  "prefs.preview": "Preview",
  "prefs.previewFromLast": "from your last beam to {host}",
  "prefs.nothingCopied": "Nothing will be copied.",
  "prefs.addPathHint": "Add {code} so the location is included",
  "prefs.startup": "Startup",
  "prefs.showMenubar": "Show icon in the menu bar",
  "prefs.showDock": "Show in the Dock and ⌘⇥",
  "prefs.startupFoot":
    "Keep at least one of the two icons, or Hostbeam is reachable only by shortcut. A click on the Dock icon opens the popover.",
  "prefs.beaming": "Beaming",
  "prefs.beamingFoot":
    "When on, triggering Hostbeam with a default host set beams immediately — no picker.",
  "prefs.beamImmediately": "Beam immediately when triggered",
  "prefs.beamImmediatelySub": "Skip the host picker if a default exists",
  "prefs.allowUrlBeam": "Let other apps control Hostbeam",
  "prefs.allowUrlBeamSub": "A script or shortcut can beam, or switch host, with hostbeam:// links",
  "prefs.showPopover": "Show the popover while beaming",
  "prefs.showPopoverSub": "See progress and result instead of a silent beam",
  "pop.autoBeam": "Beam screenshots automatically",
  "pop.fromHost": "From the host",
  "pop.check": "Check",
  "pop.pulling": "Checking…",
  "pop.nothingNew": "Nothing new on the host.",
  "pop.devTitle": "Running on {host}",
  "pop.devHere": "open at {addr}",
  "pop.devOpen": "Open",
  "pop.devOpening": "Opening…",
  "pop.devStop": "Stop",
  "pop.devOpenAria": "Open port {port} from {host} in your browser",
  "pop.devGone": "It stopped before it could open.",
  "pop.devBlocked":
    "This server allows no forwarding, and has no nc, bash or perl to pass it through.",
  "pop.devFailed": "Couldn’t open it. Check the connection and try again.",
  "pop.openLocally": "Open on this Mac",
  "prefs.fromHost": "From the host",
  "prefs.pullIncoming": "Offer images the agent left",
  "prefs.pullIncomingSub": "Fetched only when you ask",
  "prefs.fromHostFoot":
    "Adds a Check button to the popover that fetches images your agent wrote into the host's beam folder — a browser test's screenshot, a chart a script made. Nothing is fetched on its own, and Hostbeam's own uploads are skipped. Images only.",
  "prefs.autoBeamFor": "Keep automatic beaming on for",
  "prefs.autoBeamForSub": "The switch is in the popover; it starts off every launch",
  "prefs.mins": "{n} min",
  "prefs.hour1": "1 hour",
  "prefs.hours": "{n} hours",
  "prefs.untilOff": "Until off",
  "prefs.imageSize": "Image size",
  "prefs.imageSizeFoot":
    "Screenshots are scaled down before they are sent. Vision models downsample on arrival — Claude's limit is about 1568px on the long edge — so a bigger capture costs upload time, disk, and tokens without being seen. Raise it, or turn it off, if you beam dense text. A dropped file is always sent as it is.",
  "prefs.longestEdge": "Scale down to",
  "prefs.longestEdgeSub": "Longest edge, in pixels",
  "prefs.fullSize": "Full size",
  "prefs.defaultFolder": "Default remote folder",
  "prefs.defaultFolderFoot":
    "Where screenshots land on each host. You can override it per host under Hosts.",
  "prefs.hotkeyFoot": "Press this shortcut from any app to beam the clipboard screenshot.",
  "prefs.beamShortcut": "Beam shortcut",
  "prefs.conflict": "This conflicts with {name}. Pick another shortcut.",
  "prefs.toggleTitle": "Show or hide Hostbeam",
  "prefs.toggleShortcut": "Popover shortcut",
  "prefs.toggleFoot":
    "Press it from any app to open the popover; press it again to hide it. Off until you record one.",
  "prefs.conflictBeam": "This is the beam shortcut. Pick another.",
  "prefs.conflictToggle": "This is the show/hide shortcut. Pick another.",
  "prefs.conflictAuto": "This is the automatic-beaming shortcut. Pick another.",
  "prefs.autoTitle": "Automatic beaming",
  "prefs.autoShortcut": "Turn automatic beaming on or off",
  "prefs.autoFoot":
    "Optional. Press it from any app to start beaming every screenshot you take, and again to stop. The menu-bar icon carries a dot while it is on.",
  "hotkey.none": "Not set",
  "hotkey.clear": "Clear",
  "prefs.feedback": "Feedback",
  "prefs.playSound": "Play a sound when a beam lands",
  "prefs.flashIcon": "Flash the menu-bar icon",
  "prefs.logsLoading": "Loading…",
  "prefs.logsOnlyApp": "Diagnostic logs are only recorded in the app.",
  "prefs.logsNone": "No log entries yet.",
  "prefs.logsReadErr": "Couldn’t read logs: {err}",
  "prefs.logsTitle": "Diagnostic logs",
  "prefs.logsClear": "Clear",
  "prefs.logsOpenFolder": "Open folder",
  "prefs.logsCopied": "Copied",
  "prefs.logsCopyAll": "Copy all",
  "prefs.logsDesc":
    "The last 7 days of activity — beams, every SSH/scp command, probes, and errors. Copy this when reporting an issue.",
  "prefs.aboutVersion": "Version {v}",
  "prefs.aboutDesc":
    "A small menu-bar utility for beaming a clipboard screenshot to a remote SSH host and getting a paste-ready path back.",
  "prefs.checkUpdates": "Check for updates",
  "prefs.latestVersion": "You’re on the latest version",
  "prefs.aboutPrivacy": "Nothing leaves your Mac except what you beam.",
  "prefs.website": "Website",
  "prefs.privacyPolicy": "Privacy policy",
  "prefs.terms": "Terms",
  "prefs.changelog": "What's new",
  "prefs.openSource": "Open source licenses",
  "prefs.openSourceDesc":
    "Hostbeam for Mac is built with these open-source packages. Each is listed with its license and copyright; the full license texts follow.",
  "prefs.openSourceTexts": "License texts",
  "prefs.source": "Source",
  "prefs.privacy": "Privacy",
  "prefs.licenses": "Licenses",
  "prefs.sendFeedback": "Send feedback",
  "prefs.diagnosticLogs": "Diagnostic logs",
  "prefs.requestFeature": "Request a feature",
  "prefs.shareHostbeam": "Share Hostbeam",
  "prefs.shareText":
    "Hostbeam beams a screenshot from your Mac straight to your own server over SSH, and gives you the line to paste to your coding agent.",
  "prefs.shareTitle": "Hostbeam: beam a screenshot from your Mac to your own server over SSH",
  "prefs.shareCopyLink": "Copy Link",
  "prefs.shareMore": "More…",
  "prefs.shareCopied": "Link copied",
  "prefs.resetConfirm": "Click again to reset everything",
  "prefs.resetToDefaults": "Reset to defaults…",
  "prefs.nothingBeamed": "Nothing beamed yet",
  "prefs.nothingBeamedSub": "Beams you send show up here, ready to copy again.",
  "prefs.clearAll": "Clear all",
  "prefs.beamCountOne": "{n} beam",
  "prefs.beamCountMany": "{n} beams",
  "prefs.recentFootOne":
    "The last screenshot you beamed. Copy puts it on the clipboard again, as the beam did; nothing is re-sent.",
  "prefs.recentFootMany":
    "The last {n} screenshots you beamed. Copy puts one on the clipboard again, as the beam did; nothing is re-sent.",
  "prefs.copySentenceAria": "Copy for pasting",
  "prefs.removeHistory": "Remove from history",
  "prefs.retest": "Re-test",
  "prefs.addToHostbeam": "Add to Hostbeam",
  "prefs.editableManual": "Editable — added manually",
  "prefs.fromConfig": "From your ~/.ssh/config",
  "prefs.lastBeamed": "Last beamed",
  "prefs.never": "Never",
  "prefs.setForHost": "Set just for this host",
  "prefs.usingDefault": "Using the default",
  "prefs.useDefault": "Use default",
  "prefs.connection": "Connection",
  "prefs.unreachable": "Unreachable",
  "prefs.defaultHost": "Default host",
  "prefs.setAsDefault": "Set as default",
  "prefs.makeDefaultAsk": "Beams still go to {host}.",
  "prefs.notNow": "Not now",
  "prefs.diagnostics": "Diagnostics",
  "prefs.openTerminal": "Open in Terminal",
  "prefs.pairAction": "Share to iPhone",
  "prefs.pairTitle": "Pair with iPhone",
  "prefs.pairBody":
    "Scan this with your iPhone's camera to add this host in Hostbeam. Connection info only — no keys.",
  "prefs.pairCopy": "Copy link",
  "prefs.pairCopied": "Copied",
  "license.devices": "Devices",
  "license.devicesOf": "{n} of 3",
  "prefs.storage": "Check storage",
  "prefs.storageLine": "{n} files · {size}",
  "prefs.storageEmpty": "No beamed screenshots on this host.",
  "prefs.storageFailed": "Couldn't check — is the host reachable?",
  "prefs.cleanup": "Clean up…",
  "prefs.cleanupConfirm": "Delete {n} beamed files?",
  "prefs.cleanupDone": "Removed {n}.",
  "prefs.pairAuthTitle": "Authorize the iPhone",
  "prefs.pairAuthBody":
    "Paste the phone’s public key (Hostbeam on iPhone → Hosts → This device’s SSH key — the copy usually syncs to this Mac’s clipboard). Hostbeam installs it over your existing SSH access.",
  "prefs.pairAuthorizeDevice": "Authorize",
  "prefs.authorizeDevice": "Authorize {device}",
  "prefs.deviceAuthorized": "{device} authorized",
  "prefs.deviceAlready": "Already authorized",
  "prefs.pairAuthBodyMore": "Or paste a new device’s public key.",
  "prefs.devicesTitle": "Paired devices",
  "prefs.devicesSub":
    "Devices you have authorized from this Mac. Removing one here does not revoke it on hosts it is already on.",
  "prefs.devicesForget": "Forget this device",
  "prefs.pairAuthRemembered": "Installed — {device} is one click on other hosts now.",
  "prefs.pairAuthFirstTime": "This Mac remembers it, so other hosts take one click.",
  "prefs.pairAuthInstall": "Install key on {host}",
  "prefs.pairAuthDone": "Key installed — the iPhone can beam here now.",
  "prefs.pairAuthFail": "Couldn’t install the key — check the connection and try again.",
  "prefs.inHostbeam": "In Hostbeam",
  "prefs.inHostbeamFoot":
    "These hosts appear in the menu-bar popover. Keys and passphrases are never stored.",
  "prefs.checkAllAria": "Check all hosts",
  "prefs.checkAll": "Check all",
  "prefs.checking": "Checking…",
  "prefs.noHostYet": "No host yet",
  "prefs.searchOrManual": "Search your SSH config below, or add one manually.",
  "prefs.collapse": "Collapse",
  "prefs.expand": "Expand",
  "prefs.manual": "Manual",
  "prefs.missingBody":
    "No longer in ~/.ssh/config. Hostbeam keeps it so a beam never goes to another host instead, and it works again once it’s back. Remove it if it’s gone for good.",
  "prefs.moveUp": "Move up",
  "prefs.moveDown": "Move down",
  "prefs.checked": "Checked {time}",
  "prefs.addAHost": "Add a host",
  "prefs.addManually": "Add manually",
  "prefs.everyHostAdded": "Every host in your config is already added.",
  "prefs.noMatchingConfig": "No matching hosts in ~/.ssh/config.",
  "prefs.hostsAdded": "{added} added",
  "prefs.hostsManual": "{manual} manual",
  "prefs.hostsAllAdded": "all added",
  "prefs.hostsInPre": "{count} in",
  "prefs.removeAria": "Remove {host}",
  "prefs.moveUpAria": "Move {host} up",
  "prefs.moveDownAria": "Move {host} down",
  "prefs.cancel": "Cancel",
  "prefs.close": "Close",
  "prefs.addressExample": "10.4.0.12 or host.example.com",
  "prefs.optionalCheck": "Optional — check before adding",
  "prefs.connectsAs": "Connects as {target}",
  "prefs.diagTitle": "Diagnostics — {host}",
  "prefs.diagAllPassed": "All checks passed",
  "prefs.diagWarnings": "Reachable with warnings",
  "prefs.diagUnreachable": "Host unreachable",
  "prefs.runAgain": "Run again",
  "prefs.nameTaken": "A host with this name already exists.",
  "nav.license": "License",
  "pop.buyLicense": "Buy a license…",
  "pop.enterKey": "Enter key…",
  "pop.remind": "Enjoying Hostbeam? Get a license",
  "pop.unlicensed": "Unlicensed",
  "pop.licenseTitle": "Hostbeam is free to try for as long as you like.",
  "pop.licenseBody": "If you keep using it, please buy a license: {price}, once.",
  "license.plan": "Plan",
  "license.freePlan": "Free",
  "license.freePlanSub": "Every feature, no limit — with a reminder now and then",
  "license.freeFoot": "The reminder’s count stays on this Mac; nothing about your usage leaves it.",
  "license.retiredSub": "Every feature, no limit, no reminder",
  "license.retiredFoot":
    "Hostbeam is free, for good; licenses are no longer sold. Nothing about your usage leaves this Mac.",
  "license.licensed": "Licensed",
  "license.licensedFoot": "Thanks for supporting Hostbeam.",
  "license.active": "Active",
  "license.graceSub":
    "Couldn’t reach the license service lately — Hostbeam keeps working and revalidates automatically.",
  "license.allUpdates": "Every Hostbeam 1 update included",
  "license.buyTitle": "Get a license",
  "license.buy": "Buy Hostbeam",
  "license.buySub": "One payment · every Hostbeam 1 update · 3 Macs",
  "license.buyBtn": "Buy…",
  "license.buyFoot":
    "Hostbeam is free to try for as long as you like. If you keep using it, please buy a license: {price}, once. It hides the reminder on up to 3 Macs, and every Hostbeam 1 update is included.",
  "license.enterTitle": "License key",
  "license.enterFoot": "Your key is on the checkout page and in your purchase email.",
  "license.keyPlaceholder": "XXXXXX-XXXXXX-XXXXXX-XXXXXX",
  "license.activate": "Activate",
  "license.activating": "Activating…",
  "license.deactivate": "Deactivate this Mac",
  "license.deactivateBtn": "Deactivate…",
  "license.deactivateFoot": "Frees this seat so the license can be used on another Mac.",
  "license.errInvalid": "That key doesn’t look right. Check it against your purchase email.",
  "license.errSeats": "This key is already active on 3 Macs. Deactivate one first.",
  "license.errNetwork": "Couldn’t reach the license service. Check your connection and try again.",
  "license.errStorage":
    "The key checked out but couldn’t be saved to your Keychain. Try activating again.",
  "license.errUnconfigured": "Licensing isn’t live yet in this build.",
  "pop.preferences": "Preferences",
  "pop.quit": "Quit Hostbeam",
  "pop.updateAvailable": "Update available",
  "pop.updateDismiss": "Dismiss",
  "pop.updateSkip": "Skip for now",
  "pop.updatedTo": "Updated to {v}.",
  "prefs.updates": "Updates",
  "prefs.checkUpdatesAuto": "Check for updates automatically",
  "prefs.installUpdatesAuto": "Install updates automatically",
  "prefs.installUpdatesAutoSub": "Relaunches when you’re not using it",
  "prefs.updatesFoot": "Hostbeam asks download.hostbeam.app for the newest version once a day.",
  "prefs.updateAvailable": "Version {v} is available.",
  "prefs.updateInstall": "Update & relaunch",
  "prefs.updateInstalling": "Updating…",
  "prefs.updateError": "Couldn’t check for updates. Try again later.",
};

// Every other locale is its own chunk, loaded when it becomes the active one:
// a window parses English plus at most one more, not all eight.
const LOADERS: Record<Exclude<Locale, "en">, () => Promise<{ default: Dict }>> = {
  fr: () => import("./locales/fr"),
  ja: () => import("./locales/ja"),
  es: () => import("./locales/es"),
  de: () => import("./locales/de"),
  zh: () => import("./locales/zh"),
  pt: () => import("./locales/pt"),
  ko: () => import("./locales/ko"),
};

const DICTS: Partial<Record<Locale, Dict>> = { en };

let locale: Locale = "en";
let pending: Promise<void> = Promise.resolve();

function systemLocale(): Locale {
  const base = (navigator.language || "en").toLowerCase().split("-")[0];
  return (SUPPORTED as readonly string[]).includes(base) ? (base as Locale) : "en";
}

/** Resolve "system"/code/undefined to a supported locale. */
function resolve(setting?: string): Locale {
  if (setting && setting !== "system" && (SUPPORTED as readonly string[]).includes(setting)) {
    return setting as Locale;
  }
  return systemLocale();
}

/** A string in the active locale. Until that locale's dictionary has loaded —
 *  the entry points wait for it before the first render — English stands in. */
export function t(key: string, vars?: Record<string, string | number>): string {
  let s = DICTS[locale]?.[key] ?? en[key] ?? key;
  if (vars) {
    for (const k of Object.keys(vars)) {
      s = s.split(`{${k}}`).join(String(vars[k]));
    }
  }
  return s;
}

/** Apply the locale from the user's setting ("system" / code). Resolves once
 *  its dictionary is in; a dictionary that arrives after the switch announces
 *  itself with `hb:locale`, which `useHBConfig` re-renders on. */
export function setLocaleFromSetting(setting?: string): Promise<void> {
  const next = resolve(setting);
  locale = next;
  const w = window as unknown as { i18nLocale?: string };
  w.i18nLocale = next;
  try {
    document.documentElement.lang = next;
  } catch {
    /* no document (tests) */
  }
  if (DICTS[next]) return Promise.resolve();
  pending = LOADERS[next as Exclude<Locale, "en">]()
    .then((m) => {
      DICTS[next] = m.default;
      if (locale === next) window.dispatchEvent(new Event("hb:locale"));
    })
    .catch(() => {
      /* a missing chunk leaves English showing, which is what t falls back to */
    });
  return pending;
}

/** Settles when the dictionary last asked for has loaded (or failed to). */
export function localeReady(): Promise<void> {
  return pending;
}

function storedSetting(): string | undefined {
  try {
    return HB.load().settings?.locale;
  } catch {
    return undefined;
  }
}

// Initialise from the stored setting, else the system locale. Every window
// shares the store, so the HUD — which never loads the config itself — speaks
// the user's chosen language too.
void setLocaleFromSetting(storedSetting());

// Re-resolve live when the language setting changes (same- and cross-window).
// On the originating window (which sees `hb:config`), also rebuild the native
// tray menu so its labels follow the new language without a restart.
window.addEventListener("hb:config", (e) => {
  const before = locale;
  void setLocaleFromSetting((e as CustomEvent).detail?.settings?.locale);
  if (locale !== before) {
    refreshTrayMenu(locale).catch(() => {});
  }
});
window.addEventListener("storage", () => {
  // Cross-window: another window changed the config in (shared) localStorage.
  void setLocaleFromSetting(storedSetting());
});

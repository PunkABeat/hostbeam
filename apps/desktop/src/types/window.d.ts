// Ambient declaration of the few genuinely-global surfaces the app still uses on
// `window` after the UI detach (ADR 0011): the resolved locale (src/i18n.ts),
// the app-wiring callbacks the entry points publish for the views, and the
// Safari-prefixed AudioContext. Everything else — React, the design system, the
// config store, `t`, the Rust commands (lib/ipc.ts) — is imported directly as
// ES modules.

declare global {
  interface Window {
    // The resolved locale (src/i18n.ts).
    i18nLocale?: string;

    // App wiring published by the entry points / config-bridge, read by the views.
    openPreferences?: (tab?: string) => void;
    focusPrimary?: () => void;
    applyHotkey?: (keys: string[]) => void;
    /** Register (or with null/empty, clear) the show/hide shortcut in Rust. */
    applyToggleHotkey?: (keys: string[] | null | undefined) => void;
    /** Register (or with null/empty, clear) the automatic-beaming shortcut. */
    applyAutoHotkey?: (keys: string[] | null | undefined) => void;
    /** What Rust calls with every message it sends (src/lib/rust-bridge.ts). */
    __hbReceive?: (msg: unknown) => void;

    // Safari-prefixed AudioContext used by the optional beam sound.
    webkitAudioContext?: typeof AudioContext;
  }
}

export {};

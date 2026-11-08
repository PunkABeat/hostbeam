// A screen mounted in jsdom the way its entry point mounts it: React on a
// root, the design system's styles injected, the config in localStorage, no
// Rust (the transport says it is not there, so lib/ipc answers with its
// browser-dev mocks). Timers are faked so a simulated beam can be stepped.
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { vi } from "vitest";

import { setLocaleFromSetting } from "../i18n";
import { HB } from "../lib/config";
import { resetRustBridgeForTests } from "../lib/rust-bridge";
import type { Config } from "../types/config";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

export interface Screen {
  el: HTMLElement;
  /** The page's visible text, whitespace collapsed. */
  text: () => string;
  /** The first button whose text or accessible name is `name`. */
  button: (name: string) => HTMLButtonElement;
  click: (target: Element | null) => Promise<void>;
  /** Step the fake clock, flushing React. */
  tick: (ms: number) => Promise<void>;
  unmount: () => Promise<void>;
}

export function prepare(): void {
  localStorage.clear();
  window.location.hash = "";
  resetRustBridgeForTests();
  setLocaleFromSetting("en");
  vi.useFakeTimers();
}

export async function cleanup(screen: Screen | null): Promise<void> {
  await screen?.unmount();
  vi.useRealTimers();
  localStorage.clear();
  setLocaleFromSetting("en");
}

/** Persist `patch` over the defaults, then mount `node`. */
export async function mount(node: ReactElement, patch: Partial<Config> = {}): Promise<Screen> {
  HB.save({ ...HB.load(), ...patch });
  const el = document.createElement("div");
  el.className = "hb-wrap";
  document.body.appendChild(el);
  const root: Root = createRoot(el);
  await act(async () => root.render(node));
  const buttons = () => Array.from(el.querySelectorAll<HTMLButtonElement>("button"));
  return {
    el,
    text: () => (el.textContent ?? "").replace(/\s+/g, " ").trim(),
    button: (name) => {
      const hit = buttons().find(
        (b) => b.textContent?.trim() === name || b.getAttribute("aria-label") === name,
      );
      if (!hit)
        throw new Error(
          `no button "${name}" among: ${buttons()
            .map((b) => b.textContent?.trim() || b.getAttribute("aria-label"))
            .join(" | ")}`,
        );
      return hit;
    },
    click: async (target) => {
      if (!target) throw new Error("nothing to click");
      await act(async () => {
        target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      });
    },
    tick: (ms) =>
      act(async () => {
        vi.advanceTimersByTime(ms);
      }),
    unmount: async () => {
      await act(async () => root.unmount());
      el.remove();
    },
  };
}

/** Type into a React-controlled input: set the value the way a keypress
 *  would, then let React hear it. */
export async function type(
  input: HTMLInputElement | HTMLSelectElement,
  value: string,
): Promise<void> {
  const proto =
    input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  await act(async () => {
    setter?.call(input, value);
    input.dispatchEvent(
      new Event(input instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }),
    );
  });
}

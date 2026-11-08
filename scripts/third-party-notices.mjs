#!/usr/bin/env node
// Third-party notices: what open-source software ships inside each Hostbeam
// binary, and under which licence. The MIT and Apache-2.0 families both
// require the copyright notice and licence text to travel with a binary
// that contains the code, so every app has an "Open source licenses"
// screen, and this script is what fills it. Nothing is typed by hand: the
// Mac list comes from `cargo metadata` and the desktop's npm production
// tree, the iPhone list from BeamEngine's Package.resolved, the website's
// from its own package.json — plus the font and the icon set, which no
// package manager knows about (§ EXTRAS below).
//
//   node scripts/third-party-notices.mjs          # regenerate the three files
//   node scripts/third-party-notices.mjs --check  # exit 1 if any is stale
//
// The release scripts run --check, so a dependency bump cannot ship without
// its notice. Licence *texts* are the canonical SPDX ones in
// scripts/third-party-notices/texts/, printed once each; per package we keep
// the copyright lines from its own licence file, which is what the notice
// clause actually asks for. A dual-licensed package ("MIT OR Apache-2.0") is
// taken under one of its options — PREFERENCE, most permissive first — the
// way cargo-about does it; "A AND B" keeps both.
//
// Outputs (all committed):
//   apps/desktop/src/generated/third-party-notices.json   Mac (Rust + npm + extras)
//   apps/mobile/App/ThirdPartyNotices.json                iPhone (Swift + extras)
//   apps/web/src/generated/third-party-notices.json       the website itself
// The /licenses page on the site reads all three, the way Footer.astro reads
// CHANGELOG.md off disk at build time.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEXTS = join(ROOT, "scripts/third-party-notices/texts");
const CHECK = process.argv.includes("--check");

// Among "A OR B" alternatives, the first of these wins. Anything not listed
// is an error: a new licence family needs a text file and a deliberate look.
const PREFERENCE = [
  "MIT",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "Zlib",
  "0BSD",
  "MIT-0",
  "Unlicense",
  "CC0-1.0",
  "Unicode-3.0",
  "CDLA-Permissive-2.0",
  "MPL-2.0",
  "OFL-1.1",
  "Apache-2.0 WITH LLVM-exception",
];

// Packages whose manifest carries no licence field. Each one was read by hand.
const LICENSE_OVERRIDES = {
  // README § License: "MIT or MIT/Apache 2.0 where applicable."
  "tauri-nspanel": "MIT",
};

// Shipped but unknown to any package manager. The font is embedded in all
// three apps (packages/ui, apps/mobile/App/Fonts); the icon set in
// packages/ui/src/components/Icon.tsx is Lucide's paths, inlined.
const EXTRAS = {
  geist: {
    name: "Geist",
    version: "1.x",
    licenses: ["OFL-1.1"],
    url: "https://github.com/vercel/geist-font",
    copyright: ["Copyright 2024 The Geist Project Authors (https://github.com/vercel/geist-font)"],
  },
  lucide: {
    name: "Lucide Icons",
    version: "0.x",
    licenses: ["ISC"],
    url: "https://lucide.dev",
    copyright: [
      "Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT).",
      "All other copyright (c) for Lucide are held by Lucide Contributors 2022.",
    ],
  },
};

// ---------------------------------------------------------------------------
// SPDX expressions

/** "A OR B", "A/B", "(A OR B) AND C" → the licence ids this package ships under. */
function chooseLicenses(expr, pkgName) {
  const norm = expr.replace(/\s*\/\s*/g, " OR ").trim();
  // Conjunctions first: each side is a (possibly parenthesised) disjunction.
  return norm.split(/\s+AND\s+/).map((part) => {
    const alts = part
      .replace(/^\(|\)$/g, "")
      .split(/\s+OR\s+/)
      .map((s) => s.trim());
    const pick = PREFERENCE.find((id) => alts.includes(id));
    if (!pick) throw new Error(`${pkgName}: no preferred licence in "${expr}" — extend PREFERENCE`);
    return pick;
  });
}

function copyrightLines(text) {
  const out = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!/copyright/i.test(line)) continue;
    // Skip the boilerplate sentences that mention the word without being a notice.
    if (/copyright (notice|holder|owner|law)/i.test(line) && !/\(c\)|©|\d{4}/.test(line)) continue;
    if (/^"?copyright"? (shall|means)/i.test(line)) continue;
    if (!/\(c\)|©|\d{4}/i.test(line)) continue;
    if (line.length > 200) continue;
    // A notice names the holder; their email is not part of it.
    const clean = line.replace(/\s*<[^>]*@[^>]*>/g, "").replace(/\s+/g, " ").trim();
    if (!out.includes(clean)) out.push(clean);
    if (out.length === 4) break;
  }
  return out;
}

function readLicenseFiles(dir) {
  if (!existsSync(dir)) return { license: "", notice: "" };
  const files = readdirSync(dir);
  const lic = files.filter((f) => /^(LICEN[CS]E|COPYING)/i.test(f)).sort();
  const not = files.filter((f) => /^NOTICE/i.test(f)).sort();
  const read = (names) => names.map((f) => readFileSync(join(dir, f), "utf8")).join("\n");
  return { license: read(lic), notice: read(not).trim() };
}

function entry({ name, version, expr, url, dir, authors }) {
  // The site and the apps render it as a link: anything else resolves against /licenses/ and 404s.
  if (!/^https?:\/\//.test(url)) throw new Error(`${name}@${version}: url is not absolute: ${url}`);
  const { license, notice } = readLicenseFiles(dir);
  let copyright = copyrightLines(license);
  if (copyright.length === 0 && authors?.length) {
    // Cargo's `authors` carries emails; a notice wants names.
    copyright = authors.map((a) => a.replace(/\s*<[^>]*>/g, "").trim()).filter(Boolean).slice(0, 3);
  }
  const e = { name, version, licenses: chooseLicenses(expr, name), url, copyright };
  if (notice) e.notice = notice;
  return e;
}

// ---------------------------------------------------------------------------
// Sources

/** Every crate linked into the Mac binary, for both halves of the universal build. */
function rustPackages(manifest) {
  const byKey = new Map();
  for (const target of ["aarch64-apple-darwin", "x86_64-apple-darwin"]) {
    const meta = JSON.parse(
      execFileSync(
        "cargo",
        ["metadata", "--format-version", "1", "--manifest-path", manifest, "--filter-platform", target],
        { encoding: "utf8", maxBuffer: 64 << 20 },
      ),
    );
    const pkgs = new Map(meta.packages.map((p) => [p.id, p]));
    const nodes = new Map(meta.resolve.nodes.map((n) => [n.id, n]));
    const seen = new Set();
    const stack = [meta.resolve.root];
    while (stack.length) {
      const id = stack.pop();
      if (seen.has(id)) continue;
      seen.add(id);
      for (const d of nodes.get(id).deps) {
        // Only what is linked into the binary: normal dependencies. Build
        // dependencies run in build scripts on the developer's Mac, and a
        // proc-macro runs inside the compiler and emits code — neither's own
        // code ships. This is cargo-about's default cut as well.
        if (!d.dep_kinds.some((k) => k.kind === null)) continue;
        if (pkgs.get(d.pkg).targets.some((t) => t.kind.includes("proc-macro"))) continue;
        stack.push(d.pkg);
      }
    }
    for (const id of seen) {
      const p = pkgs.get(id);
      if (!p.source) continue; // the workspace's own crate
      const key = `${p.name}@${p.version}`;
      if (byKey.has(key)) continue;
      const expr = p.license ?? LICENSE_OVERRIDES[p.name];
      if (!expr) throw new Error(`${key}: no licence field — add it to LICENSE_OVERRIDES after reading it`);
      byKey.set(
        key,
        entry({
          name: p.name,
          version: p.version,
          expr,
          url: p.repository ?? p.homepage ?? gitSourceUrl(p.source) ?? `https://crates.io/crates/${p.name}`,
          dir: dirname(p.manifest_path),
          authors: p.authors,
        }),
      );
    }
  }
  return [...byKey.values()];
}

/**
 * The production npm tree of one workspace, resolved the way Node does it.
 * `@hostbeam/*` packages are ours: traversed, not listed. Names in `shallow`
 * are listed without their own dependencies — the site lists Astro, not the
 * build toolchain behind it, because only Astro's runtime reaches a browser.
 */
function npmPackages(workspaceDir, { shallow = [] } = {}) {
  const out = new Map();
  const walk = (dir, depth) => {
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    const req = createRequire(join(dir, "package.json"));
    const names = Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies });
    for (const name of names) {
      let depDir;
      try {
        depDir = dirname(req.resolve(`${name}/package.json`));
      } catch {
        // `exports` may hide package.json; walk node_modules by hand.
        let d = dir;
        while (d !== dirname(d)) {
          const cand = join(d, "node_modules", name);
          if (existsSync(join(cand, "package.json"))) {
            depDir = cand;
            break;
          }
          d = dirname(d);
        }
        if (!depDir) throw new Error(`${name}: not installed (from ${dir})`);
      }
      const dep = JSON.parse(readFileSync(join(depDir, "package.json"), "utf8"));
      const key = `${dep.name}@${dep.version}`;
      if (out.has(key)) continue;
      if (!dep.name.startsWith("@hostbeam/")) {
        const expr = typeof dep.license === "string" ? dep.license : dep.license?.type;
        if (!expr) throw new Error(`${key}: no licence field in package.json`);
        const repo = typeof dep.repository === "string" ? dep.repository : dep.repository?.url;
        out.set(
          key,
          entry({
            name: dep.name,
            version: dep.version,
            expr,
            url: cleanRepoUrl(repo) ?? dep.homepage ?? `https://www.npmjs.com/package/${dep.name}`,
            dir: depDir,
            authors: dep.author ? [typeof dep.author === "string" ? dep.author : dep.author.name] : [],
          }),
        );
      } else {
        out.set(key, null);
      }
      if (!shallow.includes(dep.name)) walk(depDir, depth + 1);
    }
  };
  walk(workspaceDir, 0);
  return [...out.values()].filter(Boolean);
}

/** "git+https://github.com/x/y?branch=v2#abc" → "https://github.com/x/y" */
function gitSourceUrl(source) {
  const m = source?.match(/^git\+([^?#]+)/);
  return m ? m[1].replace(/\.git$/, "") : undefined;
}

function cleanRepoUrl(u) {
  if (!u) return undefined;
  // npm's shorthand: "owner/repo" and "github:owner/repo" are GitHub (js-tokens uses it).
  const short = u.match(/^(github:|gitlab:|bitbucket:)?([\w.-]+\/[\w.-]+)$/);
  if (short) {
    const host = { "gitlab:": "gitlab.com", "bitbucket:": "bitbucket.org" }[short[1]] ?? "github.com";
    return `https://${host}/${short[2]}`;
  }
  const m = u.match(/github\.com[/:]([^/]+\/[^/#.]+)/);
  return m ? `https://github.com/${m[1]}` : u.replace(/^git\+/, "").replace(/\.git$/, "");
}

/** BeamEngine's pinned packages. Needs `swift package resolve` to have run, so the sources are on disk. */
function swiftPackages(packageDir) {
  const resolved = JSON.parse(readFileSync(join(packageDir, "Package.resolved"), "utf8"));
  const checkouts = join(packageDir, ".build/checkouts");
  return resolved.pins.map((pin) => {
    const url = pin.location.replace(/\.git$/, "");
    const name = url.split("/").pop();
    const dir = join(checkouts, name);
    if (!existsSync(dir)) {
      throw new Error(`${name}: not checked out — run: cd apps/mobile/BeamEngine && swift package resolve`);
    }
    const head = execFileSync("git", ["-C", dir, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (head !== pin.state.revision) {
      throw new Error(`${name}: checkout is at ${head.slice(0, 7)}, Package.resolved pins ${pin.state.revision.slice(0, 7)} — run: cd apps/mobile/BeamEngine && swift package resolve`);
    }
    const { license } = readLicenseFiles(dir);
    let expr;
    if (/Apache License/.test(license)) expr = "Apache-2.0";
    else if (/Permission is hereby granted, free of charge/.test(license)) expr = "MIT";
    else throw new Error(`${name}: licence text not recognised — teach swiftPackages() about it`);
    const e = entry({ name, version: pin.state.version ?? pin.state.revision.slice(0, 7), expr, url, dir });
    // Apple's packages ship the bare Apache text; the copyright line is in
    // every source file's header instead.
    if (e.copyright.length === 0) e.copyright = headerCopyright(join(dir, "Sources"));
    return e;
  });
}

/** The copyright line from the first Swift source file's header under `dir`. */
function headerCopyright(dir) {
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = join(d, f.name);
      if (f.isDirectory()) stack.push(p);
      else if (f.name.endsWith(".swift")) {
        const head = readFileSync(p, "utf8").split(/\r?\n/).slice(0, 20).join("\n");
        const lines = copyrightLines(head.replace(/^\s*\/\/\s?/gm, ""));
        if (lines.length) return lines.slice(0, 1);
      }
    }
  }
  return [];
}

// ---------------------------------------------------------------------------
// Assemble

function bundle(packages) {
  const sorted = [...packages].sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
  const ids = [...new Set(sorted.flatMap((p) => p.licenses))].sort();
  const licenses = {};
  for (const id of ids) {
    // "Apache-2.0 WITH LLVM-exception" is the Apache text plus the exception.
    const files = id.split(" WITH ");
    licenses[id] = files
      .map((f) => {
        const path = join(TEXTS, `${f}.txt`);
        if (!existsSync(path)) throw new Error(`no canonical text for ${f} at ${path}`);
        return readFileSync(path, "utf8").trim();
      })
      .join("\n\n");
  }
  return { packages: sorted, licenses };
}

const OUTPUTS = [
  {
    path: "apps/desktop/src/generated/third-party-notices.json",
    build: () =>
      bundle([
        ...rustPackages(join(ROOT, "apps/desktop/src-tauri/Cargo.toml")),
        ...npmPackages(join(ROOT, "apps/desktop")),
        EXTRAS.geist,
        EXTRAS.lucide,
      ]),
  },
  {
    path: "apps/mobile/App/ThirdPartyNotices.json",
    build: () => bundle([...swiftPackages(join(ROOT, "apps/mobile/BeamEngine")), EXTRAS.geist]),
  },
  {
    path: "apps/web/src/generated/third-party-notices.json",
    build: () =>
      bundle([
        ...npmPackages(join(ROOT, "apps/web"), { shallow: ["astro", "@astrojs/react"] }),
        EXTRAS.geist,
        EXTRAS.lucide,
      ]),
  },
];

let stale = 0;
for (const { path, build } of OUTPUTS) {
  const abs = join(ROOT, path);
  const next = JSON.stringify(build(), null, 2) + "\n";
  const current = existsSync(abs) ? readFileSync(abs, "utf8") : "";
  const n = JSON.parse(next).packages.length;
  if (CHECK) {
    if (current !== next) {
      stale++;
      console.error(`✗ ${path} is stale — run: node scripts/third-party-notices.mjs`);
    } else {
      console.log(`✓ ${path} (${n} packages)`);
    }
  } else {
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, next);
    console.log(`${current === next ? "=" : "w"} ${path} (${n} packages)`);
  }
}
if (stale) process.exit(1);

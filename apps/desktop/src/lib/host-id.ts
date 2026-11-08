// The id a typed-in host gets: a slug of its name, made unique among the ids
// already in use. The id keys the config (added order, folder overrides,
// Recent rows), so it never changes once given, even if the name does.

/** `"My Box"` → `my-box`; `my-box-2` when `my-box` is taken. */
export function slugId(name: string, taken: Iterable<string>): string {
  const base =
    (name || "host")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "host";
  const used = new Set(taken);
  let id = base;
  let n = 2;
  while (used.has(id)) id = `${base}-${n++}`;
  return id;
}

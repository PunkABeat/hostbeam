/* @ds-bundle: {"format":3,"namespace":"HostbeamDesignSystem_23dc0f","components":[{"name":"Button","sourcePath":"components/actions/Button.jsx"},{"name":"IconButton","sourcePath":"components/actions/IconButton.jsx"},{"name":"Badge","sourcePath":"components/feedback/Badge.jsx"},{"name":"Spinner","sourcePath":"components/feedback/Spinner.jsx"},{"name":"StatusDot","sourcePath":"components/feedback/StatusDot.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Field","sourcePath":"components/forms/Field.jsx"},{"name":"HostSelect","sourcePath":"components/forms/HostSelect.jsx"},{"name":"SegmentedControl","sourcePath":"components/forms/SegmentedControl.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Keycap","sourcePath":"components/surfaces/Keycap.jsx"},{"name":"ListRow","sourcePath":"components/surfaces/ListRow.jsx"},{"name":"Surface","sourcePath":"components/surfaces/Surface.jsx"}],"sourceHashes":{"components/actions/Button.jsx":"ecceedf3a47e","components/actions/IconButton.jsx":"5fc16b870f51","components/feedback/Badge.jsx":"adafff6fc503","components/feedback/Spinner.jsx":"cf9226a48675","components/feedback/StatusDot.jsx":"dda0c5913014","components/feedback/Tooltip.jsx":"36c42a23e289","components/forms/Field.jsx":"74e22fb36929","components/forms/HostSelect.jsx":"029bbc76eebd","components/forms/SegmentedControl.jsx":"d7c4635aac9c","components/forms/Switch.jsx":"7654a1df0610","components/surfaces/Keycap.jsx":"aa4ebeb7e198","components/surfaces/ListRow.jsx":"f2d9ff594740","components/surfaces/Surface.jsx":"741ff3b586ef","landing/landing.jsx":"79d8dd511d5e","prototypes/onboarding/flowA.jsx":"3af39f2afac0","prototypes/onboarding/flowB.jsx":"6a318dd02cd7","prototypes/onboarding/flowC.jsx":"6ad4bc15530d","prototypes/onboarding/shared.jsx":"6745cbe731b9","prototypes/onboarding/tweaks-panel.jsx":"6591467622ed","prototypes/popover/popover.jsx":"ac8b3dfd6dd0","prototypes/preferences/prefs.jsx":"4fc958254f7e","ui_kits/hostbeam-app/app.jsx":"50472ec8902e","ui_kits/hostbeam-app/data.js":"b991bac44f07","ui_kits/hostbeam-app/lists.jsx":"c1bcdf57a711","ui_kits/hostbeam-app/shell.jsx":"9f5da68c7dc6","ui_kits/hostbeam-app/states.jsx":"10714160057b","walkthrough/animations.jsx":"ebe6809a6cbe","walkthrough/walkthrough.jsx":"411b9570ce3d"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.HostbeamDesignSystem_23dc0f = window.HostbeamDesignSystem_23dc0f || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/actions/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Hostbeam — Button
   The primary action carrier. Variants: primary (the one beam action),
   secondary (neutral fill), ghost (low-emphasis). Sizes sm/md/lg.
   Styling reads design-system CSS custom properties. */

let _injected = false;
function ensureStyle() {
  if (_injected || typeof document === "undefined") return;
  _injected = true;
  const css = `
  .hb-btn{
    -webkit-appearance:none;appearance:none;border:0;cursor:pointer;
    font-family:var(--font-system);font-weight:var(--weight-semibold);
    display:inline-flex;align-items:center;justify-content:center;gap:var(--space-2);
    border-radius:var(--radius-md);white-space:nowrap;user-select:none;
    transition:var(--transition-control);position:relative;
  }
  .hb-btn:focus-visible{outline:none;box-shadow:var(--ring-focus);}
  .hb-btn:disabled{opacity:.4;cursor:default;pointer-events:none;}
  .hb-btn--block{width:100%;}
  /* sizes */
  .hb-btn--sm{height:var(--control-height-sm);padding:0 var(--space-4);font-size:var(--text-callout);}
  .hb-btn--md{height:var(--control-height);padding:0 var(--space-6);font-size:var(--text-body);}
  .hb-btn--lg{height:var(--control-height-lg);padding:0 var(--space-7);font-size:var(--text-body);}
  /* primary */
  .hb-btn--primary{background:var(--accent);color:var(--label-on-accent);box-shadow:var(--shadow-accent);}
  .hb-btn--primary:hover{background:var(--accent-hover);}
  .hb-btn--primary:active{background:var(--accent-active);transform:scale(var(--press-scale));}
  /* secondary */
  .hb-btn--secondary{background:var(--fill-secondary);color:var(--label);box-shadow:inset 0 0 0 0.5px var(--separator);}
  .hb-btn--secondary:hover{background:var(--fill-tertiary);}
  .hb-btn--secondary:active{background:var(--fill-tertiary);transform:scale(var(--press-scale));}
  /* ghost */
  .hb-btn--ghost{background:transparent;color:var(--label);}
  .hb-btn--ghost:hover{background:var(--fill-hover);}
  .hb-btn--ghost:active{background:var(--fill-active);transform:scale(var(--press-scale));}
  /* danger (rare — destructive recovery) */
  .hb-btn--danger{background:transparent;color:var(--danger);box-shadow:inset 0 0 0 0.5px color-mix(in srgb, var(--danger) 40%, transparent);}
  .hb-btn--danger:hover{background:var(--danger-tint);}
  .hb-btn--danger:active{transform:scale(var(--press-scale));}
  .hb-btn__icon{display:inline-flex;width:1em;height:1em;margin-top:-1px;}
  `;
  const el = document.createElement("style");
  el.id = "hb-button";
  el.textContent = css;
  document.head.appendChild(el);
}
function Button({
  children,
  variant = "primary",
  size = "md",
  block = false,
  icon = null,
  iconRight = null,
  disabled = false,
  type = "button",
  onClick,
  className = "",
  ...rest
}) {
  ensureStyle();
  const cls = ["hb-btn", `hb-btn--${variant}`, `hb-btn--${size}`, block ? "hb-btn--block" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    className: cls,
    disabled: disabled,
    onClick: onClick
  }, rest), icon ? /*#__PURE__*/React.createElement("span", {
    className: "hb-btn__icon"
  }, icon) : null, children, iconRight ? /*#__PURE__*/React.createElement("span", {
    className: "hb-btn__icon"
  }, iconRight) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/Button.jsx", error: String((e && e.message) || e) }); }

// components/actions/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Hostbeam — IconButton
   Compact square button for toolbar / row affordances (settings, copy,
   close, retry). Icon-only; always pass an accessible label. */

let _injected = false;
function ensureStyle() {
  if (_injected || typeof document === "undefined") return;
  _injected = true;
  const css = `
  .hb-iconbtn{
    -webkit-appearance:none;appearance:none;border:0;cursor:pointer;padding:0;
    display:inline-flex;align-items:center;justify-content:center;
    color:var(--label-secondary);background:transparent;
    border-radius:var(--radius-md);transition:var(--transition-control);
  }
  .hb-iconbtn:hover{background:var(--fill-hover);color:var(--label);}
  .hb-iconbtn:active{background:var(--fill-active);transform:scale(var(--press-scale));}
  .hb-iconbtn:focus-visible{outline:none;box-shadow:var(--ring-focus);}
  .hb-iconbtn:disabled{opacity:.4;pointer-events:none;}
  .hb-iconbtn--sm{width:22px;height:22px;}
  .hb-iconbtn--md{width:28px;height:28px;}
  .hb-iconbtn--lg{width:32px;height:32px;}
  .hb-iconbtn--solid{background:var(--fill-secondary);color:var(--label);box-shadow:inset 0 0 0 0.5px var(--separator);}
  .hb-iconbtn--solid:hover{background:var(--fill-tertiary);}
  .hb-iconbtn--accent{color:var(--accent);}
  .hb-iconbtn--accent:hover{background:var(--accent-tint);}
  .hb-iconbtn__g{display:inline-flex;}
  `;
  const el = document.createElement("style");
  el.id = "hb-iconbutton";
  el.textContent = css;
  document.head.appendChild(el);
}
function IconButton({
  icon,
  label,
  size = "md",
  variant = "plain",
  disabled = false,
  onClick,
  className = "",
  ...rest
}) {
  ensureStyle();
  const cls = ["hb-iconbtn", `hb-iconbtn--${size}`, variant !== "plain" ? `hb-iconbtn--${variant}` : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    className: cls,
    disabled: disabled,
    onClick: onClick,
    "aria-label": label,
    title: label
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "hb-iconbtn__g"
  }, icon));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Hostbeam — Badge
   Small status pill for beam/host states (Beamed, Connecting,
   Unreachable). Tone maps to semantic colors; optional leading dot. */

let _injected = false;
function ensureStyle() {
  if (_injected || typeof document === "undefined") return;
  _injected = true;
  const css = `
  .hb-badge{display:inline-flex;align-items:center;gap:var(--space-2);
    font-family:var(--font-system);font-size:var(--text-footnote);font-weight:var(--weight-semibold);
    line-height:1;padding:3px 8px;border-radius:var(--radius-full);white-space:nowrap;letter-spacing:var(--tracking-snug);}
  .hb-badge--neutral{background:var(--fill-secondary);color:var(--label-secondary);}
  .hb-badge--accent{background:var(--accent-tint);color:var(--accent);}
  .hb-badge--success{background:var(--success-tint);color:var(--success);}
  .hb-badge--warning{background:var(--warning-tint);color:var(--warning);}
  .hb-badge--danger{background:var(--danger-tint);color:var(--danger);}
  .hb-badge__dot{width:6px;height:6px;border-radius:50%;background:currentColor;flex:none;}
  .hb-badge--solid{color:#fff;}
  .hb-badge--solid.hb-badge--accent{background:var(--accent);}
  .hb-badge--solid.hb-badge--success{background:var(--success);}
  .hb-badge--solid.hb-badge--warning{background:var(--warning);}
  .hb-badge--solid.hb-badge--danger{background:var(--danger);}
  `;
  const el = document.createElement("style");
  el.id = "hb-badge";
  el.textContent = css;
  document.head.appendChild(el);
}
function Badge({
  children,
  tone = "neutral",
  solid = false,
  dot = false,
  className = "",
  ...rest
}) {
  ensureStyle();
  const cls = ["hb-badge", `hb-badge--${tone}`, solid ? "hb-badge--solid" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), dot ? /*#__PURE__*/React.createElement("span", {
    className: "hb-badge__dot"
  }) : null, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Badge.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Spinner.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Hostbeam — Spinner
   Quiet indeterminate progress for the beaming state. A thin macOS-style
   ring; no color flash. */

let _injected = false;
function ensureStyle() {
  if (_injected || typeof document === "undefined") return;
  _injected = true;
  const css = `
  @keyframes hb-spin{to{transform:rotate(360deg);}}
  .hb-spinner{display:inline-block;border-radius:50%;
    border-style:solid;border-color:var(--fill-tertiary);
    border-top-color:var(--accent);animation:hb-spin .7s linear infinite;flex:none;}
  .hb-spinner--neutral{border-top-color:var(--label-secondary);}
  .hb-spinner--onaccent{border-color:rgba(255,255,255,.35);border-top-color:#fff;}
  @media (prefers-reduced-motion: reduce){.hb-spinner{animation-duration:1.4s;}}
  `;
  const el = document.createElement("style");
  el.id = "hb-spinner";
  el.textContent = css;
  document.head.appendChild(el);
}
function Spinner({
  size = 16,
  thickness = 2,
  tone = "accent",
  className = "",
  style = {},
  ...rest
}) {
  ensureStyle();
  const cls = ["hb-spinner", tone !== "accent" ? `hb-spinner--${tone}` : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls,
    role: "status",
    "aria-label": "Loading",
    style: {
      width: size,
      height: size,
      borderWidth: thickness,
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Spinner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Spinner.jsx", error: String((e && e.message) || e) }); }

// components/feedback/StatusDot.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Hostbeam — StatusDot
   Tiny host-health / beam-status indicator. Optional soft pulse for
   "pending" (host warming up). */

let _injected = false;
function ensureStyle() {
  if (_injected || typeof document === "undefined") return;
  _injected = true;
  const css = `
  .hb-dot{display:inline-block;border-radius:50%;flex:none;position:relative;}
  .hb-dot--sm{width:6px;height:6px;}
  .hb-dot--md{width:8px;height:8px;}
  .hb-dot--lg{width:10px;height:10px;}
  .hb-dot--online{background:var(--dot-online);}
  .hb-dot--pending{background:var(--dot-pending);}
  .hb-dot--offline{background:var(--dot-offline);}
  .hb-dot--error{background:var(--dot-error);}
  .hb-dot--ring{box-shadow:0 0 0 3px color-mix(in srgb, currentColor 18%, transparent);}
  @keyframes hb-dot-pulse{0%{box-shadow:0 0 0 0 color-mix(in srgb, var(--dot-pending) 50%, transparent);}70%{box-shadow:0 0 0 5px transparent;}100%{box-shadow:0 0 0 0 transparent;}}
  .hb-dot--pulse{animation:hb-dot-pulse 1.6s var(--ease-out) infinite;}
  @media (prefers-reduced-motion: reduce){.hb-dot--pulse{animation:none;}}
  `;
  const el = document.createElement("style");
  el.id = "hb-statusdot";
  el.textContent = css;
  document.head.appendChild(el);
}
function StatusDot({
  status = "offline",
  size = "md",
  pulse = false,
  className = "",
  ...rest
}) {
  ensureStyle();
  const cls = ["hb-dot", `hb-dot--${size}`, `hb-dot--${status}`, pulse && status === "pending" ? "hb-dot--pulse" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest));
}
Object.assign(__ds_scope, { StatusDot });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/StatusDot.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Hostbeam — Tooltip
   Lightweight hover tooltip for icon buttons and truncated paths. Dark
   capsule, quick fade, sits above its trigger. */

let _injected = false;
function ensureStyle() {
  if (_injected || typeof document === "undefined") return;
  _injected = true;
  const css = `
  .hb-tip{position:relative;display:inline-flex;}
  .hb-tip__bubble{
    position:absolute;z-index:60;left:50%;transform:translateX(-50%) translateY(2px);
    bottom:calc(100% + 6px);pointer-events:none;
    background:#1d1d1f;color:#fff;font-family:var(--font-system);
    font-size:var(--text-footnote);font-weight:var(--weight-medium);line-height:1.3;
    padding:5px 8px;border-radius:var(--radius-sm);white-space:nowrap;max-width:220px;
    box-shadow:var(--shadow-menu);opacity:0;transition:opacity var(--dur-fast) var(--ease-out),transform var(--dur-fast) var(--ease-out);
  }
  .hb-tip__bubble--mono{font-family:var(--font-mono);font-size:var(--text-caption);white-space:normal;word-break:break-all;}
  .hb-tip:hover .hb-tip__bubble,.hb-tip:focus-within .hb-tip__bubble{opacity:1;transform:translateX(-50%) translateY(0);}
  .hb-tip__bubble::after{content:"";position:absolute;top:100%;left:50%;transform:translateX(-50%);
    border:4px solid transparent;border-top-color:#1d1d1f;}
  `;
  const el = document.createElement("style");
  el.id = "hb-tooltip";
  el.textContent = css;
  document.head.appendChild(el);
}
function Tooltip({
  children,
  label,
  mono = false,
  className = "",
  ...rest
}) {
  ensureStyle();
  return /*#__PURE__*/React.createElement("span", _extends({
    className: ["hb-tip", className].filter(Boolean).join(" ")
  }, rest), children, /*#__PURE__*/React.createElement("span", {
    className: ["hb-tip__bubble", mono ? "hb-tip__bubble--mono" : ""].join(" "),
    role: "tooltip"
  }, label));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Field.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Hostbeam — Field
   A labeled text input for setup (host alias, remote folder, hotkey).
   Optional leading icon, mono mode for paths, and help/error text. */

let _injected = false;
function ensureStyle() {
  if (_injected || typeof document === "undefined") return;
  _injected = true;
  const css = `
  .hb-field{display:flex;flex-direction:column;gap:var(--space-2);}
  .hb-field__label{font-size:var(--text-subhead);font-weight:var(--weight-semibold);
    color:var(--label-secondary);letter-spacing:var(--tracking-snug);}
  .hb-field__box{display:flex;align-items:center;gap:var(--space-3);
    background:var(--surface-content);border-radius:var(--radius-md);
    box-shadow:inset 0 0 0 1px var(--border-field);
    padding:0 var(--space-4);height:var(--control-height);
    transition:var(--transition-control);}
  .hb-field__box:focus-within{box-shadow:inset 0 0 0 1px var(--accent), var(--ring-focus);}
  .hb-field--invalid .hb-field__box{box-shadow:inset 0 0 0 1px var(--danger);}
  .hb-field--invalid .hb-field__box:focus-within{box-shadow:inset 0 0 0 1px var(--danger),0 0 0 3px var(--danger-tint);}
  .hb-field__icon{display:inline-flex;color:var(--label-tertiary);flex:none;}
  .hb-field__input{flex:1;min-width:0;border:0;outline:none;background:transparent;
    font-family:var(--font-system);font-size:var(--text-body);color:var(--label);padding:0;}
  .hb-field__input::placeholder{color:var(--label-tertiary);}
  .hb-field--mono .hb-field__input{font-family:var(--font-mono);font-size:var(--role-mono-size);}
  .hb-field__suffix{font-family:var(--font-mono);font-size:var(--text-caption);color:var(--label-tertiary);flex:none;}
  .hb-field__help{font-size:var(--text-footnote);color:var(--label-tertiary);}
  .hb-field--invalid .hb-field__help{color:var(--danger);}
  `;
  const el = document.createElement("style");
  el.id = "hb-field";
  el.textContent = css;
  document.head.appendChild(el);
}
function Field({
  label,
  value,
  defaultValue,
  placeholder,
  icon = null,
  suffix = null,
  mono = false,
  invalid = false,
  help,
  type = "text",
  onChange,
  className = "",
  inputProps = {},
  ...rest
}) {
  ensureStyle();
  const cls = ["hb-field", mono ? "hb-field--mono" : "", invalid ? "hb-field--invalid" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("label", _extends({
    className: cls
  }, rest), label ? /*#__PURE__*/React.createElement("span", {
    className: "hb-field__label"
  }, label) : null, /*#__PURE__*/React.createElement("span", {
    className: "hb-field__box"
  }, icon ? /*#__PURE__*/React.createElement("span", {
    className: "hb-field__icon"
  }, icon) : null, /*#__PURE__*/React.createElement("input", _extends({
    className: "hb-field__input",
    type: type,
    value: value,
    defaultValue: defaultValue,
    placeholder: placeholder,
    onChange: onChange
  }, inputProps)), suffix ? /*#__PURE__*/React.createElement("span", {
    className: "hb-field__suffix"
  }, suffix) : null), help ? /*#__PURE__*/React.createElement("span", {
    className: "hb-field__help"
  }, help) : null);
}
Object.assign(__ds_scope, { Field });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Field.jsx", error: String((e && e.message) || e) }); }

// components/forms/HostSelect.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Hostbeam — HostSelect
   macOS-style host picker. Shows the active host with a health dot and a
   chevron; opens a menu of hosts (selected one checked, default marked). */

let _injected = false;
function ensureStyle() {
  if (_injected || typeof document === "undefined") return;
  _injected = true;
  const css = `
  .hb-hostsel{position:relative;font-family:var(--font-system);}
  .hb-hostsel__btn{
    -webkit-appearance:none;appearance:none;cursor:pointer;width:100%;
    display:flex;align-items:center;gap:var(--space-3);
    height:var(--control-height);padding:0 var(--space-3) 0 var(--space-4);
    background:var(--surface-content);border:0;border-radius:var(--radius-md);
    box-shadow:inset 0 0 0 1px var(--border-field);
    transition:var(--transition-control);text-align:left;color:var(--label);
  }
  .hb-hostsel__btn:hover{background:var(--fill-hover);}
  .hb-hostsel__btn:focus-visible{outline:none;box-shadow:inset 0 0 0 1px var(--accent),var(--ring-focus);}
  .hb-hostsel__dot{width:7px;height:7px;border-radius:50%;flex:none;}
  .hb-hostsel__name{font-size:var(--text-body);font-weight:var(--weight-medium);white-space:nowrap;}
  .hb-hostsel__meta{font-family:var(--font-mono);font-size:var(--text-caption);color:var(--label-tertiary);margin-left:auto;}
  .hb-hostsel__chev{display:inline-flex;color:var(--label-tertiary);flex:none;margin-left:var(--space-2);}
  .hb-hostsel__menu{
    position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:40;
    background:var(--surface-overlay);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
    border-radius:var(--radius-lg);box-shadow:var(--shadow-menu);
    padding:var(--space-2);max-height:240px;overflow:auto;
  }
  .hb-hostsel__opt{
    display:flex;align-items:center;gap:var(--space-3);width:100%;
    padding:var(--space-3) var(--space-3);border-radius:var(--radius-sm);
    cursor:pointer;border:0;background:transparent;text-align:left;color:var(--label);
    font-family:var(--font-system);transition:background var(--dur-instant) var(--ease-standard);
  }
  .hb-hostsel__opt:hover{background:var(--accent);color:#fff;}
  .hb-hostsel__opt:hover .hb-hostsel__omETA,.hb-hostsel__opt:hover .hb-hostsel__obadge{color:rgba(255,255,255,.85);}
  .hb-hostsel__oname{font-size:var(--text-body);font-weight:var(--weight-medium);white-space:nowrap;}
  .hb-hostsel__obadge{font-size:9px;text-transform:uppercase;letter-spacing:.04em;color:var(--label-tertiary);
    border:1px solid var(--separator);border-radius:var(--radius-xs);padding:1px 4px;margin-left:var(--space-2);}
  .hb-hostsel__ometa{font-family:var(--font-mono);font-size:var(--text-caption);color:var(--label-tertiary);margin-left:auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-left:var(--space-3);}
  .hb-hostsel__check{margin-left:auto;display:inline-flex;}
  .hb-hostsel__opt:hover .hb-hostsel__ometa,.hb-hostsel__opt:hover .hb-hostsel__obadge{color:rgba(255,255,255,.85);border-color:rgba(255,255,255,.4);}
  .hb-hostsel__opt.is-active{background:var(--accent);color:#fff;}
  .hb-hostsel__opt.is-active .hb-hostsel__ometa,.hb-hostsel__opt.is-active .hb-hostsel__obadge{color:rgba(255,255,255,.85);border-color:rgba(255,255,255,.4);}
  .hb-hostsel__search{position:sticky;top:calc(var(--space-2) * -1);margin:calc(var(--space-2) * -1) calc(var(--space-2) * -1) var(--space-2);
    padding:var(--space-3);background:var(--surface-popover);display:flex;align-items:center;gap:var(--space-2);
    box-shadow:0 0.5px 0 var(--separator);z-index:1;}
  .hb-hostsel__search svg{color:var(--label-tertiary);flex:none;}
  .hb-hostsel__search input{flex:1;min-width:0;border:0;outline:none;background:transparent;font-family:var(--font-system);font-size:var(--text-body);color:var(--label);}
  .hb-hostsel__empty{padding:var(--space-4) var(--space-3);text-align:center;font-size:var(--text-callout);color:var(--label-tertiary);}
  `;
  const el = document.createElement("style");
  el.id = "hb-hostselect";
  el.textContent = css;
  document.head.appendChild(el);
}
const DOT = {
  online: "var(--dot-online)",
  pending: "var(--dot-pending)",
  offline: "var(--dot-offline)",
  error: "var(--dot-error)"
};
function HostSelect({
  hosts = [],
  value,
  onChange,
  className = "",
  searchable,
  ...rest
}) {
  ensureStyle();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState(0);
  const ref = React.useRef(null);
  const listRef = React.useRef(null);
  const btnRef = React.useRef(null);
  const activeHost = hosts.find(h => h.id === value) || hosts[0];
  const useSearch = searchable != null ? searchable : hosts.length > 5;
  const norm = q.trim().toLowerCase();
  const filtered = useSearch && norm ? hosts.filter(h => `${h.name} ${h.address || ""}`.toLowerCase().includes(norm)) : hosts;
  React.useEffect(() => {
    if (!open) return;
    setQ("");
    setActive(0);
    const onDoc = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  React.useEffect(() => {
    setActive(0);
  }, [q]);
  React.useEffect(() => {
    // With no search field there's no autoFocus input, so focus the menu itself
    // to receive arrow / Enter / Escape keys for a complete keyboard path.
    if (open && !useSearch && listRef.current) listRef.current.focus();
  }, [open, useSearch]);
  React.useEffect(() => {
    const el = listRef.current && listRef.current.querySelector(".hb-hostsel__opt.is-active");
    if (el && el.scrollIntoView) el.scrollIntoView({
      block: "nearest"
    });
  }, [active, open]);
  const choose = h => {
    if (h) {
      onChange && onChange(h.id);
      setOpen(false);
      if (btnRef.current) btnRef.current.focus();
    }
  };
  const onKey = e => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(a => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(a => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(filtered[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      if (btnRef.current) btnRef.current.focus();
    }
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ["hb-hostsel", className].filter(Boolean).join(" "),
    ref: ref
  }, rest), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "hb-hostsel__btn",
    ref: btnRef,
    "aria-haspopup": "listbox",
    "aria-expanded": open,
    onClick: () => setOpen(o => !o),
    onKeyDown: e => {
      if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault();
        setOpen(true);
      }
    }
  }, activeHost ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "hb-hostsel__dot",
    style: {
      background: DOT[activeHost.status] || DOT.offline
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "hb-hostsel__name"
  }, activeHost.name), activeHost.address ? /*#__PURE__*/React.createElement("span", {
    className: "hb-hostsel__meta"
  }, activeHost.address) : null) : /*#__PURE__*/React.createElement("span", {
    className: "hb-hostsel__name",
    style: {
      color: "var(--label-tertiary)"
    }
  }, "No host selected"), /*#__PURE__*/React.createElement("span", {
    className: "hb-hostsel__chev"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "m6 9 6 6 6-6"
  })))), open ? /*#__PURE__*/React.createElement("div", {
    className: "hb-hostsel__menu",
    role: "listbox",
    ref: listRef,
    tabIndex: -1,
    style: {
      outline: "none"
    },
    onKeyDown: useSearch ? undefined : onKey
  }, useSearch ? /*#__PURE__*/React.createElement("div", {
    className: "hb-hostsel__search"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.1",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m21 21-4.35-4.35"
  })), /*#__PURE__*/React.createElement("input", {
    autoFocus: true,
    value: q,
    onChange: e => setQ(e.target.value),
    onKeyDown: onKey,
    placeholder: "Filter hosts\u2026",
    "aria-label": "Filter hosts"
  })) : null, filtered.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "hb-hostsel__empty"
  }, "No matching hosts") : filtered.map((h, i) => /*#__PURE__*/React.createElement("button", {
    key: h.id,
    type: "button",
    className: "hb-hostsel__opt" + (i === active ? " is-active" : ""),
    role: "option",
    "aria-selected": h.id === value,
    onMouseEnter: () => setActive(i),
    onClick: () => choose(h)
  }, /*#__PURE__*/React.createElement("span", {
    className: "hb-hostsel__dot",
    style: {
      background: DOT[h.status] || DOT.offline
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "hb-hostsel__oname"
  }, h.name), h.isDefault ? /*#__PURE__*/React.createElement("span", {
    className: "hb-hostsel__obadge"
  }, "Default") : null, h.id === value ? /*#__PURE__*/React.createElement("span", {
    className: "hb-hostsel__check"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "15",
    height: "15",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.4",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6 9 17l-5-5"
  }))) : /*#__PURE__*/React.createElement("span", {
    className: "hb-hostsel__ometa"
  }, h.address)))) : null);
}
Object.assign(__ds_scope, { HostSelect });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/HostSelect.jsx", error: String((e && e.message) || e) }); }

// components/forms/SegmentedControl.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Hostbeam — SegmentedControl
   macOS segmented control for 2–4 short, mutually-exclusive options
   (e.g. Diagnostics tabs: Summary / Log). Selected segment lifts on a
   sliding white pill. */

let _injected = false;
function ensureStyle() {
  if (_injected || typeof document === "undefined") return;
  _injected = true;
  const css = `
  .hb-seg{display:inline-flex;position:relative;background:var(--fill-secondary);
    border-radius:var(--radius-md);padding:2px;box-shadow:inset 0 0 0 0.5px var(--separator);
    font-family:var(--font-system);}
  .hb-seg__opt{
    -webkit-appearance:none;appearance:none;border:0;background:transparent;cursor:pointer;
    position:relative;z-index:1;flex:1;white-space:nowrap;
    font-size:var(--text-callout);font-weight:var(--weight-medium);color:var(--label-secondary);
    height:24px;padding:0 var(--space-5);border-radius:calc(var(--radius-md) - 2px);
    transition:color var(--dur-fast) var(--ease-standard);
  }
  .hb-seg__opt--on{color:var(--label);font-weight:var(--weight-semibold);}
  .hb-seg__opt:focus-visible{outline:none;box-shadow:var(--ring-focus);}
  .hb-seg__thumb{
    position:absolute;top:2px;bottom:2px;z-index:0;background:var(--surface-content);
    border-radius:calc(var(--radius-md) - 2px);box-shadow:var(--shadow-control);
    transition:transform var(--dur-fast) var(--ease-out),width var(--dur-fast) var(--ease-out);
  }
  `;
  const el = document.createElement("style");
  el.id = "hb-segmented";
  el.textContent = css;
  document.head.appendChild(el);
}
function SegmentedControl({
  options = [],
  value,
  onChange,
  className = "",
  ...rest
}) {
  ensureStyle();
  const idx = Math.max(0, options.findIndex(o => (o.value ?? o) === value));
  const ref = React.useRef(null);
  const [thumb, setThumb] = React.useState({
    left: 0,
    width: 0
  });
  React.useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const btns = root.querySelectorAll(".hb-seg__opt");
    const el = btns[idx];
    if (el) setThumb({
      left: el.offsetLeft,
      width: el.offsetWidth
    });
  }, [idx, options.length]);
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ["hb-seg", className].filter(Boolean).join(" "),
    ref: ref,
    role: "tablist"
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "hb-seg__thumb",
    style: {
      transform: `translateX(${thumb.left - 2}px)`,
      width: thumb.width
    }
  }), options.map(o => {
    const v = o.value ?? o;
    const label = o.label ?? o;
    return /*#__PURE__*/React.createElement("button", {
      key: v,
      type: "button",
      role: "tab",
      "aria-selected": v === value,
      className: ["hb-seg__opt", v === value ? "hb-seg__opt--on" : ""].join(" "),
      onClick: () => onChange && onChange(v)
    }, label);
  }));
}
Object.assign(__ds_scope, { SegmentedControl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SegmentedControl.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Hostbeam — Switch
   macOS-style toggle for binary settings (e.g. "Upload immediately",
   "Launch at login"). Accent fill when on; calm 140ms slide. */

let _injected = false;
function ensureStyle() {
  if (_injected || typeof document === "undefined") return;
  _injected = true;
  const css = `
  .hb-switch{display:inline-flex;align-items:center;gap:var(--space-3);cursor:pointer;user-select:none;}
  .hb-switch--disabled{opacity:.4;pointer-events:none;}
  .hb-switch__track{
    position:relative;width:34px;height:20px;border-radius:var(--radius-full);
    background:var(--fill-tertiary);box-shadow:inset 0 0 0 0.5px var(--separator);
    transition:background var(--dur-fast) var(--ease-standard);flex:none;
  }
  .hb-switch__track--on{background:var(--accent);box-shadow:none;}
  .hb-switch__knob{
    position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.3),0 0 0 0.5px rgba(0,0,0,.06);
    transition:transform var(--dur-fast) var(--ease-out);
  }
  .hb-switch__track--on .hb-switch__knob{transform:translateX(14px);}
  .hb-switch__label{font-size:var(--text-body);color:var(--label);}
  .hb-switch input{position:absolute;opacity:0;width:0;height:0;}
  .hb-switch__track:focus-within{box-shadow:inset 0 0 0 0.5px var(--separator),var(--ring-focus);}
  `;
  const el = document.createElement("style");
  el.id = "hb-switch";
  el.textContent = css;
  document.head.appendChild(el);
}
function Switch({
  checked,
  defaultChecked,
  onChange,
  label,
  disabled = false,
  className = "",
  ...rest
}) {
  ensureStyle();
  const controlled = checked !== undefined;
  const [internal, setInternal] = React.useState(!!defaultChecked);
  const on = controlled ? checked : internal;
  const toggle = e => {
    if (!controlled) setInternal(e.target.checked);
    onChange && onChange(e.target.checked);
  };
  return /*#__PURE__*/React.createElement("label", _extends({
    className: ["hb-switch", disabled ? "hb-switch--disabled" : "", className].filter(Boolean).join(" ")
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: ["hb-switch__track", on ? "hb-switch__track--on" : ""].join(" ")
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: on,
    onChange: toggle,
    disabled: disabled
  }), /*#__PURE__*/React.createElement("span", {
    className: "hb-switch__knob"
  })), label ? /*#__PURE__*/React.createElement("span", {
    className: "hb-switch__label"
  }, label) : null);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/Keycap.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Hostbeam — Keycap
   Renders a keyboard shortcut as macOS keycaps. Pass a combo string like
   "cmd shift 7" or symbols directly. Used for the global hotkey display. */

let _injected = false;
function ensureStyle() {
  if (_injected || typeof document === "undefined") return;
  _injected = true;
  const css = `
  .hb-keys{display:inline-flex;align-items:center;gap:3px;}
  .hb-key{display:inline-flex;align-items:center;justify-content:center;
    min-width:18px;height:18px;padding:0 4px;box-sizing:border-box;
    font-family:var(--font-system);font-size:11px;font-weight:var(--weight-medium);line-height:1;
    color:var(--label-secondary);background:var(--surface-content);
    border-radius:var(--radius-xs);box-shadow:inset 0 0 0 0.5px var(--border-field),0 1px 0 var(--separator);}
  .hb-key--lg{min-width:24px;height:24px;font-size:13px;}
  .hb-key--accent{color:#fff;background:var(--accent);box-shadow:none;}
  `;
  const el = document.createElement("style");
  el.id = "hb-keycap";
  el.textContent = css;
  document.head.appendChild(el);
}
const SYM = {
  cmd: "\u2318",
  command: "\u2318",
  meta: "\u2318",
  shift: "\u21E7",
  alt: "\u2325",
  option: "\u2325",
  opt: "\u2325",
  ctrl: "\u2303",
  control: "\u2303",
  enter: "\u21A9",
  return: "\u21A9",
  esc: "\u238B",
  escape: "\u238B",
  tab: "\u21E5",
  space: "\u2423",
  up: "\u2191",
  down: "\u2193",
  left: "\u2190",
  right: "\u2192",
  del: "\u232B",
  backspace: "\u232B"
};
function Keycap({
  combo,
  keys,
  size = "md",
  accent = false,
  className = "",
  ...rest
}) {
  ensureStyle();
  const parts = keys ? keys : String(combo || "").trim().split(/[\s+]+/).filter(Boolean);
  const cls = ["hb-key", size === "lg" ? "hb-key--lg" : "", accent ? "hb-key--accent" : ""].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("span", _extends({
    className: ["hb-keys", className].filter(Boolean).join(" ")
  }, rest), parts.map((p, i) => {
    const key = String(p).toLowerCase();
    const label = SYM[key] || (p.length === 1 ? p.toUpperCase() : p);
    return /*#__PURE__*/React.createElement("kbd", {
      key: i,
      className: cls
    }, label);
  }));
}
Object.assign(__ds_scope, { Keycap });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/Keycap.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/ListRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Hostbeam — ListRow
   The workhorse row for host lists and recent beams. Leading slot
   (thumbnail / icon / dot), title + subtitle stack, trailing slot
   (badge / action). Selectable + hoverable. */

let _injected = false;
function ensureStyle() {
  if (_injected || typeof document === "undefined") return;
  _injected = true;
  const css = `
  .hb-row{display:flex;align-items:center;gap:var(--space-4);width:100%;text-align:left;
    font-family:var(--font-system);color:var(--label);background:transparent;border:0;
    padding:var(--row-pad-y) var(--row-pad-x);min-height:var(--row-height);
    transition:background var(--dur-instant) var(--ease-standard);position:relative;box-sizing:border-box;}
  button.hb-row{cursor:pointer;}
  .hb-row + .hb-row::before{content:"";position:absolute;top:0;left:var(--row-pad-x);right:0;height:1px;background:var(--separator);}
  .hb-row--interactive:hover{background:var(--fill-hover);}
  .hb-row--interactive:active{background:var(--fill-active);}
  .hb-row--selected{background:var(--accent-tint);}
  .hb-row--selected.hb-row--interactive:hover{background:var(--accent-tint);}
  .hb-row__lead{flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--label-secondary);}
  .hb-row__thumb{width:40px;height:28px;border-radius:var(--radius-sm);object-fit:cover;
    background:var(--fill-tertiary);box-shadow:inset 0 0 0 0.5px var(--separator);flex:none;}
  .hb-row__body{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px;}
  .hb-row__title{font-size:var(--text-body);font-weight:var(--weight-medium);color:var(--label);
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .hb-row__title--mono{font-family:var(--font-mono);font-size:var(--role-mono-size);font-weight:var(--weight-regular);}
  .hb-row__sub{font-size:var(--text-caption);color:var(--label-tertiary);
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .hb-row__sub--mono{font-family:var(--font-mono);}
  .hb-row__trail{flex:none;display:inline-flex;align-items:center;gap:var(--space-2);margin-left:auto;}
  `;
  const el = document.createElement("style");
  el.id = "hb-listrow";
  el.textContent = css;
  document.head.appendChild(el);
}
function ListRow({
  leading = null,
  title,
  subtitle,
  trailing = null,
  monoTitle = false,
  monoSub = false,
  selected = false,
  interactive = false,
  onClick,
  className = "",
  ...rest
}) {
  ensureStyle();
  const Tag = interactive || onClick ? "button" : "div";
  const cls = ["hb-row", interactive || onClick ? "hb-row--interactive" : "", selected ? "hb-row--selected" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: cls,
    onClick: onClick,
    type: Tag === "button" ? "button" : undefined
  }, rest), leading ? /*#__PURE__*/React.createElement("span", {
    className: "hb-row__lead"
  }, leading) : null, /*#__PURE__*/React.createElement("span", {
    className: "hb-row__body"
  }, /*#__PURE__*/React.createElement("span", {
    className: ["hb-row__title", monoTitle ? "hb-row__title--mono" : ""].join(" ")
  }, title), subtitle ? /*#__PURE__*/React.createElement("span", {
    className: ["hb-row__sub", monoSub ? "hb-row__sub--mono" : ""].join(" ")
  }, subtitle) : null), trailing ? /*#__PURE__*/React.createElement("span", {
    className: "hb-row__trail"
  }, trailing) : null);
}
Object.assign(__ds_scope, { ListRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/ListRow.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/Surface.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Hostbeam — Surface
   The container primitive. `popover` is the menu-bar material (the main
   shell); `card` and `well` are inner groupings. Provides the shadow +
   hairline ring system so edges read crisply. */

let _injected = false;
function ensureStyle() {
  if (_injected || typeof document === "undefined") return;
  _injected = true;
  const css = `
  .hb-surface{font-family:var(--font-system);color:var(--label);box-sizing:border-box;}
  .hb-surface--popover{width:var(--popover-width);background:var(--surface-popover);
    border-radius:var(--radius-xl);box-shadow:var(--shadow-popover);overflow:hidden;}
  .hb-surface--card{background:var(--surface-content);border-radius:var(--radius-lg);
    box-shadow:inset 0 0 0 0.5px var(--separator);}
  .hb-surface--raised{background:var(--surface-raised);border-radius:var(--radius-lg);
    box-shadow:var(--shadow-control),inset 0 0 0 0.5px var(--separator);}
  .hb-surface--well{background:var(--surface-sunken);border-radius:var(--radius-md);
    box-shadow:var(--shadow-inset);}
  .hb-surface--sheet{background:var(--surface-popover);border-radius:var(--radius-2xl);
    box-shadow:var(--shadow-popover);overflow:hidden;}
  .hb-surface--pad{padding:var(--popover-pad);}
  `;
  const el = document.createElement("style");
  el.id = "hb-surface";
  el.textContent = css;
  document.head.appendChild(el);
}
function Surface({
  children,
  variant = "card",
  padded = false,
  className = "",
  style = {},
  as: Tag = "div",
  ...rest
}) {
  ensureStyle();
  const cls = ["hb-surface", `hb-surface--${variant}`, padded ? "hb-surface--pad" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: cls,
    style: style
  }, rest), children);
}
Object.assign(__ds_scope, { Surface });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/Surface.jsx", error: String((e && e.message) || e) }); }

// landing/landing.jsx
try { (() => {
/* Hostbeam — product landing one-pager.
   Plain React/Babel marketing page on the design system (../styles.css, ../_ds_bundle.js).
   Reuses window.Ic + BeamMark from ../prototypes/onboarding/shared.jsx and the
   Tweaks shell from ../prototypes/onboarding/tweaks-panel.jsx.
   Voice: Beam — calm, plain, one warm line per surface. The beam is the only motion. */

/* Resolved in boot() once all dependency scripts (DS bundle, shared.jsx,
   tweaks-panel.jsx) have run — in the standalone bundle these load as racing
   blob URLs, so reading them at module-eval time is unsafe. */
let DS, Button, Badge, Keycap, StatusDot, Ic, BeamMark;

/* ---------- accent helper (so the Tweak can recolor the whole page) -------- */
function accentVars(c) {
  return {
    "--accent": c,
    "--accent-hover": `color-mix(in srgb, ${c} 86%, #000)`,
    "--accent-active": `color-mix(in srgb, ${c} 74%, #000)`,
    "--accent-tint": `color-mix(in srgb, ${c} 13%, transparent)`,
    "--beam-500": c,
    "--focus-ring": `color-mix(in srgb, ${c} 40%, transparent)`
  };
}

/* ====================================================================== */
/*  Hero scene — a macOS desktop with the live menu-bar popover            */
/* ====================================================================== */

function Beak() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: -7,
      right: 23,
      width: 0,
      height: 0,
      borderLeft: "8px solid transparent",
      borderRight: "8px solid transparent",
      borderBottom: "8px solid var(--surface-popover)",
      filter: "drop-shadow(0 -0.5px 0.5px rgba(0,0,0,0.10))",
      zIndex: 2
    }
  });
}

/* A self-contained popover that plays the one signature motion on demand.
   idle → uploading → landing → done → (beam again). */
function HeroPopover({
  onBeamed
}) {
  const [phase, setPhase] = React.useState("idle"); // idle | uploading | landing | done
  const [path, setPath] = React.useState("");
  const hostName = "prod-box";
  const beam = () => {
    if (phase === "uploading" || phase === "landing") return;
    setPhase("uploading");
    setTimeout(() => {
      const mm = String(10 + Math.floor(Math.random() * 49)).padStart(2, "0");
      const ss = String(Math.floor(Math.random() * 60)).padStart(2, "0");
      setPath(`/tmp/hostbeam/2026-06-16-15.${mm}.${ss}.png`);
      setPhase("landing");
      if (onBeamed) onBeamed();
      setTimeout(() => setPhase(p => p === "landing" ? "done" : p), 760);
    }, 1300);
  };
  const sentenceNodes = ["Use this screenshot: ", /*#__PURE__*/React.createElement("span", {
    key: "p",
    style: {
      color: "var(--accent)",
      fontWeight: 600
    }
  }, path)];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width: 340
    }
  }, /*#__PURE__*/React.createElement(Beak, null), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      zIndex: 1,
      width: 340,
      background: "var(--surface-popover)",
      borderRadius: "var(--radius-xl)",
      boxShadow: "var(--shadow-popover)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      padding: "12px 16px",
      borderBottom: "1px solid var(--separator)"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../assets/hostbeam-mark.svg",
    width: "18",
    height: "18",
    alt: ""
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--label)"
    }
  }, "Hostbeam"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      display: "inline-flex",
      color: "var(--label-tertiary)",
      padding: 4
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "sliders",
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 13
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 11,
      padding: "12px 13px",
      background: "var(--surface-content)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "inset 0 0 0 0.5px var(--separator)"
    }
  }, /*#__PURE__*/React.createElement(window.ShotThumb, null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2,
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      fontWeight: 500,
      color: "var(--label)",
      whiteSpace: "nowrap"
    }
  }, "Screenshot on clipboard"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--label-tertiary)",
      fontFamily: "var(--font-mono)"
    }
  }, "PNG \xB7 2560 \xD7 1440")), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto"
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: phase === "done" || phase === "landing" ? "accent" : "success",
    dot: true
  }, phase === "done" || phase === "landing" ? "Beamed" : "Ready"))), phase === "idle" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    block: true,
    icon: /*#__PURE__*/React.createElement(Ic, {
      name: "upload",
      size: 15
    }),
    onClick: beam
  }, "Beam screenshot"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      color: "var(--label-tertiary)",
      fontSize: 11
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      whiteSpace: "nowrap"
    }
  }, "or press"), /*#__PURE__*/React.createElement(Keycap, {
    keys: ["cmd", "shift", "7"]
  }))) : null, phase === "uploading" || phase === "landing" ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 12,
      padding: "4px 0 2px"
    }
  }, /*#__PURE__*/React.createElement(BeamMark, {
    size: 58,
    state: phase
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 500,
      color: "var(--label)",
      whiteSpace: "nowrap"
    }
  }, phase === "uploading" ? `Beaming to ${hostName}…` : `Beamed to ${hostName}`), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      height: 4,
      borderRadius: 3,
      background: "var(--fill-tertiary)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bm-bar" + (phase === "landing" ? " done" : "")
  }))) : null, phase === "done" ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--accent-tint)",
      boxShadow: "inset 0 0 0 1px var(--separator)",
      borderRadius: "var(--radius-md)",
      padding: "10px 11px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "clipboard",
    size: 13,
    stroke: 2.1,
    style: {
      color: "var(--accent)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: "var(--label-secondary)"
    }
  }, "Copied to clipboard")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11.5,
      lineHeight: 1.55,
      color: "var(--label)",
      wordBreak: "break-word"
    }
  }, sentenceNodes)), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "md",
    block: true,
    icon: /*#__PURE__*/React.createElement(Ic, {
      name: "rotate-cw",
      size: 14
    }),
    onClick: () => {
      setPhase("idle");
      setPath("");
    }
  }, "Beam again")) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "4px 10px 10px",
      borderTop: "1px solid var(--separator)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "8px 6px 4px",
      fontSize: 10,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: ".05em",
      color: "var(--label-tertiary)"
    }
  }, "Recent"), [{
    f: "2026-06-16-15.12.04.png",
    h: "prod-box",
    t: "6m ago"
  }, {
    f: "2026-06-16-14.48.51.png",
    h: "staging",
    t: "52m ago"
  }].map(r => /*#__PURE__*/React.createElement("div", {
    key: r.f,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "7px 6px",
      borderRadius: "var(--radius-md)"
    }
  }, /*#__PURE__*/React.createElement(window.ShotThumb, {
    w: 38,
    h: 26
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 1,
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--label)",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, r.f), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10.5,
      color: "var(--label-tertiary)"
    }
  }, r.h, " \xB7 ", r.t)), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: "none",
      display: "inline-flex",
      color: "var(--label-tertiary)"
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "clipboard",
    size: 14
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 14px 14px",
      borderTop: "1px solid var(--separator)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: ".05em",
      color: "var(--label-tertiary)",
      margin: "0 2px 6px"
    }
  }, "Beam to"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      padding: "8px 11px",
      background: "var(--surface-content)",
      borderRadius: "var(--radius-md)",
      boxShadow: "inset 0 0 0 0.5px var(--separator)"
    }
  }, /*#__PURE__*/React.createElement(StatusDot, {
    status: "online"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 1,
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      fontWeight: 500,
      color: "var(--label)"
    }
  }, "prod-box"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10.5,
      color: "var(--label-tertiary)",
      fontFamily: "var(--font-mono)"
    }
  }, "dev@10.4.0.12")), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      color: "var(--label-tertiary)"
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "chevron-down",
    size: 15
  }))))));
}
function DesktopScene({
  dark
}) {
  const mbRef = React.useRef(null);
  const blip = () => {
    const el = mbRef.current;
    if (!el) return;
    el.classList.remove("blip");
    void el.offsetWidth;
    el.classList.add("blip");
    setTimeout(() => el && el.classList.remove("blip"), 700);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "scene" + (dark ? " theme-dark" : ""),
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("div", {
    className: "scene-mb"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      opacity: .92
    }
  }, "Terminal"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      opacity: .7
    }
  }, "Shell"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      opacity: .7
    }
  }, "View"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "mb-app",
    ref: mbRef
  }, /*#__PURE__*/React.createElement("img", {
    src: "../assets/hostbeam-menubar.svg",
    width: "17",
    height: "17",
    alt: ""
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      opacity: .85,
      fontVariantNumeric: "tabular-nums"
    }
  }, "Mon 15:30"))), /*#__PURE__*/React.createElement("div", {
    className: "scene-anchor"
  }, /*#__PURE__*/React.createElement(HeroPopover, {
    onBeamed: blip
  })));
}

/* ====================================================================== */
/*  Sections                                                              */
/* ====================================================================== */

function Nav({
  dark
}) {
  return /*#__PURE__*/React.createElement("nav", {
    className: "nav"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap nav-in"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#top",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 9,
      textDecoration: "none"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../assets/hostbeam-mark.svg",
    width: "22",
    height: "22",
    alt: ""
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16,
      fontWeight: 600,
      letterSpacing: "-0.02em",
      color: "var(--label)"
    }
  }, "Hostbeam")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      display: "flex",
      alignItems: "center",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("a", {
    className: "nav-link nav-hide-sm",
    href: "#how"
  }, "How it works"), /*#__PURE__*/React.createElement("a", {
    className: "nav-link nav-hide-sm",
    href: "#features"
  }, "Features"), /*#__PURE__*/React.createElement("a", {
    className: "nav-link nav-hide-sm",
    href: "#privacy"
  }, "Privacy"), /*#__PURE__*/React.createElement("a", {
    className: "nav-link nav-hide-sm",
    href: "#faq"
  }, "FAQ"), /*#__PURE__*/React.createElement("a", {
    className: "btn btn-primary btn-sm",
    href: "#download",
    style: {
      marginLeft: 8
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "upload",
    size: 15
  }), " Download"))));
}
function Hero({
  dark
}) {
  return /*#__PURE__*/React.createElement("header", {
    id: "top",
    style: {
      paddingTop: 64,
      paddingBottom: 64
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap hero-grid"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "eyebrow"
  }, "macOS menu-bar utility"), /*#__PURE__*/React.createElement("h1", {
    className: "display"
  }, "Beam a screenshot", /*#__PURE__*/React.createElement("br", null), "straight to your server."), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, "Copy a screenshot, press one hotkey, and Hostbeam drops it on the host you choose \u2014 then hands your clipboard a paste-ready line for your coding agent. It lives in the menu bar and gets out of the way."), /*#__PURE__*/React.createElement("div", {
    className: "hero-cta",
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 12,
      marginTop: 32,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("a", {
    className: "btn btn-primary",
    href: "#download"
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "upload",
    size: 17
  }), " Download for macOS"), /*#__PURE__*/React.createElement("a", {
    className: "btn btn-ghost",
    href: "#how"
  }, "See how it works")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12.5,
      color: "var(--label-tertiary)",
      marginTop: 16
    }
  }, "Free \xB7 macOS 13+ \xB7 Apple silicon & Intel")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(DesktopScene, {
    dark: dark
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      textAlign: "center",
      fontSize: 12,
      color: "var(--label-tertiary)",
      marginTop: 14
    }
  }, "Live demo \u2014 press ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: "var(--label-secondary)"
    }
  }, "Beam screenshot"), " above."))));
}
function HowItWorks() {
  const steps = [{
    icon: "clipboard",
    title: "Copy a screenshot",
    body: "Cmd-Shift-4, a snip from any tool — anything that lands a PNG on your clipboard."
  }, {
    icon: "zap",
    title: "Beam it",
    body: "One hotkey from any app. Hostbeam uploads it to your chosen host over your own SSH."
  }, {
    icon: "terminal",
    title: "Paste the line",
    body: "Your clipboard now holds a ready sentence with the remote path. Paste it into your agent."
  }];
  return /*#__PURE__*/React.createElement("section", {
    id: "how",
    style: {
      background: "var(--page-bg-alt)",
      padding: "84px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("p", {
    className: "eyebrow",
    style: {
      textAlign: "center"
    }
  }, "How it works"), /*#__PURE__*/React.createElement("h2", {
    className: "h2",
    style: {
      textAlign: "center"
    }
  }, "Clipboard to remote path in one keystroke."), /*#__PURE__*/React.createElement("p", {
    className: "sub",
    style: {
      textAlign: "center",
      margin: "16px auto 0"
    }
  }, "No window to find, no file to drag, no upload dialog. The whole loop is muscle memory."), /*#__PURE__*/React.createElement("div", {
    className: "grid-3",
    style: {
      marginTop: 52
    }
  }, steps.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: s.title,
    className: "card",
    style: {
      padding: "26px 24px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "step-num"
  }, i + 1), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      color: "var(--accent)"
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: s.icon,
    size: 20
  }))), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 17,
      fontWeight: 600,
      margin: 0,
      letterSpacing: "-0.01em",
      color: "var(--label)"
    }
  }, s.title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      lineHeight: 1.55,
      color: "var(--label-secondary)",
      margin: "8px 0 0",
      textWrap: "pretty"
    }
  }, s.body)))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      marginTop: 24,
      padding: "22px 24px",
      display: "flex",
      alignItems: "center",
      gap: 16,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      color: "var(--accent)",
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "clipboard",
    size: 18
  })), /*#__PURE__*/React.createElement("code", {
    className: "mono",
    style: {
      fontSize: 14,
      color: "var(--label)",
      flex: 1,
      minWidth: 240
    }
  }, "Use this screenshot: ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--accent)",
      fontWeight: 600
    }
  }, "/tmp/hostbeam/2026-06-16-15.12.04.png")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      color: "var(--label-tertiary)"
    }
  }, "copied for you \u2014 paste & go"))));
}
function Features() {
  const feats = [{
    icon: "zap",
    title: "A hotkey from anywhere",
    body: "Cmd-Shift-7 from any app, full-screen or not. No window to surface, no menu to open — just beam."
  }, {
    icon: "terminal",
    title: "Lives in your menu bar",
    body: "A quiet glyph up top, blips once when a beam lands. Click for the popover, or never look at it at all."
  }, {
    icon: "clipboard",
    title: "Paste-ready for agents",
    body: "It doesn’t just upload — it writes the exact sentence your coding agent needs and copies it. Edit the template to taste."
  }, {
    icon: "server",
    title: "Knows your ~/.ssh/config",
    body: "Every host you already have, searchable and ready. Pick a default, switch in a click, beam to any of them."
  }];
  return /*#__PURE__*/React.createElement("section", {
    id: "features",
    style: {
      padding: "84px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("p", {
    className: "eyebrow"
  }, "Features"), /*#__PURE__*/React.createElement("h2", {
    className: "h2",
    style: {
      maxWidth: "16em"
    }
  }, "Small on screen. Out of your way. Exactly where you need it."), /*#__PURE__*/React.createElement("div", {
    className: "grid-2",
    style: {
      marginTop: 48
    }
  }, feats.map(f => /*#__PURE__*/React.createElement("div", {
    key: f.title,
    className: "card",
    style: {
      padding: "28px 28px",
      display: "flex",
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 44,
      height: 44,
      flex: "none",
      borderRadius: "var(--radius-lg)",
      background: "var(--accent-tint)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--accent)"
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: f.icon,
    size: 22
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 17,
      fontWeight: 600,
      margin: 0,
      letterSpacing: "-0.01em",
      color: "var(--label)"
    }
  }, f.title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      lineHeight: 1.55,
      color: "var(--label-secondary)",
      margin: "7px 0 0",
      textWrap: "pretty"
    }
  }, f.body)))))));
}
function Privacy() {
  return /*#__PURE__*/React.createElement("section", {
    id: "privacy",
    style: {
      background: "var(--page-bg-alt)",
      padding: "84px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap split"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 52,
      height: 52,
      borderRadius: "var(--radius-xl)",
      background: "var(--accent-tint)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--accent)",
      marginBottom: 22
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "lock",
    size: 26
  })), /*#__PURE__*/React.createElement("p", {
    className: "eyebrow"
  }, "Privacy"), /*#__PURE__*/React.createElement("h2", {
    className: "h2"
  }, "Nothing in the middle."), /*#__PURE__*/React.createElement("p", {
    className: "sub"
  }, "Your screenshot goes from your clipboard to your server over your own SSH \u2014 the same connection you already trust. No Hostbeam account, no cloud bucket, no telemetry. We never see the file, and there\u2019s no \u201Cus\u201D in the path.")), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: "10px 14px"
    }
  }, [{
    k: "No account",
    v: "Your machine, your SSH config. Nothing to sign up for."
  }, {
    k: "No cloud relay",
    v: "The file never touches a Hostbeam server. It goes straight to your host."
  }, {
    k: "No telemetry",
    v: "We don’t phone home. What you beam is your business."
  }, {
    k: "Your folder, your rules",
    v: "Defaults to /tmp/hostbeam — change it per host any time."
  }].map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: r.k,
    style: {
      display: "flex",
      gap: 13,
      padding: "16px 12px",
      borderTop: i ? "1px solid var(--separator)" : 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: "none",
      color: "var(--success)",
      marginTop: 1
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "check",
    size: 18,
    stroke: 2.5
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14.5,
      fontWeight: 600,
      color: "var(--label)"
    }
  }, r.k), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13.5,
      lineHeight: 1.5,
      color: "var(--label-secondary)",
      marginTop: 3
    }
  }, r.v)))))));
}
function FAQ() {
  const qs = [{
    q: "Where do my screenshots end up?",
    a: "In /tmp/hostbeam on the host you pick, by default. You can set a different folder per host in Preferences."
  }, {
    q: "Do I need a Hostbeam account?",
    a: "No. Hostbeam uses the hosts already in your ~/.ssh/config and your existing keys. There’s nothing to sign up for."
  }, {
    q: "Which hosts work?",
    a: "Anything you can ssh into — entries from your ~/.ssh/config, or a host you type in by hand. If ssh works, Hostbeam works."
  }, {
    q: "Can I change the pasted sentence?",
    a: "Yes. The template lives in Preferences — keep the default “Use this screenshot: {path}”, or write your own around the {path} token."
  }, {
    q: "What if a beam fails?",
    a: "Hostbeam tells you why in plain language — host unreachable, key refused, folder not writable — and offers a one-click retry or inline diagnostics."
  }, {
    q: "Is it macOS only?",
    a: "Yes, for now. Hostbeam is built to feel native to the Mac menu bar."
  }];
  return /*#__PURE__*/React.createElement("section", {
    id: "faq",
    style: {
      padding: "84px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("p", {
    className: "eyebrow",
    style: {
      textAlign: "center"
    }
  }, "FAQ"), /*#__PURE__*/React.createElement("h2", {
    className: "h2",
    style: {
      textAlign: "center",
      marginBottom: 48
    }
  }, "Good questions."), /*#__PURE__*/React.createElement("div", {
    className: "faq-grid"
  }, qs.map(item => /*#__PURE__*/React.createElement("div", {
    key: item.q,
    style: {
      padding: "20px 0",
      borderTop: "1px solid var(--separator)"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    className: "faq-q"
  }, item.q), /*#__PURE__*/React.createElement("p", {
    className: "faq-a"
  }, item.a))))));
}
function Download() {
  return /*#__PURE__*/React.createElement("section", {
    id: "download",
    style: {
      padding: "20px 0 96px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: "var(--radius-2xl)",
      padding: "64px 48px",
      textAlign: "center",
      background: "linear-gradient(160deg, var(--beam-400, #5183F7), var(--accent))",
      color: "#fff",
      boxShadow: "0 24px 60px -24px color-mix(in srgb, var(--accent) 60%, transparent)"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../assets/hostbeam-icon.svg",
    width: "72",
    height: "72",
    alt: "",
    style: {
      borderRadius: 18,
      boxShadow: "0 8px 24px rgba(0,0,0,0.25)"
    }
  }), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: "clamp(28px, 4vw, 42px)",
      fontWeight: 600,
      letterSpacing: "-0.025em",
      margin: "24px 0 0",
      textWrap: "balance"
    }
  }, "Put your screenshots where your code lives."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 17,
      lineHeight: 1.5,
      opacity: 0.92,
      margin: "16px auto 0",
      maxWidth: "28em"
    }
  }, "Download Hostbeam, point it at a host, and beam your first screenshot in under a minute."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      gap: 12,
      marginTop: 32,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("a", {
    className: "btn",
    href: "#top",
    style: {
      background: "#fff",
      color: "var(--accent)",
      boxShadow: "0 6px 18px rgba(0,0,0,0.18)"
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "upload",
    size: 17
  }), " Download for macOS"), /*#__PURE__*/React.createElement("a", {
    className: "btn",
    href: "../prototypes/onboarding/index.html",
    style: {
      background: "rgba(255,255,255,0.16)",
      color: "#fff",
      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.4)"
    }
  }, "Try the walkthrough")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12.5,
      opacity: 0.8,
      marginTop: 18
    }
  }, "Free \xB7 macOS 13+ \xB7 Apple silicon & Intel"))));
}
function Footer() {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      borderTop: "1px solid var(--separator)",
      padding: "36px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap",
    style: {
      display: "flex",
      alignItems: "center",
      gap: 16,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 9
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../assets/hostbeam-mark.svg",
    width: "20",
    height: "20",
    alt: ""
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14.5,
      fontWeight: 600,
      color: "var(--label)"
    }
  }, "Hostbeam")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      color: "var(--label-tertiary)"
    }
  }, "Screenshots, beamed."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      display: "flex",
      gap: 18,
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("a", {
    className: "nav-link",
    href: "#how",
    style: {
      padding: 0
    }
  }, "How it works"), /*#__PURE__*/React.createElement("a", {
    className: "nav-link",
    href: "#privacy",
    style: {
      padding: 0
    }
  }, "Privacy"), /*#__PURE__*/React.createElement("a", {
    className: "nav-link",
    href: "#faq",
    style: {
      padding: 0
    }
  }, "FAQ"), /*#__PURE__*/React.createElement("a", {
    className: "nav-link",
    href: "#top",
    style: {
      padding: 0
    }
  }, "Back to top"))));
}

/* ====================================================================== */
/*  App                                                                   */
/* ====================================================================== */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#2D6CF6",
  "dark": false
} /*EDITMODE-END*/;
function App() {
  // Resolve dependencies from window at render time. In the standalone bundle
  // the babel modules can be evaluated in more than one scope / order, so
  // binding here (before any child renders) is the only safe place.
  DS = window.HostbeamDesignSystem_23dc0f;
  ({
    Button,
    Badge,
    Keycap,
    StatusDot
  } = DS);
  Ic = window.Ic;
  BeamMark = window.BeamMark;

  // Tweaks are optional: present in the normal prototype, but in a shared
  // standalone file they can't persist and may not have loaded. Fall back to
  // plain local state so the page renders regardless.
  const useTweaksFn = window.useTweaks || (d => {
    const [v, setV] = React.useState(d);
    const set = React.useCallback((k, val) => setV(p => typeof k === "object" ? {
      ...p,
      ...k
    } : {
      ...p,
      [k]: val
    }), []);
    return [v, set];
  });
  const [t, setTweak] = useTweaksFn(TWEAK_DEFAULTS);
  const TweaksPanel = window.TweaksPanel,
    TweakSection = window.TweakSection,
    TweakColor = window.TweakColor,
    TweakRadio = window.TweakRadio;
  const tweaksUI = TweaksPanel ? /*#__PURE__*/React.createElement(TweaksPanel, null, /*#__PURE__*/React.createElement(TweakSection, {
    label: "Appearance"
  }), /*#__PURE__*/React.createElement(TweakColor, {
    label: "Accent",
    value: t.accent,
    options: ["#2D6CF6", "#0E84C2", "#1F8A5B", "#7A5AE0"],
    onChange: v => setTweak("accent", v)
  }), /*#__PURE__*/React.createElement(TweakRadio, {
    label: "Theme",
    value: t.dark ? "dark" : "light",
    options: ["light", "dark"],
    onChange: v => setTweak("dark", v === "dark")
  })) : null;
  return /*#__PURE__*/React.createElement("div", {
    className: "site" + (t.dark ? " theme-dark" : ""),
    style: accentVars(t.accent)
  }, /*#__PURE__*/React.createElement(Nav, {
    dark: t.dark
  }), /*#__PURE__*/React.createElement(Hero, {
    dark: t.dark
  }), /*#__PURE__*/React.createElement(HowItWorks, null), /*#__PURE__*/React.createElement(Features, null), /*#__PURE__*/React.createElement(Privacy, null), /*#__PURE__*/React.createElement(FAQ, null), /*#__PURE__*/React.createElement(Download, null), /*#__PURE__*/React.createElement(Footer, null), tweaksUI);
}
function boot() {
  const W = window;
  if (!(W.HostbeamDesignSystem_23dc0f && W.Ic && W.BeamMark && W.ShotThumb)) {
    return setTimeout(boot, 30);
  }
  if (W.__hbLandingRoot) return; // guard against a duplicated module scope
  W.__hbLandingRoot = ReactDOM.createRoot(document.getElementById("root"));
  W.__hbLandingRoot.render(React.createElement(App));
}
boot();
})(); } catch (e) { __ds_ns.__errors.push({ path: "landing/landing.jsx", error: String((e && e.message) || e) }); }

// prototypes/onboarding/flowA.jsx
try { (() => {
/* Flow A — Popover-native micro-onboarding (refined: less dense).
   Onboarding happens right inside the menu-bar popover: 3 calm steps, then the
   real Ready state. More breathing room — generous padding, airy host rows. */
const A = window.HostbeamDesignSystem_23dc0f;
const {
  Button: ButtonA,
  StatusDot: DotA,
  Keycap: KeycapA,
  Switch: SwitchA,
  Badge: BadgeA,
  Spinner: SpinnerA,
  Field: FieldA
} = A;
function Beak({
  style = "notch",
  size = 8,
  offset = 31
}) {
  if (style === "none") return null;
  if (style === "diamond") {
    const w = size * 1.7;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        top: -(w * 0.5),
        right: offset - w / 2,
        width: w,
        height: w,
        background: "var(--surface-popover)",
        transform: "rotate(45deg)",
        borderRadius: 2,
        boxShadow: "-0.5px -0.5px 0 0 var(--separator)",
        zIndex: 0
      }
    });
  }
  /* notch — a clean triangle that merges into the popover top edge */
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: -(size - 1),
      right: offset - size,
      width: 0,
      height: 0,
      borderLeft: `${size}px solid transparent`,
      borderRight: `${size}px solid transparent`,
      borderBottom: `${size}px solid var(--surface-popover)`,
      filter: "drop-shadow(0 -0.5px 0.5px rgba(0,0,0,0.10))",
      zIndex: 2
    }
  });
}
function PopoverFrame({
  children,
  beak
}) {
  const b = beak || {
    style: "notch",
    size: 8,
    offset: 31
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width: 340
    }
  }, /*#__PURE__*/React.createElement(Beak, b), /*#__PURE__*/React.createElement("div", {
    className: "hb-step",
    style: {
      position: "relative",
      zIndex: 1,
      width: 340,
      background: "var(--surface-popover)",
      borderRadius: "var(--radius-xl)",
      boxShadow: "var(--shadow-popover)",
      overflow: "hidden"
    }
  }, children));
}
function InnerHead({
  title,
  onBack,
  step
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      padding: "12px 16px",
      borderBottom: "1px solid var(--separator)"
    }
  }, onBack ? /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    "aria-label": "Back",
    style: {
      border: 0,
      background: "transparent",
      cursor: "pointer",
      color: "var(--label-secondary)",
      display: "inline-flex",
      padding: 2,
      marginLeft: -4,
      borderRadius: 5
    }
  }, /*#__PURE__*/React.createElement(window.Ic, {
    name: "chevron-left",
    size: 18
  })) : /*#__PURE__*/React.createElement("img", {
    src: "../../assets/hostbeam-mark.svg",
    width: "18",
    height: "18",
    alt: ""
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--label)"
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto"
    }
  }, /*#__PURE__*/React.createElement(window.StepDots, {
    count: 3,
    active: step
  })));
}

/* Welcome hero: the first thing a new user sees is the signature beam —
   it pulses up once, lands (node pop + ring), then rests as the static mark. */
function WelcomeBeam() {
  const [st, setSt] = React.useState("uploading");
  React.useEffect(() => {
    const t1 = setTimeout(() => setSt("landing"), 1350);
    const t2 = setTimeout(() => setSt("idle"), 2050);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
  return /*#__PURE__*/React.createElement(window.BeamMark, {
    size: 64,
    state: st
  });
}

/* Inline manual-add — shown when ~/.ssh/config is empty, or on demand over a
   non-empty list. Mirrors the Preferences Add-host sheet, sized for the popover. */
function ManualAdd({
  emptyConfig,
  onAdd,
  onSkip
}) {
  const [name, setName] = React.useState("");
  const [user, setUser] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [folder, setFolder] = React.useState("/tmp/hostbeam");
  const [test, setTest] = React.useState("idle"); // idle | testing | ok | fail
  const valid = name.trim() && user.trim() && address.trim();
  React.useEffect(() => {
    setTest("idle");
  }, [address, user]);
  const runTest = () => {
    if (!address.trim() || test === "testing") return;
    setTest("testing");
    window.OB.testHost({
      address: address.trim()
    }).then(r => setTest(r.ok ? "ok" : "fail"));
  };
  const add = () => {
    if (valid) onAdd({
      name: name.trim(),
      user: user.trim(),
      address: address.trim(),
      folder: folder.trim() || "/tmp/hostbeam",
      online: test !== "fail"
    });
  };
  const onKey = e => {
    if (e.key === "Enter" && valid) add();
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 16px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 13
    },
    onKeyDown: onKey
  }, emptyConfig ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: "none",
      width: 30,
      height: 30,
      borderRadius: "var(--radius-md)",
      background: "var(--fill-tertiary)",
      color: "var(--label-tertiary)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(window.Ic, {
    name: "server",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      fontWeight: 600,
      color: "var(--label)"
    }
  }, "No hosts in your SSH config"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: "var(--label-secondary)",
      lineHeight: 1.45,
      marginTop: 2
    }
  }, "Add one by hand to start beaming \u2014 you can change it later."))) : null, /*#__PURE__*/React.createElement(FieldA, {
    label: "Name",
    placeholder: "prod-box",
    value: name,
    onChange: e => setName(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 9
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(FieldA, {
    label: "User",
    mono: true,
    placeholder: "dev",
    value: user,
    onChange: e => setUser(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1.7,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(FieldA, {
    label: "Address",
    mono: true,
    placeholder: "10.4.0.12",
    value: address,
    onChange: e => setAddress(e.target.value)
  }))), /*#__PURE__*/React.createElement(FieldA, {
    label: "Remote folder",
    mono: true,
    value: folder,
    onChange: e => setFolder(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      minHeight: 24
    }
  }, /*#__PURE__*/React.createElement(ButtonA, {
    variant: "secondary",
    size: "sm",
    disabled: !address.trim() || test === "testing",
    onClick: runTest
  }, test === "testing" ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(SpinnerA, {
    size: 12
  }), " Testing\u2026") : "Test connection"), test === "ok" ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      fontSize: 12,
      color: "var(--success)",
      fontWeight: 500
    }
  }, /*#__PURE__*/React.createElement(window.Ic, {
    name: "check",
    size: 14,
    stroke: 2.4
  }), " Reachable") : null, test === "fail" ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      fontSize: 12,
      color: "var(--danger)",
      fontWeight: 500
    }
  }, /*#__PURE__*/React.createElement(window.Ic, {
    name: "x",
    size: 14,
    stroke: 2.4
  }), " Couldn\u2019t connect") : null, test === "idle" ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--label-tertiary)"
    }
  }, "Optional") : null), /*#__PURE__*/React.createElement(ButtonA, {
    variant: "primary",
    size: "lg",
    block: true,
    disabled: !valid,
    icon: /*#__PURE__*/React.createElement(window.Ic, {
      name: "plus",
      size: 15,
      stroke: 2.4
    }),
    onClick: add
  }, test === "fail" ? "Add anyway" : "Add host"), /*#__PURE__*/React.createElement(ButtonA, {
    variant: "ghost",
    size: "sm",
    block: true,
    onClick: onSkip
  }, "Skip \u2014 choose later"));
}
function FlowA({
  onDone,
  beak,
  emptyConfig
}) {
  const [step, setStep] = React.useState(0);
  const [hostId, setHostId] = React.useState(null);
  const [manualHost, setManualHost] = React.useState(null); // host typed by hand (no ~/.ssh/config entry)
  const [manualOpen, setManualOpen] = React.useState(false); // "Add manually" form open over a non-empty list
  const [launch, setLaunch] = React.useState(true);
  const [beaming, setBeaming] = React.useState("idle"); // idle | uploading | landing | done (Ready-state beam)
  const doBeam = () => {
    if (window.HBSound) window.HBSound.unlock();
    setBeaming("uploading");
    setTimeout(() => {
      setBeaming("landing");
      try {
        window.dispatchEvent(new CustomEvent("hb:beamed"));
      } catch (e) {}
      const cfgNow = window.HB && window.HB.load();
      if (cfgNow && cfgNow.settings && cfgNow.settings.sound && window.HBSound) window.HBSound.beamLanded();
      setTimeout(() => setBeaming("done"), 760);
    }, 1100);
  };
  const [test, setTest] = React.useState("idle"); // idle | testing | ok | fail
  const detected = emptyConfig ? [] : window.OB.detected; // empty when ~/.ssh/config has no hosts
  const host = manualHost || detected.find(h => h.id === hostId) || null;
  const runTest = () => {
    setTest("testing");
    window.OB.testConnection(hostId).then(r => setTest(r.ok ? "ok" : "fail"));
  };

  /* Build a manual host with a unique id (mirrors Preferences' Add-host sheet). */
  const buildManual = ({
    name,
    user,
    address,
    folder,
    online
  }) => {
    const base = (name || "host").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "host";
    const taken = new Set((window.HB ? window.HB.allHosts() : []).map(h => h.id));
    let id = base,
      n = 2;
    while (taken.has(id)) id = base + "-" + n++;
    return {
      id,
      name,
      user,
      address,
      folder: folder || "/tmp/hostbeam",
      online,
      manual: true
    };
  };

  /* On completion, write the picked host into the shared config so Preferences
     and the menu-bar popover both reflect it (added + set as default). A manual
     host is also persisted into manualHosts + any per-host folder override. */
  const finish = () => {
    if (window.HB && host) {
      const cfg = window.HB.load();
      const isManual = !!manualHost;
      const manualHosts = isManual && !(cfg.manualHosts || []).some(h => h.id === host.id) ? [...(cfg.manualHosts || []), manualHost] : cfg.manualHosts;
      const folders = {
        ...(cfg.folders || {})
      };
      if (isManual && manualHost.folder && manualHost.folder !== cfg.settings.folder) folders[host.id] = manualHost.folder;
      const addedIds = cfg.addedIds.includes(host.id) ? cfg.addedIds : [...cfg.addedIds, host.id];
      window.HB.save({
        ...cfg,
        manualHosts,
        folders,
        addedIds,
        defaultId: host.id,
        settings: {
          ...cfg.settings,
          launch
        }
      });
    }
    setStep(3);
  };
  if (step === 0) {
    return /*#__PURE__*/React.createElement(PopoverFrame, {
      key: 0,
      beak: beak
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "34px 24px 18px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(WelcomeBeam, null), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18,
        fontWeight: 600,
        color: "var(--label)",
        marginTop: 4
      }
    }, "Welcome to Hostbeam"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: "var(--label-secondary)",
        maxWidth: 232,
        lineHeight: 1.5
      }
    }, "Beam a clipboard screenshot to a remote host and get a paste-ready path back."), /*#__PURE__*/React.createElement("div", {
      style: {
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 9,
        marginTop: 18
      }
    }, /*#__PURE__*/React.createElement(ButtonA, {
      variant: "primary",
      size: "lg",
      block: true,
      iconRight: /*#__PURE__*/React.createElement(window.Ic, {
        name: "arrow-right",
        size: 15
      }),
      onClick: () => setStep(1)
    }, "Get started"), /*#__PURE__*/React.createElement(ButtonA, {
      variant: "ghost",
      size: "md",
      block: true,
      onClick: onDone
    }, "Skip setup"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "center",
        padding: "4px 0 18px"
      }
    }, /*#__PURE__*/React.createElement(window.StepDots, {
      count: 3,
      active: 0
    })));
  }
  if (step === 1) {
    const showForm = detected.length === 0 || manualOpen;
    return /*#__PURE__*/React.createElement(PopoverFrame, {
      key: 1,
      beak: beak
    }, /*#__PURE__*/React.createElement(InnerHead, {
      title: showForm ? "Add a host" : "Choose a host",
      onBack: () => {
        if (manualOpen && detected.length) {
          setManualOpen(false);
        } else {
          setStep(0);
        }
      },
      step: 1
    }), showForm ? /*#__PURE__*/React.createElement(ManualAdd, {
      emptyConfig: detected.length === 0,
      onAdd: spec => {
        const h = buildManual(spec);
        setManualHost(h);
        setHostId(h.id);
        setTest("idle");
        setStep(2);
      },
      onSkip: onDone
    }) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "14px 16px 6px",
        fontSize: 12,
        color: "var(--label-secondary)",
        lineHeight: 1.45
      }
    }, "Where should screenshots go? ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--label-tertiary)"
      }
    }, "From your ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)"
      }
    }, "~/.ssh/config"), ".")), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "8px 14px 6px",
        display: "flex",
        flexDirection: "column",
        gap: 7
      }
    }, detected.map(h => /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        textAlign: "left",
        border: 0,
        cursor: "pointer",
        background: "var(--surface-content)",
        boxShadow: "inset 0 0 0 0.5px var(--separator)",
        borderRadius: "var(--radius-lg)",
        padding: "11px 13px"
      },
      className: "obA-host",
      onClick: () => {
        setManualHost(null);
        setHostId(h.id);
        setTest("idle");
        setStep(2);
      },
      key: h.id
    }, /*#__PURE__*/React.createElement(DotA, {
      status: h.id === "edge" ? "offline" : "online"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 2,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 500,
        color: "var(--label)"
      }
    }, h.name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: "var(--label-tertiary)",
        fontFamily: "var(--font-mono)"
      }
    }, h.address)), /*#__PURE__*/React.createElement(window.Ic, {
      name: "chevron-right",
      size: 16,
      style: {
        color: "var(--label-tertiary)",
        marginLeft: "auto"
      }
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "4px 16px 2px"
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setManualOpen(true),
      className: "obA-addlink",
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        border: 0,
        background: "transparent",
        cursor: "pointer",
        color: "var(--accent)",
        fontSize: 12,
        fontWeight: 500,
        fontFamily: "var(--font-system)",
        padding: "4px 2px"
      }
    }, /*#__PURE__*/React.createElement(window.Ic, {
      name: "plus",
      size: 13,
      stroke: 2.4
    }), " Add a host that isn\u2019t listed")), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "4px 16px 16px"
      }
    }, /*#__PURE__*/React.createElement(ButtonA, {
      variant: "ghost",
      size: "sm",
      block: true,
      onClick: onDone
    }, "Skip \u2014 choose later"))));
  }
  if (step === 2) {
    return /*#__PURE__*/React.createElement(PopoverFrame, {
      key: 2,
      beak: beak
    }, /*#__PURE__*/React.createElement(InnerHead, {
      title: "Almost done",
      onBack: () => setStep(1),
      step: 2
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--surface-content)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "inset 0 0 0 0.5px var(--separator)",
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "12px 13px"
      }
    }, /*#__PURE__*/React.createElement(DotA, {
      status: host.online === false ? "offline" : "online"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 2,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: "var(--label)"
      }
    }, host.name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: "var(--label-tertiary)",
        fontFamily: "var(--font-mono)"
      }
    }, host.folder)), /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: "auto"
      }
    }, /*#__PURE__*/React.createElement(BadgeA, {
      tone: "accent"
    }, "Default"))), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 1,
        background: "var(--separator)"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 9,
        minHeight: 24,
        padding: "10px 13px",
        background: test === "ok" ? "var(--success-tint)" : test === "fail" ? "var(--danger-tint)" : "transparent",
        transition: "background var(--dur-fast) var(--ease-standard)"
      }
    }, test === "idle" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(window.Ic, {
      name: "zap",
      size: 15,
      style: {
        color: "var(--label-tertiary)"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "var(--label-secondary)"
      }
    }, "Test the connection"), /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: "auto"
      }
    }, /*#__PURE__*/React.createElement(ButtonA, {
      variant: "secondary",
      size: "sm",
      onClick: runTest
    }, "Test"))), test === "testing" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(SpinnerA, {
      size: 14
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "var(--label-secondary)"
      }
    }, "Connecting to ", host.name, "\u2026")), test === "ok" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(window.Ic, {
      name: "check",
      size: 15,
      stroke: 2.4,
      style: {
        color: "var(--success)"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "var(--label)"
      }
    }, "Reachable \xB7 folder is writable")), test === "fail" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(window.Ic, {
      name: "x",
      size: 15,
      stroke: 2.4,
      style: {
        color: "var(--danger)"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "var(--label)"
      }
    }, host.name, " didn\u2019t answer."), /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: "auto"
      }
    }, /*#__PURE__*/React.createElement(ButtonA, {
      variant: "secondary",
      size: "sm",
      onClick: runTest
    }, "Retry"))))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--surface-content)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "inset 0 0 0 0.5px var(--separator)",
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 13px"
      }
    }, /*#__PURE__*/React.createElement(window.Ic, {
      name: "keyboard",
      size: 16,
      style: {
        color: "var(--label-tertiary)"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        color: "var(--label)"
      }
    }, "Global hotkey"), /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: "auto"
      }
    }, /*#__PURE__*/React.createElement(KeycapA, {
      combo: window.OB.hotkey
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 1,
        background: "var(--separator)",
        marginLeft: 13
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        padding: "12px 13px"
      }
    }, /*#__PURE__*/React.createElement(SwitchA, {
      checked: launch,
      onChange: setLaunch,
      label: "Launch Hostbeam at login"
    }))), /*#__PURE__*/React.createElement(ButtonA, {
      variant: "primary",
      size: "lg",
      block: true,
      icon: /*#__PURE__*/React.createElement(window.Ic, {
        name: "check",
        size: 15
      }),
      onClick: finish
    }, "Start using Hostbeam")));
  }

  /* step 3 — the real Ready state, with a brief "set up" confirmation */
  return /*#__PURE__*/React.createElement(PopoverFrame, {
    key: 3,
    beak: beak
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      padding: "12px 16px",
      borderBottom: "1px solid var(--separator)"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/hostbeam-mark.svg",
    width: "18",
    height: "18",
    alt: ""
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--label)"
    }
  }, "Hostbeam"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto"
    }
  }, /*#__PURE__*/React.createElement(BadgeA, {
    tone: "success",
    dot: true
  }, "Set up"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "16px",
      display: "flex",
      flexDirection: "column",
      gap: 13
    }
  }, beaming === "idle" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 11,
      padding: "12px 13px",
      background: "var(--surface-content)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "inset 0 0 0 0.5px var(--separator)"
    }
  }, /*#__PURE__*/React.createElement(window.ShotThumb, null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      fontWeight: 500,
      color: "var(--label)"
    }
  }, "Screenshot on clipboard"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--label-tertiary)",
      fontFamily: "var(--font-mono)"
    }
  }, "PNG \xB7 2560 \xD7 1440")), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto"
    }
  }, /*#__PURE__*/React.createElement(BadgeA, {
    tone: "success",
    dot: true
  }, "Ready"))), /*#__PURE__*/React.createElement(ButtonA, {
    variant: "primary",
    size: "lg",
    block: true,
    icon: /*#__PURE__*/React.createElement(window.Ic, {
      name: "upload",
      size: 15
    }),
    onClick: doBeam
  }, "Beam screenshot"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      color: "var(--label-tertiary)",
      fontSize: 11
    }
  }, /*#__PURE__*/React.createElement("span", null, "or press"), /*#__PURE__*/React.createElement(KeycapA, {
    combo: window.OB.hotkey
  }))) : beaming === "done" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--accent-tint)",
      boxShadow: "inset 0 0 0 1px var(--separator)",
      borderRadius: "var(--radius-md)",
      padding: "10px 11px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement(window.Ic, {
    name: "clipboard",
    size: 13,
    stroke: 2.1,
    style: {
      color: "var(--accent)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: "var(--label-secondary)"
    }
  }, "Copied to clipboard")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11.5,
      lineHeight: 1.55,
      color: "var(--label)",
      wordBreak: "break-word"
    }
  }, "Use this screenshot: ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--accent)",
      fontWeight: 600
    }
  }, host.folder, "/2025-06-14-15.30.22.png"))), /*#__PURE__*/React.createElement(ButtonA, {
    variant: "secondary",
    size: "md",
    block: true,
    icon: /*#__PURE__*/React.createElement(window.Ic, {
      name: "rotate-cw",
      size: 14
    }),
    onClick: () => setBeaming("idle")
  }, "Beam again")) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 12,
      padding: "6px 0 8px"
    }
  }, /*#__PURE__*/React.createElement(window.BeamMark, {
    size: 52,
    state: beaming
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 500,
      color: "var(--label)",
      whiteSpace: "nowrap"
    }
  }, beaming === "uploading" ? `Beaming to ${host.name}…` : `Beamed to ${host.name}`))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      padding: "12px 16px",
      borderTop: "1px solid var(--separator)"
    }
  }, /*#__PURE__*/React.createElement(DotA, {
    status: "online"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--label)",
      fontWeight: 500
    }
  }, host.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--label-tertiary)",
      fontFamily: "var(--font-mono)"
    }
  }, host.folder)));
}
Object.assign(window, {
  FlowA,
  PopoverFrameA: PopoverFrame
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "prototypes/onboarding/flowA.jsx", error: String((e && e.message) || e) }); }

// prototypes/onboarding/flowB.jsx
try { (() => {
/* Flow B — Guided "Welcome to Hostbeam" window.
   A proper ~480px first-run window with a left step rail and a live connection
   test. Philosophy: do setup thoroughly once, with confidence it works. */
const B = window.HostbeamDesignSystem_23dc0f;
const {
  Button: ButtonB,
  ListRow: ListRowB,
  StatusDot: DotB,
  Keycap: KeycapB,
  Switch: SwitchB,
  Badge: BadgeB,
  Spinner: SpinnerB
} = B;
const B_STEPS = ["Welcome", "Host", "Test", "Finish"];
function WindowFrame({
  children,
  onSkip
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 480,
      background: "var(--surface-popover)",
      borderRadius: "var(--radius-xl)",
      boxShadow: "var(--shadow-popover)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 38,
      display: "flex",
      alignItems: "center",
      padding: "0 12px",
      borderBottom: "1px solid var(--separator)",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, ["#FF5F57", "#FEBC2E", "#28C840"].map(c => /*#__PURE__*/React.createElement("span", {
    key: c,
    style: {
      width: 12,
      height: 12,
      borderRadius: "50%",
      background: c,
      boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,.12)"
    }
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      textAlign: "center",
      fontSize: 12.5,
      fontWeight: 600,
      color: "var(--label-secondary)",
      pointerEvents: "none"
    }
  }, "Hostbeam Setup"), onSkip ? /*#__PURE__*/React.createElement("button", {
    onClick: onSkip,
    style: {
      marginLeft: "auto",
      border: 0,
      background: "transparent",
      color: "var(--label-tertiary)",
      fontSize: 11.5,
      fontWeight: 500,
      cursor: "pointer",
      zIndex: 1
    }
  }, "Skip") : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      height: 372
    }
  }, children));
}
function StepRail({
  step
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 152,
      flex: "none",
      background: "var(--surface-sunken)",
      borderRight: "1px solid var(--separator)",
      padding: "16px 12px",
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "0 4px 14px"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/hostbeam-mark.svg",
    width: "18",
    height: "18",
    alt: ""
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--label)"
    }
  }, "Hostbeam")), B_STEPS.map((s, i) => {
    const done = i < step,
      cur = i === step;
    return /*#__PURE__*/React.createElement("div", {
      key: s,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "7px 6px",
        borderRadius: "var(--radius-md)",
        background: cur ? "var(--accent-tint)" : "transparent"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 20,
        height: 20,
        borderRadius: "50%",
        flex: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        fontWeight: 600,
        background: done ? "var(--accent)" : cur ? "var(--accent)" : "var(--fill-tertiary)",
        color: done || cur ? "#fff" : "var(--label-tertiary)"
      }
    }, done ? /*#__PURE__*/React.createElement(window.Ic, {
      name: "check",
      size: 12,
      stroke: 2.6
    }) : i + 1), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        fontWeight: cur ? 600 : 500,
        color: cur ? "var(--label)" : done ? "var(--label-secondary)" : "var(--label-tertiary)"
      }
    }, s));
  }));
}
function FlowB({
  onDone
}) {
  const [step, setStep] = React.useState(0);
  const [hostId, setHostId] = React.useState(null);
  const [test, setTest] = React.useState("idle"); // idle | testing | ok | fail
  const [launch, setLaunch] = React.useState(true);
  const host = window.OB.detected.find(h => h.id === hostId);
  const runTest = React.useCallback(() => {
    if (!host) return;
    setTest("testing");
    window.OB.testConnection(host.id).then(r => setTest(r.ok ? "ok" : "fail"));
  }, [host]);

  // Auto-run the test when the Test step opens.
  React.useEffect(() => {
    if (step === 2 && test === "idle") runTest();
  }, [step]); // eslint-disable-line

  const next = () => setStep(s => Math.min(3, s + 1));
  const back = () => setStep(s => Math.max(0, s - 1));
  let content,
    canContinue = true,
    continueLabel = "Continue",
    onContinue = next;
  if (step === 0) {
    content = /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: "../../assets/hostbeam-icon.svg",
      width: "56",
      height: "56",
      alt: ""
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 20,
        fontWeight: 600,
        color: "var(--label)",
        letterSpacing: "-0.01em"
      }
    }, "Welcome to Hostbeam"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--label-secondary)",
        marginTop: 5,
        maxWidth: 270,
        lineHeight: 1.5
      }
    }, "Show a remote coding agent a local screenshot without breaking flow. Three things to set up:")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 9
      }
    }, [["server", "Pick a host", "From your existing SSH config"], ["zap", "Test it", "Confirm we can reach it"], ["keyboard", "Set a hotkey", "Beam from anywhere"]].map(([ic, t, d]) => /*#__PURE__*/React.createElement("div", {
      key: t,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 11
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 32,
        height: 32,
        borderRadius: "var(--radius-md)",
        background: "var(--accent-tint)",
        color: "var(--accent)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "none"
      }
    }, /*#__PURE__*/React.createElement(window.Ic, {
      name: ic,
      size: 16
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        fontWeight: 600,
        color: "var(--label)"
      }
    }, t), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--label-tertiary)"
      }
    }, d))))));
    continueLabel = "Get started";
  } else if (step === 1) {
    content = /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 12,
        height: "100%"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16,
        fontWeight: 600,
        color: "var(--label)"
      }
    }, "Choose your default host"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--label-secondary)",
        marginTop: 3
      }
    }, "Detected in ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)"
      }
    }, "~/.ssh/config"), ". You can change it later.")), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflow: "auto",
        border: "1px solid var(--separator)",
        borderRadius: "var(--radius-lg)",
        background: "var(--surface-content)"
      }
    }, window.OB.detected.map(h => /*#__PURE__*/React.createElement(ListRowB, {
      key: h.id,
      interactive: true,
      selected: h.id === hostId,
      onClick: () => {
        setHostId(h.id);
        setTest("idle");
      },
      leading: /*#__PURE__*/React.createElement(DotB, {
        status: h.id === "edge" ? "offline" : "online"
      }),
      title: h.name,
      subtitle: `${h.user}@${h.address}`,
      monoSub: true,
      trailing: h.id === hostId ? /*#__PURE__*/React.createElement(window.Ic, {
        name: "check",
        size: 16,
        style: {
          color: "var(--accent)"
        },
        stroke: 2.4
      }) : null
    }))));
    canContinue = !!hostId;
  } else if (step === 2) {
    content = /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16,
        fontWeight: 600,
        color: "var(--label)"
      }
    }, "Test the connection"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--label-secondary)",
        marginTop: 3
      }
    }, "Make sure we can reach ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: "var(--label)"
      }
    }, host.name), " over SSH.")), /*#__PURE__*/React.createElement("div", {
      style: {
        border: "1px solid var(--separator)",
        borderRadius: "var(--radius-lg)",
        background: "var(--surface-content)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        textAlign: "center"
      }
    }, test === "testing" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(SpinnerB, {
      size: 26
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: "var(--label)"
      }
    }, "Connecting to ", host.name, "\u2026"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--label-tertiary)",
        fontFamily: "var(--font-mono)",
        marginTop: 3
      }
    }, host.user, "@", host.address))), test === "ok" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 48,
        height: 48,
        borderRadius: "50%",
        background: "var(--success-tint)",
        color: "var(--success)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement(window.Ic, {
      name: "check",
      size: 24,
      stroke: 2.4
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 600,
        color: "var(--label)"
      }
    }, "Connected to ", host.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--label-secondary)",
        fontFamily: "var(--font-mono)",
        marginTop: 4
      }
    }, "ssh-agent \xB7 ed25519"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--label-tertiary)",
        fontFamily: "var(--font-mono)",
        marginTop: 2
      }
    }, host.folder, " is writable"))), test === "fail" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 48,
        height: 48,
        borderRadius: "50%",
        background: "var(--danger-tint)",
        color: "var(--danger)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement(window.Ic, {
      name: "x",
      size: 24,
      stroke: 2.4
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 600,
        color: "var(--label)"
      }
    }, "Couldn't reach ", host.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--danger)",
        fontFamily: "var(--font-mono)",
        marginTop: 4
      }
    }, "Operation timed out after 10s")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(ButtonB, {
      variant: "secondary",
      size: "md",
      onClick: () => setStep(1)
    }, "Choose another"), /*#__PURE__*/React.createElement(ButtonB, {
      variant: "primary",
      size: "md",
      icon: /*#__PURE__*/React.createElement(window.Ic, {
        name: "rotate-cw",
        size: 14
      }),
      onClick: runTest
    }, "Retry")))));
    canContinue = test === "ok";
  } else {
    content = /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16,
        fontWeight: 600,
        color: "var(--label)"
      }
    }, "You're all set"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--label-secondary)",
        marginTop: 3
      }
    }, "Copy a screenshot and press your hotkey to beam it.")), /*#__PURE__*/React.createElement("div", {
      style: {
        border: "1px solid var(--separator)",
        borderRadius: "var(--radius-lg)",
        background: "var(--surface-content)",
        overflow: "hidden"
      }
    }, [["Host", host.name], ["Remote folder", host.folder], ["Connection", "Verified"]].map(([k, v], i) => /*#__PURE__*/React.createElement("div", {
      key: k,
      style: {
        display: "flex",
        alignItems: "center",
        padding: "10px 13px",
        borderTop: i ? "1px solid var(--separator)" : 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "var(--label-secondary)"
      }
    }, k), /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: "auto",
        fontSize: 12,
        fontFamily: v === "Verified" ? "var(--font-system)" : "var(--font-mono)",
        color: "var(--label)",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        whiteSpace: "nowrap"
      }
    }, v === "Verified" ? /*#__PURE__*/React.createElement(DotB, {
      status: "online"
    }) : null, v))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        padding: "10px 13px",
        borderTop: "1px solid var(--separator)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "var(--label-secondary)"
      }
    }, "Global hotkey"), /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: "auto"
      }
    }, /*#__PURE__*/React.createElement(KeycapB, {
      combo: window.OB.hotkey
    })))), /*#__PURE__*/React.createElement(SwitchB, {
      checked: launch,
      onChange: setLaunch,
      label: "Launch Hostbeam at login"
    }));
    continueLabel = "Start using Hostbeam";
    onContinue = onDone;
  }
  return /*#__PURE__*/React.createElement(WindowFrame, {
    onSkip: step < 3 ? onDone : null
  }, /*#__PURE__*/React.createElement(StepRail, {
    step: step
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: "20px 22px",
      overflow: "hidden"
    }
  }, content), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "12px 16px",
      borderTop: "1px solid var(--separator)"
    }
  }, step > 0 && step < 3 ? /*#__PURE__*/React.createElement(ButtonB, {
    variant: "ghost",
    size: "md",
    icon: /*#__PURE__*/React.createElement(window.Ic, {
      name: "arrow-left",
      size: 14
    }),
    onClick: back
  }, "Back") : /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto"
    }
  }), /*#__PURE__*/React.createElement(ButtonB, {
    variant: "primary",
    size: "md",
    disabled: !canContinue,
    iconRight: step < 3 ? /*#__PURE__*/React.createElement(window.Ic, {
      name: "arrow-right",
      size: 14
    }) : null,
    onClick: onContinue
  }, continueLabel))));
}
window.FlowB = FlowB;
})(); } catch (e) { __ds_ns.__errors.push({ path: "prototypes/onboarding/flowB.jsx", error: String((e && e.message) || e) }); }

// prototypes/onboarding/flowC.jsx
try { (() => {
/* Flow C — Single-card, zero-friction onboarding.
   Everything on one calm card: auto-detect hosts, pick one, optional test,
   finish. Philosophy: collapse setup into a single decision, no steps. */
const C = window.HostbeamDesignSystem_23dc0f;
const {
  Button: ButtonC,
  ListRow: ListRowC,
  StatusDot: DotC,
  Keycap: KeycapC,
  Switch: SwitchC,
  Badge: BadgeC,
  Spinner: SpinnerC
} = C;
function CardFrame({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 380,
      background: "var(--surface-popover)",
      borderRadius: "var(--radius-2xl)",
      boxShadow: "var(--shadow-popover)",
      overflow: "hidden"
    }
  }, children);
}
function FlowC({
  onDone
}) {
  const [scanning, setScanning] = React.useState(true);
  const [hostId, setHostId] = React.useState(null);
  const [test, setTest] = React.useState("idle"); // idle | testing | ok | fail
  const [launch, setLaunch] = React.useState(true);
  const [done, setDone] = React.useState(false);
  const host = window.OB.detected.find(h => h.id === hostId);
  React.useEffect(() => {
    const t = setTimeout(() => setScanning(false), 1100);
    return () => clearTimeout(t);
  }, []);
  const sendTest = () => {
    setTest("testing");
    window.OB.testConnection(hostId).then(r => setTest(r.ok ? "ok" : "fail"));
  };
  if (done) {
    return /*#__PURE__*/React.createElement(CardFrame, null, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "26px 22px 22px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 11
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "ob-pop",
      style: {
        width: 52,
        height: 52,
        borderRadius: "50%",
        background: "var(--success-tint)",
        color: "var(--success)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement(window.Ic, {
      name: "check",
      size: 26,
      stroke: 2.4
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 17,
        fontWeight: 600,
        color: "var(--label)"
      }
    }, "Hostbeam is ready"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: "var(--label-secondary)",
        marginTop: 4
      }
    }, "Copy a screenshot and press ", /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        verticalAlign: "middle"
      }
    }, /*#__PURE__*/React.createElement(KeycapC, {
      combo: window.OB.hotkey
    })), " to beam it to ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: "var(--label)"
      }
    }, host.name), ".")), /*#__PURE__*/React.createElement(ButtonC, {
      variant: "primary",
      size: "lg",
      block: true,
      icon: /*#__PURE__*/React.createElement(window.Ic, {
        name: "upload",
        size: 15
      }),
      style: {
        marginTop: 4
      }
    }, "Beam screenshot")));
  }
  return /*#__PURE__*/React.createElement(CardFrame, null, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "16px 18px 12px",
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/hostbeam-icon.svg",
    width: "38",
    height: "38",
    alt: ""
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      color: "var(--label)"
    }
  }, "Set up Hostbeam"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: "var(--label-tertiary)"
    }
  }, "One screen \xB7 no account \xB7 uses your SSH config")), /*#__PURE__*/React.createElement("button", {
    onClick: onDone,
    style: {
      border: 0,
      background: "transparent",
      color: "var(--label-tertiary)",
      fontSize: 11.5,
      fontWeight: 500,
      cursor: "pointer"
    }
  }, "Skip")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 18px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10.5,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: ".05em",
      color: "var(--label-tertiary)",
      marginBottom: 7,
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(window.Ic, {
    name: "server",
    size: 12
  }), scanning ? "Scanning ~/.ssh/config…" : `Found ${window.OB.detected.length} hosts · pick one`), /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1px solid var(--separator)",
      borderRadius: "var(--radius-lg)",
      background: "var(--surface-content)",
      overflow: "hidden"
    }
  }, scanning ? [0, 1, 2].map(i => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 12px",
      borderTop: i ? "1px solid var(--separator)" : 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ob-shimmer",
    style: {
      width: 8,
      height: 8,
      borderRadius: "50%"
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "ob-shimmer",
    style: {
      width: 90 + i * 20,
      height: 9,
      borderRadius: 4
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "ob-shimmer",
    style: {
      width: 54,
      height: 8,
      borderRadius: 4,
      marginLeft: "auto"
    }
  }))) : window.OB.detected.map(h => /*#__PURE__*/React.createElement(ListRowC, {
    key: h.id,
    interactive: true,
    selected: h.id === hostId,
    onClick: () => {
      setHostId(h.id);
      setTest("idle");
    },
    leading: /*#__PURE__*/React.createElement("span", {
      style: {
        width: 16,
        height: 16,
        borderRadius: "50%",
        flex: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: h.id === hostId ? "none" : "inset 0 0 0 1.5px var(--border-field)",
        background: h.id === hostId ? "var(--accent)" : "transparent"
      }
    }, h.id === hostId ? /*#__PURE__*/React.createElement(window.Ic, {
      name: "check",
      size: 11,
      stroke: 3,
      style: {
        color: "#fff"
      }
    }) : null),
    title: h.name,
    subtitle: `${h.user}@${h.address}`,
    monoSub: true,
    trailing: /*#__PURE__*/React.createElement(DotC, {
      status: h.id === "edge" ? "offline" : "online"
    })
  })))), host ? /*#__PURE__*/React.createElement("div", {
    className: "ob-reveal",
    key: hostId,
    style: {
      padding: "12px 18px 0",
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "9px 11px",
      borderRadius: "var(--radius-md)",
      background: test === "fail" ? "var(--danger-tint)" : test === "ok" ? "var(--success-tint)" : "var(--surface-sunken)"
    }
  }, test === "idle" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(window.Ic, {
    name: "zap",
    size: 15,
    style: {
      color: "var(--label-secondary)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--label)"
    }
  }, "Send a test beam to be sure"), /*#__PURE__*/React.createElement(ButtonC, {
    variant: "secondary",
    size: "sm",
    style: {
      marginLeft: "auto"
    },
    onClick: sendTest
  }, "Test")), test === "testing" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(SpinnerC, {
    size: 14
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--label-secondary)"
    }
  }, "Beaming a test image to ", host.name, "\u2026")), test === "ok" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(window.Ic, {
    name: "check",
    size: 15,
    stroke: 2.4,
    style: {
      color: "var(--success)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--label)"
    }
  }, "Reached ", host.name, " \u2014 ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      color: "var(--label-secondary)"
    }
  }, host.folder))), test === "fail" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(window.Ic, {
    name: "x",
    size: 15,
    stroke: 2.4,
    style: {
      color: "var(--danger)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--label)"
    }
  }, host.name, " didn't answer."), /*#__PURE__*/React.createElement(ButtonC, {
    variant: "secondary",
    size: "sm",
    style: {
      marginLeft: "auto"
    },
    onClick: sendTest
  }, "Retry"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      padding: "0 1px"
    }
  }, /*#__PURE__*/React.createElement(window.Ic, {
    name: "keyboard",
    size: 15,
    style: {
      color: "var(--label-tertiary)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      color: "var(--label)"
    }
  }, "Global hotkey"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto"
    }
  }, /*#__PURE__*/React.createElement(KeycapC, {
    combo: window.OB.hotkey
  }))), /*#__PURE__*/React.createElement(SwitchC, {
    checked: launch,
    onChange: setLaunch,
    label: "Launch Hostbeam at login"
  })) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 18px 16px"
    }
  }, /*#__PURE__*/React.createElement(ButtonC, {
    variant: "primary",
    size: "lg",
    block: true,
    disabled: !host,
    icon: /*#__PURE__*/React.createElement(window.Ic, {
      name: "check",
      size: 15
    }),
    onClick: () => setDone(true)
  }, host ? `Finish — beam to ${host.name}` : "Pick a host to continue")));
}
window.FlowC = FlowC;
})(); } catch (e) { __ds_ns.__errors.push({ path: "prototypes/onboarding/flowC.jsx", error: String((e && e.message) || e) }); }

// prototypes/onboarding/shared.jsx
try { (() => {
/* Hostbeam onboarding prototype — shared data, helpers, inline icons, chrome.
   Consumes the design system via window.HostbeamDesignSystem_23dc0f. */

/* --- Mock data: hosts "found in ~/.ssh/config" -------------------------- */
window.OB = {
  detected: [{
    id: "prod",
    name: "prod-box",
    address: "10.4.0.12",
    user: "dev",
    folder: "/tmp/hostbeam"
  }, {
    id: "stg",
    name: "staging",
    address: "10.4.0.30",
    user: "deploy",
    folder: "/tmp/hostbeam"
  }, {
    id: "dev",
    name: "dev-box",
    address: "10.4.0.88",
    user: "dev",
    folder: "/tmp/hostbeam"
  }, {
    id: "edge",
    name: "edge-eu",
    address: "fra1.dev",
    user: "ci",
    folder: "/tmp/hostbeam"
  }],
  /* Fuller ~/.ssh/config pool — the universe Preferences searches to add hosts.
     `detected` (above) stays as the onboarding subset; do not change it. */
  sshConfig: [{
    id: "prod",
    name: "prod-box",
    address: "10.4.0.12",
    user: "dev",
    folder: "/tmp/hostbeam",
    online: true
  }, {
    id: "stg",
    name: "staging",
    address: "10.4.0.30",
    user: "deploy",
    folder: "/tmp/hostbeam",
    online: true
  }, {
    id: "dev",
    name: "dev-box",
    address: "10.4.0.88",
    user: "dev",
    folder: "/tmp/hostbeam",
    online: true
  }, {
    id: "edge",
    name: "edge-eu",
    address: "fra1.dev",
    user: "ci",
    folder: "/tmp/hostbeam",
    online: false
  }, {
    id: "gpu",
    name: "gpu-trainer",
    address: "10.8.1.5",
    user: "ml",
    folder: "/tmp/hostbeam",
    online: true
  }, {
    id: "db",
    name: "db-replica",
    address: "10.4.2.7",
    user: "admin",
    folder: "/tmp/hostbeam",
    online: true
  }, {
    id: "bastion",
    name: "bastion",
    address: "bastion.corp",
    user: "ops",
    folder: "/tmp/hostbeam",
    online: true
  }, {
    id: "sandbox",
    name: "sandbox",
    address: "10.9.0.3",
    user: "dev",
    folder: "/tmp/hostbeam",
    online: true
  }, {
    id: "ci-runner",
    name: "ci-runner",
    address: "10.4.0.51",
    user: "ci",
    folder: "/tmp/hostbeam",
    online: true
  }, {
    id: "old-vps",
    name: "old-vps",
    address: "vps.legacy",
    user: "root",
    folder: "/tmp/hostbeam",
    online: false
  }],
  hotkey: "cmd shift 7",
  /* Mock async connection test. A host is reachable unless its `online` flag is
     explicitly false (edge-eu / old-vps fail); manual hosts default to online.
     Looks across the ssh-config pool + any manually-added hosts. */
  testConnection(hostId) {
    const pool = window.HB ? window.HB.allHosts() : this.sshConfig || [];
    const host = pool.find(h => h.id === hostId);
    const ok = host ? host.online !== false : hostId !== "edge";
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(ok ? {
          ok: true,
          detail: "ssh-agent · ed25519 · /tmp/hostbeam writable"
        } : {
          ok: false,
          error: "Operation timed out after 10s"
        });
      }, 1300);
    });
  },
  /* Multi-step diagnostics for the host details + About sheet. */
  runDiagnostics(hostId) {
    const host = window.HB ? window.HB.hostById(hostId) : (this.sshConfig || []).find(h => h.id === hostId);
    const reachable = host ? host.online !== false : true;
    return new Promise(resolve => {
      setTimeout(() => {
        if (!reachable) {
          resolve([{
            label: "SSH reachable",
            status: "fail",
            detail: "Operation timed out after 10s"
          }, {
            label: "Authentication",
            status: "skip",
            detail: "Skipped"
          }, {
            label: "Remote folder writable",
            status: "skip",
            detail: "Skipped"
          }, {
            label: "Round-trip latency",
            status: "skip",
            detail: "Skipped"
          }]);
          return;
        }
        const ms = 28 + Math.floor(Math.random() * 70);
        resolve([{
          label: "SSH reachable",
          status: "ok",
          detail: host ? `${host.user}@${host.address}` : "connected"
        }, {
          label: "Authentication",
          status: "ok",
          detail: "ssh-agent · ed25519"
        }, {
          label: "Remote folder writable",
          status: "ok",
          detail: window.HB ? window.HB.folderFor(hostId) : host ? host.folder : "/tmp/hostbeam"
        }, {
          label: "Round-trip latency",
          status: ms > 75 ? "warn" : "ok",
          detail: `${ms} ms`
        }]);
      }, 1400);
    });
  },
  /* Shortcuts macOS reserves — used to warn during hotkey recording. */
  SYSTEM_SHORTCUTS: [{
    keys: ["cmd", "shift", "3"],
    name: "Screenshot (whole screen)"
  }, {
    keys: ["cmd", "shift", "4"],
    name: "Screenshot (selection)"
  }, {
    keys: ["cmd", "shift", "5"],
    name: "Screenshot toolbar"
  }, {
    keys: ["cmd", "space"],
    name: "Spotlight"
  }, {
    keys: ["cmd", "tab"],
    name: "App switcher"
  }, {
    keys: ["cmd", "q"],
    name: "Quit app"
  }, {
    keys: ["cmd", "w"],
    name: "Close window"
  }, {
    keys: ["ctrl", "up"],
    name: "Mission Control"
  }],
  hotkeyConflict(keys) {
    const norm = a => (a || []).map(x => String(x).toLowerCase()).sort().join("+");
    const t = norm(keys);
    const hit = this.SYSTEM_SHORTCUTS.find(sc => norm(sc.keys) === t);
    return hit ? hit.name : null;
  },
  /* Reachability test for a host spec that isn't saved yet (Add-host sheet).
     Fails on empty/invalid-looking addresses so typos are caught up front. */
  testHost(spec) {
    const a = String(spec && spec.address || "").trim().toLowerCase();
    const bad = !a || /\s/.test(a) || /(invalid|unknown|nope|timeout|\.example$|192\.0\.2\.)/.test(a);
    return new Promise(resolve => {
      setTimeout(() => resolve(bad ? {
        ok: false,
        error: "Operation timed out after 10s"
      } : {
        ok: true,
        detail: "ssh-agent · ed25519 · reachable"
      }), 1200);
    });
  }
};

/* --- Beam error taxonomy — each failure has its own calm one-line message
   (Beam voice), a technical detail line (mono), an optional recovery hint, and
   which recovery actions the surface should offer. Shared so Preferences and
   the popover speak the same language. --------------------------------------- */
window.OB.BEAM_ERRORS = {
  timeout: {
    icon: "x",
    title: h => `${h.name} didn’t answer.`,
    detail: () => "Operation timed out after 10s",
    hint: null,
    recover: ["retry", "diag", "switch"]
  },
  auth: {
    icon: "lock",
    title: h => `${h.name} refused the key.`,
    detail: () => "Permission denied (publickey)",
    hint: "Add your key with ssh-add, then beam again.",
    recover: ["retry", "diag"]
  },
  perm: {
    icon: "folder",
    title: () => "Remote folder isn’t writable.",
    detail: (h, folder) => `mkdir ${folder}: permission denied`,
    hint: "Pick another folder in Preferences.",
    recover: ["retry", "diag", "folder"]
  }
};

/* --- Shared, persisted config: the one source of truth that both the
   Preferences window and the menu-bar popover read & write. ---------------- */
window.HB = function () {
  const KEY = "hostbeam.config.v1";
  const DEFAULTS = {
    addedIds: ["prod", "stg", "dev"],
    defaultId: "prod",
    manualHosts: [],
    // hosts the user typed in (not from ~/.ssh/config)
    folders: {},
    // per-host remote-folder overrides, keyed by host id
    recent: [
    // last few beamed screenshots (most-recent first)
    {
      id: "r-seed-1",
      hostId: "prod",
      hostName: "prod-box",
      path: "/tmp/hostbeam/2025-06-14-15.12.04.png",
      at: Date.now() - 1000 * 60 * 6
    }, {
      id: "r-seed-2",
      hostId: "stg",
      hostName: "staging",
      path: "/tmp/hostbeam/2025-06-14-14.48.51.png",
      at: Date.now() - 1000 * 60 * 52
    }],
    settings: {
      launch: true,
      menubar: true,
      immediate: true,
      copySentence: true,
      notify: true,
      folder: "/tmp/hostbeam",
      sentence: "Use this screenshot: {path}",
      sound: false,
      flash: true
    },
    hotkey: ["cmd", "shift", "7"]
  };
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULTS));
      const p = JSON.parse(raw);
      return {
        ...DEFAULTS,
        ...p,
        settings: {
          ...DEFAULTS.settings,
          ...(p.settings || {})
        }
      };
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULTS));
    }
  }
  function save(cfg) {
    try {
      localStorage.setItem(KEY, JSON.stringify(cfg));
    } catch (e) {}
    try {
      window.dispatchEvent(new CustomEvent("hb:config", {
        detail: cfg
      }));
    } catch (e) {}
  }
  function allHosts() {
    const cfg = load();
    const config = window.OB && window.OB.sshConfig || [];
    return [...config, ...(cfg.manualHosts || [])];
  }
  function hostById(id) {
    return allHosts().find(h => h.id === id) || null;
  }
  /* Effective remote folder for a host: its override, else the global default. */
  function folderFor(id) {
    const cfg = load();
    return cfg.folders && cfg.folders[id] || cfg.settings.folder;
  }
  return {
    KEY,
    DEFAULTS,
    load,
    save,
    allHosts,
    hostById,
    folderFor
  };
}();

/* React hook: live-subscribed config + an updater that persists & broadcasts.
   Same-tab updates arrive via the 'hb:config' event; cross-tab via 'storage'. */
function useHBConfig() {
  const [cfg, setCfg] = React.useState(window.HB.load);
  React.useEffect(() => {
    const onLocal = e => setCfg(e.detail);
    const onStorage = e => {
      if (e.key === window.HB.KEY) setCfg(window.HB.load());
    };
    window.addEventListener("hb:config", onLocal);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("hb:config", onLocal);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  const update = React.useCallback(patch => {
    setCfg(prev => {
      const next = typeof patch === "function" ? patch(prev) : {
        ...prev,
        ...patch
      };
      window.HB.save(next);
      return next;
    });
  }, []);
  return [cfg, update];
}
window.useHBConfig = useHBConfig;

/* --- Inline SVG icons (avoids Lucide/React re-render conflicts) ---------- */
const OB_ICONS = {
  "arrow-right": /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M5 12h14"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m12 5 7 7-7 7"
  })),
  "arrow-left": /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M19 12H5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m12 19-7-7 7-7"
  })),
  "arrow-down": /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 5v14"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m19 12-7 7-7-7"
  })),
  "chevron-right": /*#__PURE__*/React.createElement("path", {
    d: "m9 18 6-6-6-6"
  }),
  "chevron-left": /*#__PURE__*/React.createElement("path", {
    d: "m15 18-6-6 6-6"
  }),
  "chevron-up": /*#__PURE__*/React.createElement("path", {
    d: "m18 15-6-6-6 6"
  }),
  "chevron-down": /*#__PURE__*/React.createElement("path", {
    d: "m6 9 6 6 6-6"
  }),
  check: /*#__PURE__*/React.createElement("path", {
    d: "M20 6 9 17l-5-5"
  }),
  "check-circle": /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m9 12 2 2 4-4"
  })),
  x: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m6 6 12 12"
  })),
  plus: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M5 12h14"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 5v14"
  })),
  minus: /*#__PURE__*/React.createElement("path", {
    d: "M5 12h14"
  }),
  server: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "4",
    width: "18",
    height: "7",
    rx: "1.5"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "13",
    width: "18",
    height: "7",
    rx: "1.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7 7.5h0"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7 16.5h0"
  })),
  keyboard: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "6",
    width: "20",
    height: "12",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6 10h0M10 10h0M14 10h0M18 10h0M8 14h8"
  })),
  folder: /*#__PURE__*/React.createElement("path", {
    d: "M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"
  }),
  upload: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 19V6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m6 12 6-6 6 6"
  })),
  zap: /*#__PURE__*/React.createElement("path", {
    d: "M13 2 3 14h7l-1 8 10-12h-7l1-8z"
  }),
  "rotate-cw": /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M21 12a9 9 0 1 1-2.64-6.36"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M21 3v6h-6"
  })),
  lock: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "5",
    y: "11",
    width: "14",
    height: "9",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 11V7a4 4 0 0 1 8 0v4"
  })),
  terminal: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "m4 17 6-6-6-6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 19h8"
  })),
  info: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 11v5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 8h0"
  })),
  sliders: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M4 6h8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 6h4"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "14",
    cy: "6",
    r: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M4 12h4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 12h8"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "10",
    cy: "12",
    r: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M4 18h10"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M18 18h2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "16",
    cy: "18",
    r: "2"
  })),
  bell: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10.3 21a1.94 1.94 0 0 0 3.4 0"
  })),
  search: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m21 21-4.35-4.35"
  })),
  clipboard: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "8",
    y: "2",
    width: "8",
    height: "4",
    rx: "1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
  })),
  activity: /*#__PURE__*/React.createElement("path", {
    d: "M22 12h-4l-3 9L9 3l-3 9H2"
  }),
  clock: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 7.5V12l3 1.6"
  })),
  "alert-triangle": /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 9v4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 17h.01"
  }))
};
function Ic({
  name,
  size = 16,
  stroke = 2,
  style,
  className
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: className,
    style: {
      display: "inline-block",
      verticalAlign: "middle",
      flex: "none",
      ...style
    }
  }, OB_ICONS[name] || null);
}

/* --- Screenshot thumbnail placeholder ----------------------------------- */
function ShotThumb({
  tint = "#cdd6e6",
  w = 44,
  h = 30
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: w,
      height: h,
      borderRadius: "var(--radius-sm)",
      flex: "none",
      background: tint,
      boxShadow: "inset 0 0 0 0.5px var(--separator)",
      position: "relative",
      overflow: "hidden",
      display: "inline-block"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 4,
      left: 4,
      display: "flex",
      gap: 2
    }
  }, [0.18, 0.12, 0.12].map((o, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: 3,
      height: 3,
      borderRadius: "50%",
      background: `rgba(0,0,0,${o})`
    }
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      left: 4,
      right: 4,
      bottom: 4,
      height: h * 0.42,
      borderRadius: 2,
      background: "rgba(0,0,0,.07)"
    }
  }));
}

/* --- Animated brand mark (the beam) — the product's one expressive motion.
   state: "uploading" (slices pulse up the beam), "landing" (node pops + ring
   blooms once), or "idle" (static logo). CSS keyframes live in each shell's
   index.html, gated behind prefers-reduced-motion. --------------------------- */
function BeamMark({
  size = 58,
  state = "uploading"
}) {
  const cls = "bm" + (state === "uploading" ? " bm-uploading" : state === "landing" ? " bm-landing" : "");
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 1024 1024",
    fill: "none",
    className: cls,
    style: {
      filter: "drop-shadow(0 6px 14px rgba(25,48,110,.28))"
    },
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "bm-g",
    x1: "512",
    y1: "64",
    x2: "512",
    y2: "960",
    gradientUnits: "userSpaceOnUse"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#5A95FF"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#2A66EC"
  }))), /*#__PURE__*/React.createElement("rect", {
    width: "1024",
    height: "1024",
    rx: "232",
    fill: "url(#bm-g)"
  }), /*#__PURE__*/React.createElement("rect", {
    width: "1024",
    height: "512",
    rx: "232",
    fill: "#fff",
    opacity: "0.07"
  }), /*#__PURE__*/React.createElement("circle", {
    className: "bm-ring",
    cx: "512",
    cy: "250",
    r: "56",
    fill: "none",
    stroke: "#fff",
    strokeWidth: "16"
  }), /*#__PURE__*/React.createElement("circle", {
    className: "bm-el bm-node",
    cx: "512",
    cy: "250",
    r: "50",
    fill: "#fff",
    style: {
      animationDelay: ".36s"
    }
  }), /*#__PURE__*/React.createElement("path", {
    className: "bm-el",
    d: "M462 362 H562",
    stroke: "#fff",
    strokeWidth: "46",
    strokeLinecap: "round",
    style: {
      animationDelay: ".24s"
    }
  }), /*#__PURE__*/React.createElement("path", {
    className: "bm-el",
    d: "M430 454 H594",
    stroke: "#fff",
    strokeWidth: "46",
    strokeLinecap: "round",
    style: {
      animationDelay: ".12s"
    }
  }), /*#__PURE__*/React.createElement("path", {
    className: "bm-el",
    d: "M392 546 H632",
    stroke: "#fff",
    strokeWidth: "46",
    strokeLinecap: "round",
    style: {
      animationDelay: "0s"
    }
  }), /*#__PURE__*/React.createElement("rect", {
    x: "360",
    y: "616",
    width: "304",
    height: "226",
    rx: "48",
    fill: "#fff"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "404",
    y: "664",
    width: "216",
    height: "130",
    rx: "22",
    fill: "url(#bm-g)",
    opacity: "0.26"
  }));
}
window.BeamMark = BeamMark;

/* --- Beam-landed sound (the product's one designed cue) — "Soft chime".
   Synthesized with Web Audio so there's no asset to ship. Off by default;
   gated by the "Play a sound when a beam lands" preference. Call unlock() on
   the triggering click (so the AudioContext starts inside a user gesture),
   then beamLanded() the moment the beam lands. ---------------------------- */
window.HBSound = function () {
  let ctx;
  function ac() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        return null;
      }
    }
    if (ctx.state === "suspended") {
      try {
        ctx.resume();
      } catch (e) {}
    }
    return ctx;
  }
  function reverb(c, seconds, decay) {
    const len = Math.floor(c.sampleRate * seconds),
      buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    const cv = c.createConvolver();
    cv.buffer = buf;
    return cv;
  }
  function pluck(c, dest, o) {
    const osc = c.createOscillator();
    osc.type = o.type || "sine";
    osc.frequency.value = o.freq;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, o.t);
    g.gain.exponentialRampToValueAtTime(o.gain, o.t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, o.t + o.dur);
    osc.connect(g);
    g.connect(dest);
    osc.start(o.t);
    osc.stop(o.t + o.dur + 0.05);
  }
  return {
    unlock() {
      ac();
    },
    beamLanded() {
      const c = ac();
      if (!c) return;
      const t = c.currentTime + 0.02;
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 4400;
      lp.connect(c.destination);
      const rv = reverb(c, 0.7, 3),
        wg = c.createGain();
      wg.gain.value = 0.24;
      lp.connect(rv);
      rv.connect(wg);
      wg.connect(c.destination);
      pluck(c, lp, {
        freq: 587.33,
        t,
        dur: 0.18,
        gain: 0.16
      }); // D5 — rise
      pluck(c, lp, {
        freq: 880.00,
        t: t + 0.08,
        dur: 0.20,
        gain: 0.18
      }); // A5 — rise
      pluck(c, lp, {
        freq: 1174.66,
        t: t + 0.17,
        dur: 0.55,
        gain: 0.26
      }); // D6 — land
      pluck(c, lp, {
        freq: 587.33,
        t: t + 0.17,
        dur: 0.60,
        gain: 0.09
      }); // sub warmth
    }
  };
}();

/* --- Step dots ---------------------------------------------------------- */
function StepDots({
  count,
  active
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      gap: 5,
      alignItems: "center"
    }
  }, Array.from({
    length: count
  }).map((_, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: i === active ? 16 : 6,
      height: 6,
      borderRadius: 999,
      background: i === active ? "var(--accent)" : "var(--fill-tertiary)",
      transition: "width var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out)"
    }
  })));
}
Object.assign(window, {
  Ic,
  ShotThumb,
  StepDots
});

/* Step transition used by the popover-native flow (injected once). */
(function () {
  if (typeof document !== "undefined" && !document.getElementById("ob-step-style")) {
    const el = document.createElement("style");
    el.id = "ob-step-style";
    el.textContent = ".hb-step{animation:hb-step-in 260ms var(--ease-out)}@keyframes hb-step-in{from{opacity:0;transform:translateY(5px) scale(.99)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){.hb-step{animation:none}}";
    document.head.appendChild(el);
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "prototypes/onboarding/shared.jsx", error: String((e && e.message) || e) }); }

// prototypes/onboarding/tweaks-panel.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// tweaks-panel.jsx
// Reusable Tweaks shell + form-control helpers.
// Exports (to window): useTweaks, TweaksPanel, TweakSection, TweakRow, TweakSlider,
//   TweakToggle, TweakRadio, TweakSelect, TweakText, TweakNumber, TweakColor, TweakButton.
//
// Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
// posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
// individual prototypes don't re-roll it. Ships a consistent set of controls so you
// don't hand-draw <input type="range">, segmented radios, steppers, etc.
//
// Usage (in an HTML file that loads React + Babel):
//
//   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
//     "primaryColor": "#D97757",
//     "palette": ["#D97757", "#29261b", "#f6f4ef"],
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   }/*EDITMODE-END*/;
//
//   function App() {
//     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
//     return (
//       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
//         Hello
//         <TweaksPanel>
//           <TweakSection label="Typography" />
//           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
//                        onChange={(v) => setTweak('fontSize', v)} />
//           <TweakRadio  label="Density" value={t.density}
//                        options={['compact', 'regular', 'comfy']}
//                        onChange={(v) => setTweak('density', v)} />
//           <TweakSection label="Theme" />
//           <TweakColor  label="Primary" value={t.primaryColor}
//                        options={['#D97757', '#2A6FDB', '#1F8A5B', '#7A5AE0']}
//                        onChange={(v) => setTweak('primaryColor', v)} />
//           <TweakColor  label="Palette" value={t.palette}
//                        options={[['#D97757', '#29261b', '#f6f4ef'],
//                                  ['#475569', '#0f172a', '#f1f5f9']]}
//                        onChange={(v) => setTweak('palette', v)} />
//           <TweakToggle label="Dark mode" value={t.dark}
//                        onChange={(v) => setTweak('dark', v)} />
//         </TweaksPanel>
//       </div>
//     );
//   }
//
// TweakRadio is the segmented control for 2–3 short options (auto-falls-back to
// TweakSelect past ~16/~10 chars per label); reach for TweakSelect directly when
// options are many or long. For color tweaks always curate 3-4 options rather than
// a free picker; an option can also be a whole 2–5 color palette (the stored value
// is the array). The Tweak* controls are a floor, not a ceiling — build custom
// controls inside the panel if a tweak calls for UI they don't cover.
/* END USAGE */
// ─────────────────────────────────────────────────────────────────────────────

const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

// ── useTweaks ───────────────────────────────────────────────────────────────
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null ? keyOrEdits : {
      [keyOrEdits]: val
    };
    setValues(prev => ({
      ...prev,
      ...edits
    }));
    window.parent.postMessage({
      type: '__edit_mode_set_keys',
      edits
    }, '*');
    // Same-window signal so in-page listeners (deck-stage rail thumbnails)
    // can react — the parent message only reaches the host, not peers.
    window.dispatchEvent(new CustomEvent('tweakchange', {
      detail: edits
    }));
  }, []);
  return [values, setTweak];
}

// ── TweaksPanel ─────────────────────────────────────────────────────────────
// Floating shell. Registers the protocol listener BEFORE announcing
// availability — if the announce ran first, the host's activate could land
// before our handler exists and the toolbar toggle would silently no-op.
// The close button posts __edit_mode_dismissed so the host's toolbar toggle
// flips off in lockstep; the host echoes __deactivate_edit_mode back which
// is what actually hides the panel.
function TweaksPanel({
  title = 'Tweaks',
  children
}) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  const offsetRef = React.useRef({
    x: 16,
    y: 16
  });
  const PAD = 16;
  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth,
      h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y))
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);
  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);
  React.useEffect(() => {
    const onMsg = e => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({
      type: '__edit_mode_available'
    }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({
      type: '__edit_mode_dismissed'
    }, '*');
  };
  const onDragStart = e => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX,
      sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = ev => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy)
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  if (!open) return null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, __TWEAKS_STYLE), /*#__PURE__*/React.createElement("div", {
    ref: dragRef,
    className: "twk-panel",
    "data-omelette-chrome": "",
    style: {
      right: offsetRef.current.x,
      bottom: offsetRef.current.y
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-hd",
    onMouseDown: onDragStart
  }, /*#__PURE__*/React.createElement("b", null, title), /*#__PURE__*/React.createElement("button", {
    className: "twk-x",
    "aria-label": "Close tweaks",
    onMouseDown: e => e.stopPropagation(),
    onClick: dismiss
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "twk-body"
  }, children)));
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "twk-sect"
  }, label), children);
}
function TweakRow({
  label,
  value,
  children,
  inline = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: inline ? 'twk-row twk-row-h' : 'twk-row'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label), value != null && /*#__PURE__*/React.createElement("span", {
    className: "twk-val"
  }, value)), children);
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label,
    value: `${value}${unit}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    className: "twk-slider",
    min: min,
    max: max,
    step: step,
    value: value,
    onChange: e => onChange(Number(e.target.value))
  }));
}
function TweakToggle({
  label,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-row twk-row-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "twk-toggle",
    "data-on": value ? '1' : '0',
    role: "switch",
    "aria-checked": !!value,
    onClick: () => onChange(!value)
  }, /*#__PURE__*/React.createElement("i", null)));
}
function TweakRadio({
  label,
  value,
  options,
  onChange
}) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  // The active value is read by pointer-move handlers attached for the lifetime
  // of a drag — ref it so a stale closure doesn't fire onChange for every move.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  // Segments wrap mid-word once per-segment width runs out. The track is
  // ~248px (280 panel − 28 body pad − 4 seg pad), each button loses 12px
  // to its own padding, and 11.5px system-ui averages ~6.3px/char — so 2
  // options fit ~16 chars each, 3 fit ~10. Past that (or >3 options), fall
  // back to a dropdown rather than wrap.
  const labelLen = o => String(typeof o === 'object' ? o.label : o).length;
  const maxLen = options.reduce((m, o) => Math.max(m, labelLen(o)), 0);
  const fitsAsSegments = maxLen <= ({
    2: 16,
    3: 10
  }[options.length] ?? 0);
  if (!fitsAsSegments) {
    // <select> emits strings — map back to the original option value so the
    // fallback stays type-preserving (numbers, booleans) like the segment path.
    const resolve = s => {
      const m = options.find(o => String(typeof o === 'object' ? o.value : o) === s);
      return m === undefined ? s : typeof m === 'object' ? m.value : m;
    };
    return /*#__PURE__*/React.createElement(TweakSelect, {
      label: label,
      value: value,
      options: options,
      onChange: s => onChange(resolve(s))
    });
  }
  const opts = options.map(o => typeof o === 'object' ? o : {
    value: o,
    label: o
  });
  const idx = Math.max(0, opts.findIndex(o => o.value === value));
  const n = opts.length;
  const segAt = clientX => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor((clientX - r.left - 2) / inner * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };
  const onPointerDown = e => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = ev => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    ref: trackRef,
    role: "radiogroup",
    onPointerDown: onPointerDown,
    className: dragging ? 'twk-seg dragging' : 'twk-seg'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-seg-thumb",
    style: {
      left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
      width: `calc((100% - 4px) / ${n})`
    }
  }), opts.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.value,
    type: "button",
    role: "radio",
    "aria-checked": o.value === value
  }, o.label))));
}
function TweakSelect({
  label,
  value,
  options,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("select", {
    className: "twk-field",
    value: value,
    onChange: e => onChange(e.target.value)
  }, options.map(o => {
    const v = typeof o === 'object' ? o.value : o;
    const l = typeof o === 'object' ? o.label : o;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })));
}
function TweakText({
  label,
  value,
  placeholder,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("input", {
    className: "twk-field",
    type: "text",
    value: value,
    placeholder: placeholder,
    onChange: e => onChange(e.target.value)
  }));
}
function TweakNumber({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange
}) {
  const clamp = n => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const startRef = React.useRef({
    x: 0,
    val: 0
  });
  const onScrubStart = e => {
    e.preventDefault();
    startRef.current = {
      x: e.clientX,
      val: value
    };
    const decimals = (String(step).split('.')[1] || '').length;
    const move = ev => {
      const dx = ev.clientX - startRef.current.x;
      const raw = startRef.current.val + dx * step;
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(Number(snapped.toFixed(decimals))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-num"
  }, /*#__PURE__*/React.createElement("span", {
    className: "twk-num-lbl",
    onPointerDown: onScrubStart
  }, label), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: value,
    min: min,
    max: max,
    step: step,
    onChange: e => onChange(clamp(Number(e.target.value)))
  }), unit && /*#__PURE__*/React.createElement("span", {
    className: "twk-num-unit"
  }, unit));
}

// Relative-luminance contrast pick — checkmarks drawn over a swatch need to
// read on both #111 and #fafafa without per-option configuration. Hex input
// only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
function __twkIsLight(hex) {
  const h = String(hex).replace('#', '');
  const x = h.length === 3 ? h.replace(/./g, c => c + c) : h.padEnd(6, '0');
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return true;
  const r = n >> 16 & 255,
    g = n >> 8 & 255,
    b = n & 255;
  return r * 299 + g * 587 + b * 114 > 148000;
}
const __TwkCheck = ({
  light
}) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 14 14",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 7.2 5.8 10 11 4.2",
  fill: "none",
  strokeWidth: "2.2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  stroke: light ? 'rgba(0,0,0,.78)' : '#fff'
}));

// TweakColor — curated color/palette picker. Each option is either a single
// hex string or an array of 1-5 hex strings; the card adapts — a lone color
// renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
// rest stacked in a sharp column on the right. onChange emits the
// option in the shape it was passed (string stays string, array stays array).
// Without options it falls back to the native color input for back-compat.
function TweakColor({
  label,
  value,
  options,
  onChange
}) {
  if (!options || !options.length) {
    return /*#__PURE__*/React.createElement("div", {
      className: "twk-row twk-row-h"
    }, /*#__PURE__*/React.createElement("div", {
      className: "twk-lbl"
    }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("input", {
      type: "color",
      className: "twk-swatch",
      value: value,
      onChange: e => onChange(e.target.value)
    }));
  }
  // Native <input type=color> emits lowercase hex per the HTML spec, so
  // compare case-insensitively. String() guards JSON.stringify(undefined),
  // which returns the primitive undefined (no .toLowerCase).
  const key = o => String(JSON.stringify(o)).toLowerCase();
  const cur = key(value);
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-chips",
    role: "radiogroup"
  }, options.map((o, i) => {
    const colors = Array.isArray(o) ? o : [o];
    const [hero, ...rest] = colors;
    const sup = rest.slice(0, 4);
    const on = key(o) === cur;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      className: "twk-chip",
      role: "radio",
      "aria-checked": on,
      "data-on": on ? '1' : '0',
      "aria-label": colors.join(', '),
      title: colors.join(' · '),
      style: {
        background: hero
      },
      onClick: () => onChange(o)
    }, sup.length > 0 && /*#__PURE__*/React.createElement("span", null, sup.map((c, j) => /*#__PURE__*/React.createElement("i", {
      key: j,
      style: {
        background: c
      }
    }))), on && /*#__PURE__*/React.createElement(__TwkCheck, {
      light: __twkIsLight(hero)
    }));
  })));
}
function TweakButton({
  label,
  onClick,
  secondary = false
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: secondary ? 'twk-btn secondary' : 'twk-btn',
    onClick: onClick
  }, label);
}
Object.assign(window, {
  useTweaks,
  TweaksPanel,
  TweakSection,
  TweakRow,
  TweakSlider,
  TweakToggle,
  TweakRadio,
  TweakSelect,
  TweakText,
  TweakNumber,
  TweakColor,
  TweakButton
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "prototypes/onboarding/tweaks-panel.jsx", error: String((e && e.message) || e) }); }

// prototypes/popover/popover.jsx
try { (() => {
/* Hostbeam — steady-state menu-bar popover prototype.
   Reads & writes the SAME shared config as Preferences (window.HB / useHBConfig),
   so the default host, hotkey, remote folder, and paste-ready sentence all stay
   in sync across both surfaces. Switching the host here writes it back.
   Handles the empty (no hosts) and failed-upload states, not just the happy path. */
const PV = window.HostbeamDesignSystem_23dc0f;
const {
  Button: ButtonP,
  StatusDot: DotP,
  Badge: BadgeP,
  Keycap: KeycapP,
  Spinner: SpinnerP,
  HostSelect: HostSelectP
} = PV;
const IcP = window.Ic;
function baseName(p) {
  const x = String(p || "").split("/");
  return x[x.length - 1] || p;
}
function diagIcon(status) {
  if (status === "ok") return /*#__PURE__*/React.createElement(IcP, {
    name: "check",
    size: 14,
    stroke: 2.5,
    style: {
      color: "var(--success)"
    }
  });
  if (status === "fail") return /*#__PURE__*/React.createElement(IcP, {
    name: "x",
    size: 14,
    stroke: 2.5,
    style: {
      color: "var(--danger)"
    }
  });
  if (status === "warn") return /*#__PURE__*/React.createElement(IcP, {
    name: "alert-triangle",
    size: 14,
    stroke: 2.1,
    style: {
      color: "var(--warning)"
    }
  });
  return /*#__PURE__*/React.createElement(IcP, {
    name: "minus",
    size: 14,
    stroke: 2.2,
    style: {
      color: "var(--label-quaternary)"
    }
  });
}
function relTime(at) {
  const s = Math.max(0, Math.round((Date.now() - (at || Date.now())) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
function Beak() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: -7,
      right: 23,
      width: 0,
      height: 0,
      borderLeft: "8px solid transparent",
      borderRight: "8px solid transparent",
      borderBottom: "8px solid var(--surface-popover)",
      filter: "drop-shadow(0 -0.5px 0.5px rgba(0,0,0,0.10))",
      zIndex: 2
    }
  });
}
function Frame({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width: 340
    }
  }, /*#__PURE__*/React.createElement(Beak, null), /*#__PURE__*/React.createElement("div", {
    className: "hb-step",
    style: {
      position: "relative",
      zIndex: 1,
      width: 340,
      background: "var(--surface-popover)",
      borderRadius: "var(--radius-xl)",
      boxShadow: "var(--shadow-popover)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      padding: "12px 16px",
      borderBottom: "1px solid var(--separator)"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/hostbeam-mark.svg",
    width: "18",
    height: "18",
    alt: ""
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--label)"
    }
  }, "Hostbeam"), /*#__PURE__*/React.createElement("a", {
    href: "../preferences/index.html",
    className: "pv-gear",
    title: "Preferences",
    "aria-label": "Open Preferences",
    style: {
      marginLeft: "auto",
      display: "inline-flex",
      color: "var(--label-tertiary)",
      padding: 4,
      borderRadius: "var(--radius-sm)"
    }
  }, /*#__PURE__*/React.createElement(IcP, {
    name: "sliders",
    size: 16
  }))), children));
}
function Popover({
  simResult
}) {
  const [cfg, update] = window.useHBConfig();
  const pool = window.HB.allHosts();
  const added = (cfg.addedIds || []).map(id => pool.find(h => h.id === id)).filter(Boolean);
  const host = pool.find(h => h.id === cfg.defaultId) || added[0] || null;
  const s = cfg.settings;
  const [phase, setPhase] = React.useState("idle"); // idle | uploading | landing | done | failed
  const [err, setErr] = React.useState("timeout"); // which BEAM_ERRORS kind, when phase === failed
  const [diag, setDiag] = React.useState(null); // null | "running" | rows[] — inline diagnostics on failure
  const [path, setPath] = React.useState("");
  const [copiedId, setCopiedId] = React.useState(null);
  const recent = cfg.recent || [];

  // reset transient state if the active host changes
  React.useEffect(() => {
    setPhase("idle");
    setPath("");
    setDiag(null);
  }, [host && host.id]);

  // Keyboard path: focus the primary action whenever the beam state changes, so a
  // hotkey-opened popover is fully operable from the keyboard (Enter beams, etc.).
  const contentRef = React.useRef(null);
  React.useEffect(() => {
    const el = contentRef.current && contentRef.current.querySelector("[data-primary]");
    if (!el) return;
    // Defer past the page-load focus reset so the primary action reliably holds focus.
    const id = setTimeout(() => {
      try {
        el.focus({
          preventScroll: true
        });
      } catch (e) {
        el.focus();
      }
    }, 60);
    return () => clearTimeout(id);
  }, [phase]);

  // The global hotkey beams the clipboard screenshot from anywhere (idle/done/failed).
  const matchHotkey = (e, keys) => {
    if (!keys || !keys.length) return false;
    const mod = k => keys.includes(k);
    if (e.metaKey !== mod("cmd") || e.shiftKey !== mod("shift") || e.altKey !== mod("alt") || e.ctrlKey !== mod("ctrl")) return false;
    const main = keys.find(k => !["cmd", "shift", "alt", "ctrl"].includes(k));
    return main ? String(e.key).toLowerCase() === String(main).toLowerCase() : true;
  };
  React.useEffect(() => {
    const onKey = e => {
      if (!matchHotkey(e, cfg.hotkey)) return;
      e.preventDefault();
      if (host && phase !== "uploading" && phase !== "landing") upload();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cfg.hotkey, phase, host && host.id]);
  const upload = () => {
    if (!host) return;
    setPhase("uploading");
    setDiag(null);
    if (window.HBSound) window.HBSound.unlock();
    // Outcome: a forced simulation (Tweak) wins; otherwise an offline host times out.
    const outcome = simResult && simResult !== "auto" ? simResult === "permission" ? "perm" : simResult : host.online === false ? "timeout" : "success";
    setTimeout(() => {
      if (outcome === "success") {
        const folder = (window.HB.folderFor(host.id) || "/tmp/hostbeam").replace(/\/+$/, "");
        const mm = String(10 + Math.floor(Math.random() * 49)).padStart(2, "0");
        const ss = String(Math.floor(Math.random() * 60)).padStart(2, "0");
        const p2 = `${folder}/2025-06-14-15.${mm}.${ss}.png`;
        setPath(p2);
        setPhase("landing");
        try {
          window.dispatchEvent(new CustomEvent("hb:beamed"));
        } catch (e) {}
        if (s.notify) {
          try {
            window.dispatchEvent(new CustomEvent("hb:notify", {
              detail: {
                hostName: host.name,
                path: p2
              }
            }));
          } catch (e) {}
        }
        if (s.sound && window.HBSound) window.HBSound.beamLanded();
        update(prev => ({
          ...prev,
          recent: [{
            id: "r" + Date.now(),
            hostId: host.id,
            hostName: host.name,
            path: p2,
            at: Date.now()
          }, ...(prev.recent || [])].slice(0, 24)
        }));
        setTimeout(() => setPhase(ph => ph === "landing" ? "done" : ph), 760);
      } else {
        setErr(outcome);
        setPhase("failed");
      }
    }, 1300);
  };
  const copyEntry = entry => {
    const text = (s.sentence || "").includes("{path}") ? (s.sentence || "").split("{path}").join(entry.path) : entry.path;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(() => {});
    } catch (e) {}
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(c => c === entry.id ? null : c), 1400);
  };
  const clearRecent = () => update(p => ({
    ...p,
    recent: []
  }));

  // copied sentence with the path highlighted
  const tpl = s.sentence || "";
  const parts = tpl.split("{path}");
  const sentenceNodes = parts.flatMap((p, i) => i < parts.length - 1 ? [p, /*#__PURE__*/React.createElement("span", {
    key: "x" + i,
    style: {
      color: "var(--accent)",
      fontWeight: 600
    }
  }, path)] : [p]);

  // Order for the switcher: default first, then recently-used, then the rest.
  const recentIds = [...new Set((cfg.recent || []).map(r => r.hostId))];
  const ordered = [];
  const seen = new Set();
  const push = h => {
    if (h && !seen.has(h.id)) {
      ordered.push(h);
      seen.add(h.id);
    }
  };
  push(added.find(h => h.id === cfg.defaultId));
  recentIds.forEach(id => push(added.find(h => h.id === id)));
  added.forEach(push);
  const opts = ordered.map(h => ({
    id: h.id,
    name: h.name,
    address: `${h.user}@${h.address}`,
    status: h.online === false ? "offline" : "online",
    isDefault: h.id === cfg.defaultId
  }));

  /* ---- Empty: no hosts added ---- */
  if (!host) {
    return /*#__PURE__*/React.createElement(Frame, null, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "28px 22px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 11
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 46,
        height: 46,
        borderRadius: "50%",
        background: "var(--fill-secondary)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement(IcP, {
      name: "server",
      size: 22,
      style: {
        color: "var(--label-tertiary)"
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 600,
        color: "var(--label)"
      }
    }, "No host yet"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--label-secondary)",
        maxWidth: 224,
        lineHeight: 1.5
      }
    }, "Point me at a host and I\u2019ll beam your screenshots there."), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 4
      }
    }, /*#__PURE__*/React.createElement(ButtonP, {
      variant: "primary",
      size: "md",
      icon: /*#__PURE__*/React.createElement(IcP, {
        name: "plus",
        size: 14
      }),
      onClick: () => {
        window.location.href = "../preferences/index.html";
      }
    }, "Add a host"))));
  }
  return /*#__PURE__*/React.createElement(Frame, null, /*#__PURE__*/React.createElement("div", {
    ref: contentRef,
    style: {
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 13
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 11,
      padding: "12px 13px",
      background: "var(--surface-content)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "inset 0 0 0 0.5px var(--separator)"
    }
  }, /*#__PURE__*/React.createElement(window.ShotThumb, null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2,
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      fontWeight: 500,
      color: "var(--label)",
      whiteSpace: "nowrap"
    }
  }, "Screenshot on clipboard"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--label-tertiary)",
      fontFamily: "var(--font-mono)"
    }
  }, "PNG \xB7 2560 \xD7 1440")), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto"
    }
  }, /*#__PURE__*/React.createElement(BadgeP, {
    tone: phase === "done" || phase === "landing" ? "accent" : "success",
    dot: true
  }, phase === "done" || phase === "landing" ? "Beamed" : "Ready"))), phase === "idle" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ButtonP, {
    variant: "primary",
    size: "lg",
    block: true,
    "data-primary": true,
    icon: /*#__PURE__*/React.createElement(IcP, {
      name: "upload",
      size: 15
    }),
    onClick: upload
  }, "Beam screenshot"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      flexWrap: "nowrap",
      color: "var(--label-tertiary)",
      fontSize: 11
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      whiteSpace: "nowrap"
    }
  }, "or press"), /*#__PURE__*/React.createElement(KeycapP, {
    keys: cfg.hotkey
  }))) : null, phase === "uploading" || phase === "landing" ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 12,
      padding: "4px 0 2px"
    }
  }, /*#__PURE__*/React.createElement(window.BeamMark, {
    size: 58,
    state: phase
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 500,
      color: "var(--label)",
      whiteSpace: "nowrap"
    }
  }, phase === "uploading" ? `Beaming to ${host.name}…` : `Beamed to ${host.name}`), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      height: 4,
      borderRadius: 3,
      background: "var(--fill-tertiary)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bm-bar" + (phase === "landing" ? " done" : "")
  }))) : null, phase === "done" ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--accent-tint)",
      boxShadow: "inset 0 0 0 1px var(--separator)",
      borderRadius: "var(--radius-md)",
      padding: "10px 11px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement(IcP, {
    name: "clipboard",
    size: 13,
    stroke: 2.1,
    style: {
      color: "var(--accent)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: "var(--label-secondary)"
    }
  }, s.copySentence ? "Copied to clipboard" : "Uploaded — remote path")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11.5,
      lineHeight: 1.55,
      color: "var(--label)",
      wordBreak: "break-word"
    }
  }, s.copySentence ? sentenceNodes : /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--accent)",
      fontWeight: 600
    }
  }, path))), /*#__PURE__*/React.createElement(ButtonP, {
    variant: "secondary",
    size: "md",
    block: true,
    "data-primary": true,
    icon: /*#__PURE__*/React.createElement(IcP, {
      name: "rotate-cw",
      size: 14
    }),
    onClick: () => {
      setPhase("idle");
      setPath("");
    }
  }, "Beam again")) : null, phase === "failed" ? (() => {
    const e = window.OB.BEAM_ERRORS[err] || window.OB.BEAM_ERRORS.timeout;
    const folder = (window.HB.folderFor(host.id) || "/tmp/hostbeam").replace(/\/+$/, "");
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--danger-tint)",
        boxShadow: "inset 0 0 0 1px var(--separator)",
        borderRadius: "var(--radius-md)",
        padding: "10px 11px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 5
      }
    }, /*#__PURE__*/React.createElement(IcP, {
      name: e.icon,
      size: 14,
      stroke: 2.4,
      style: {
        color: "var(--danger)",
        flex: "none"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: "var(--label)"
      }
    }, e.title(host))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--label-secondary)",
        wordBreak: "break-word"
      }
    }, e.detail(host, folder)), e.hint ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: "var(--label-tertiary)",
        marginTop: 6,
        lineHeight: 1.45
      }
    }, e.hint) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 9
      }
    }, e.recover.includes("retry") ? /*#__PURE__*/React.createElement(ButtonP, {
      variant: "primary",
      size: "md",
      block: true,
      "data-primary": true,
      icon: /*#__PURE__*/React.createElement(IcP, {
        name: "rotate-cw",
        size: 14
      }),
      onClick: upload
    }, "Try again") : null, e.recover.includes("folder") ? /*#__PURE__*/React.createElement(ButtonP, {
      variant: "secondary",
      size: "md",
      block: true,
      icon: /*#__PURE__*/React.createElement(IcP, {
        name: "folder",
        size: 14
      }),
      onClick: () => {
        window.location.href = "../preferences/index.html";
      }
    }, "Change folder") : null), e.recover.includes("diag") ? diag === null ? /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setDiag("running");
        window.OB.runDiagnostics(host.id).then(setDiag);
      },
      style: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        width: "100%",
        height: 30,
        border: 0,
        cursor: "pointer",
        borderRadius: "var(--radius-md)",
        background: "transparent",
        color: "var(--label-secondary)",
        fontSize: 12,
        fontWeight: 500,
        fontFamily: "var(--font-system)",
        boxShadow: "inset 0 0 0 0.5px var(--separator)"
      }
    }, /*#__PURE__*/React.createElement(IcP, {
      name: "activity",
      size: 14
    }), " Run diagnostics") : /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--surface-content)",
        boxShadow: "inset 0 0 0 0.5px var(--separator)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden"
      }
    }, diag === "running" ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "11px 12px"
      }
    }, /*#__PURE__*/React.createElement(SpinnerP, {
      size: 14
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "var(--label-secondary)"
      }
    }, "Running checks\u2026")) : diag.map((r, i) => /*#__PURE__*/React.createElement("div", {
      key: r.label,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "9px 12px",
        borderTop: i ? "1px solid var(--separator)" : 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: "none",
        display: "inline-flex",
        width: 14
      }
    }, diagIcon(r.status)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: r.status === "skip" ? "var(--label-tertiary)" : "var(--label)"
      }
    }, r.label), /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: "auto",
        fontFamily: "var(--font-mono)",
        fontSize: 10.5,
        color: "var(--label-tertiary)",
        textAlign: "right",
        maxWidth: 150,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, r.detail)))) : null, e.recover.includes("switch") ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        whiteSpace: "nowrap",
        color: "var(--label-tertiary)",
        fontSize: 11
      }
    }, /*#__PURE__*/React.createElement(IcP, {
      name: "arrow-down",
      size: 12,
      stroke: 2.2
    }), " or switch host below") : null);
  })() : null), recent.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "4px 10px 8px",
      borderTop: "1px solid var(--separator)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      padding: "6px 4px 4px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: ".05em",
      color: "var(--label-tertiary)"
    }
  }, "Recent"), /*#__PURE__*/React.createElement("button", {
    onClick: clearRecent,
    style: {
      marginLeft: "auto",
      border: 0,
      background: "transparent",
      cursor: "pointer",
      fontSize: 11,
      color: "var(--label-tertiary)",
      padding: "2px 4px",
      borderRadius: "var(--radius-xs)"
    }
  }, "Clear")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column"
    }
  }, recent.slice(0, 3).map(e => {
    const copied = copiedId === e.id;
    return /*#__PURE__*/React.createElement("div", {
      key: e.id,
      className: "pv-recent",
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 6px",
        borderRadius: "var(--radius-md)"
      }
    }, /*#__PURE__*/React.createElement(window.ShotThumb, {
      w: 38,
      h: 26
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 1,
        minWidth: 0,
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--label)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      }
    }, baseName(e.path)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10.5,
        color: "var(--label-tertiary)"
      }
    }, e.hostName, " \xB7 ", relTime(e.at))), /*#__PURE__*/React.createElement("button", {
      onClick: () => copyEntry(e),
      title: "Copy paste-ready sentence",
      "aria-label": `Copy paste-ready sentence for ${baseName(e.path)}`,
      style: {
        flex: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 26,
        height: 26,
        border: 0,
        cursor: "pointer",
        borderRadius: "var(--radius-sm)",
        background: "transparent",
        color: copied ? "var(--success)" : "var(--label-tertiary)"
      }
    }, /*#__PURE__*/React.createElement(IcP, {
      name: copied ? "check" : "clipboard",
      size: 14,
      stroke: copied ? 2.6 : 2
    })));
  })), recent.length > 3 ? /*#__PURE__*/React.createElement("a", {
    href: "../preferences/index.html#recent",
    className: "pv-morelink",
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      textDecoration: "none",
      padding: "7px 4px 3px",
      fontSize: 11,
      color: "var(--label-tertiary)"
    }
  }, "+", recent.length - 3, " more in Preferences") : null) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 14px 14px",
      borderTop: "1px solid var(--separator)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: ".05em",
      color: "var(--label-tertiary)",
      margin: "0 2px 6px"
    }
  }, "Beam to"), /*#__PURE__*/React.createElement(HostSelectP, {
    className: "pv-upward",
    hosts: opts,
    value: cfg.defaultId,
    onChange: id => update({
      defaultId: id
    })
  })));
}
window.Popover = Popover;
})(); } catch (e) { __ds_ns.__errors.push({ path: "prototypes/popover/popover.jsx", error: String((e && e.message) || e) }); }

// prototypes/preferences/prefs.jsx
try { (() => {
/* Hostbeam — Preferences window prototype.
   Compact macOS settings window: General / Hosts / Hotkey / About.
   Reuses the design system + ../onboarding/shared.jsx (Ic, OB data). */
const P = window.HostbeamDesignSystem_23dc0f;
const {
  Button,
  Switch,
  Field,
  StatusDot,
  Badge,
  Keycap,
  Spinner
} = P;
const Ic = window.Ic;
const OB = window.OB;

/* Relative time ("just now", "6m ago", …) — shared across panes. */
function relTime(at) {
  const s = Math.max(0, Math.round((Date.now() - (at || Date.now())) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
const baseName = p => {
  const x = String(p || "").split("/");
  return x[x.length - 1] || p;
};

/* --- macOS settings group + row -------------------------------------- */
function Group({
  title,
  children,
  footnote
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 18
    }
  }, title ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10.5,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: ".05em",
      color: "var(--label-tertiary)",
      margin: "0 0 7px 2px"
    }
  }, title) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-content)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "inset 0 0 0 0.5px var(--separator)",
      overflow: "hidden"
    }
  }, children), footnote ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--label-tertiary)",
      margin: "7px 2px 0",
      lineHeight: 1.45
    }
  }, footnote) : null);
}
function Row({
  children,
  first,
  align = "center"
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: align,
      gap: 12,
      padding: "11px 14px",
      borderTop: first ? 0 : "1px solid var(--separator)"
    }
  }, children);
}
function Label({
  title,
  sub
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2,
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--label)",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, title), sub ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--label-tertiary)"
    }
  }, sub) : null);
}

/* --- Live hotkey recorder (captures real keystrokes) ----------------- */
function HotkeyRecorder({
  value,
  onChange
}) {
  const [rec, setRec] = React.useState(false);
  React.useEffect(() => {
    if (!rec) return;
    const onKey = e => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        setRec(false);
        return;
      }
      if (["Meta", "Control", "Alt", "Shift"].includes(e.key)) return;
      const mods = [];
      if (e.metaKey) mods.push("cmd");
      if (e.ctrlKey) mods.push("ctrl");
      if (e.altKey) mods.push("opt");
      if (e.shiftKey) mods.push("shift");
      const map = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        Enter: "enter",
        " ": "space",
        Tab: "tab"
      };
      const key = map[e.key] || (e.key.length === 1 ? e.key.toUpperCase() : e.key);
      onChange([...mods, key]);
      setRec(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [rec]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      marginLeft: "auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 96,
      height: 28,
      padding: "0 10px",
      borderRadius: "var(--radius-md)",
      background: rec ? "var(--accent-tint)" : "var(--surface-sunken)",
      boxShadow: rec ? "inset 0 0 0 1px var(--accent)" : "inset 0 0 0 1px var(--border-field)",
      transition: "box-shadow var(--dur-fast) var(--ease-standard), background var(--dur-fast) var(--ease-standard)"
    }
  }, rec ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11.5,
      color: "var(--accent)",
      fontWeight: 500
    }
  }, "Press a shortcut\u2026") : /*#__PURE__*/React.createElement(Keycap, {
    keys: value
  })), /*#__PURE__*/React.createElement(Button, {
    variant: rec ? "secondary" : "secondary",
    size: "sm",
    onClick: () => setRec(r => !r)
  }, rec ? "Cancel" : "Record"));
}

/* --- Panes ----------------------------------------------------------- */
/* --- Paste-ready sentence editor (live preview) ---------------------- */
function SentenceEditor({
  s,
  set,
  recent
}) {
  const taRef = React.useRef(null);
  const tpl = s.sentence || "";
  const folder = (s.folder || "/tmp/hostbeam").replace(/\/+$/, "");
  // Prefer the path from the most recent real beam so the preview is concrete;
  // fall back to a representative example when nothing has been beamed yet.
  const last = recent && recent[0] || null;
  const example = last ? last.path : `${folder}/2025-06-14-15.30.22.png`;
  const hasPath = tpl.includes("{path}");
  const disabled = !s.copySentence;
  const insertPath = () => {
    const el = taRef.current;
    if (!el) {
      set("sentence", tpl + (tpl && !/\s$/.test(tpl) ? " " : "") + "{path}");
      return;
    }
    const a = el.selectionStart,
      b = el.selectionEnd;
    const next = tpl.slice(0, a) + "{path}" + tpl.slice(b);
    set("sentence", next);
    requestAnimationFrame(() => {
      el.focus();
      const p = a + 6;
      el.setSelectionRange(p, p);
    });
  };

  // preview: substitute {path} with the example path, highlighted
  const parts = tpl.split("{path}");
  const preview = parts.flatMap((p, i) => i < parts.length - 1 ? [p, /*#__PURE__*/React.createElement("span", {
    key: "p" + i,
    style: {
      color: "var(--accent)",
      fontWeight: 600
    }
  }, example)] : [p]);
  return /*#__PURE__*/React.createElement(Group, {
    title: "Paste-ready sentence",
    footnote: /*#__PURE__*/React.createElement(React.Fragment, null, "The text copied to your clipboard after each beam. ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)"
      }
    }, "{path}"), " is replaced with the screenshot\u2019s remote path.")
  }, /*#__PURE__*/React.createElement(Row, {
    first: true
  }, /*#__PURE__*/React.createElement(Label, {
    title: "Copy a sentence after beaming",
    sub: "Ready to paste into your remote coding agent"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto"
    }
  }, /*#__PURE__*/React.createElement(Switch, {
    checked: s.copySentence,
    onChange: v => set("copySentence", v)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px solid var(--separator)",
      padding: "12px 14px",
      opacity: disabled ? 0.5 : 1,
      pointerEvents: disabled ? "none" : "auto",
      transition: "opacity var(--dur-fast) var(--ease-standard)"
    }
  }, /*#__PURE__*/React.createElement("textarea", {
    ref: taRef,
    value: tpl,
    onChange: e => set("sentence", e.target.value),
    rows: 2,
    spellCheck: false,
    placeholder: "Use this screenshot: {path}",
    style: {
      width: "100%",
      boxSizing: "border-box",
      resize: "none",
      border: 0,
      outline: "none",
      borderRadius: "var(--radius-md)",
      background: "var(--surface-sunken)",
      boxShadow: "inset 0 0 0 1px var(--border-field)",
      padding: "8px 10px",
      fontFamily: "var(--font-mono)",
      fontSize: 12.5,
      lineHeight: 1.55,
      color: "var(--label)"
    },
    onFocus: e => {
      e.target.style.boxShadow = "inset 0 0 0 1px var(--accent), var(--ring-focus)";
    },
    onBlur: e => {
      e.target.style.boxShadow = "inset 0 0 0 1px var(--border-field)";
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      marginTop: 9
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: insertPath,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      height: 24,
      padding: "0 9px 0 7px",
      border: 0,
      cursor: "pointer",
      borderRadius: "var(--radius-sm)",
      background: "var(--fill-secondary)",
      color: "var(--label-secondary)",
      fontSize: 11.5,
      fontWeight: 500
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "plus",
    size: 12,
    stroke: 2.4
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)"
    }
  }, "{path}")), !hasPath ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      fontSize: 11,
      color: "var(--warning)"
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "info",
    size: 12,
    stroke: 2.2
  }), " Add ", "{path}", " so the location is included") : null, /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    onClick: () => set("sentence", "Use this screenshot: {path}")
  }, "Reset"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 13
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: ".05em",
      color: "var(--label-tertiary)",
      marginBottom: 5,
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", null, "Preview"), last ? /*#__PURE__*/React.createElement("span", {
    style: {
      textTransform: "none",
      letterSpacing: 0,
      fontWeight: 500,
      color: "var(--label-quaternary)"
    }
  }, "from your last beam to ", last.hostName) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 9,
      background: "var(--accent-tint)",
      boxShadow: "inset 0 0 0 1px var(--separator)",
      borderRadius: "var(--radius-md)",
      padding: "10px 11px"
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "clipboard",
    size: 14,
    stroke: 2,
    style: {
      color: "var(--accent)",
      flex: "none",
      marginTop: 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      lineHeight: 1.55,
      color: "var(--label)",
      wordBreak: "break-word"
    }
  }, tpl.trim() ? preview : /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--label-tertiary)"
    }
  }, "Nothing will be copied."))))));
}
function GeneralPane({
  s,
  set,
  recent
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Group, {
    title: "Startup"
  }, /*#__PURE__*/React.createElement(Row, {
    first: true
  }, /*#__PURE__*/React.createElement(Label, {
    title: "Launch Hostbeam at login"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto"
    }
  }, /*#__PURE__*/React.createElement(Switch, {
    checked: s.launch,
    onChange: v => set("launch", v)
  }))), /*#__PURE__*/React.createElement(Row, null, /*#__PURE__*/React.createElement(Label, {
    title: "Show icon in the menu bar"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto"
    }
  }, /*#__PURE__*/React.createElement(Switch, {
    checked: s.menubar,
    onChange: v => set("menubar", v)
  })))), /*#__PURE__*/React.createElement(Group, {
    title: "Beaming",
    footnote: "When on, triggering Hostbeam with a default host set beams immediately \u2014 no picker."
  }, /*#__PURE__*/React.createElement(Row, {
    first: true
  }, /*#__PURE__*/React.createElement(Label, {
    title: "Beam immediately when triggered",
    sub: "Skip the host picker if a default exists"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto"
    }
  }, /*#__PURE__*/React.createElement(Switch, {
    checked: s.immediate,
    onChange: v => set("immediate", v)
  }))), /*#__PURE__*/React.createElement(Row, null, /*#__PURE__*/React.createElement(Label, {
    title: "Notify on success"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto"
    }
  }, /*#__PURE__*/React.createElement(Switch, {
    checked: s.notify,
    onChange: v => set("notify", v)
  })))), /*#__PURE__*/React.createElement(SentenceEditor, {
    s: s,
    set: set,
    recent: recent
  }), /*#__PURE__*/React.createElement(Group, {
    title: "Default remote folder",
    footnote: "Where screenshots land on each host. You can override it per host under Hosts."
  }, /*#__PURE__*/React.createElement(Row, {
    first: true
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "folder",
    size: 16,
    style: {
      color: "var(--label-tertiary)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      marginLeft: -2
    }
  }, /*#__PURE__*/React.createElement(Field, {
    mono: true,
    value: s.folder,
    onChange: e => set("folder", e.target.value)
  })))));
}

/* --- Autocomplete: search & add a host from ~/.ssh/config ------------ */
function HostSearch({
  pool,
  onAdd
}) {
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const ref = React.useRef(null);
  const listRef = React.useRef(null);
  const norm = q.trim().toLowerCase();
  const results = pool.filter(h => `${h.name} ${h.user}@${h.address}`.toLowerCase().includes(norm));
  React.useEffect(() => {
    setActive(0);
  }, [q, open]);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  React.useEffect(() => {
    const el = listRef.current?.children[active];
    if (el) el.scrollIntoView({
      block: "nearest"
    });
  }, [active]);
  const add = h => {
    if (!h) return;
    onAdd(h.id);
    setQ("");
    setOpen(false);
  };
  const onKey = e => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive(a => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(a => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      add(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 7,
      height: 32,
      padding: "0 10px",
      borderRadius: "var(--radius-md)",
      background: "var(--surface-content)",
      boxShadow: open ? "inset 0 0 0 1px var(--accent), var(--ring-focus)" : "inset 0 0 0 1px var(--border-field)",
      transition: "box-shadow var(--dur-fast) var(--ease-standard)"
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "search",
    size: 14,
    stroke: 2.1,
    style: {
      color: "var(--label-tertiary)"
    }
  }), /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => {
      setQ(e.target.value);
      setOpen(true);
    },
    onFocus: () => setOpen(true),
    onKeyDown: onKey,
    role: "combobox",
    "aria-expanded": open,
    "aria-autocomplete": "list",
    "aria-label": "Search SSH config to add a host",
    placeholder: "Search ~/.ssh/config to add a host\u2026",
    style: {
      flex: 1,
      minWidth: 0,
      border: 0,
      outline: 0,
      background: "transparent",
      fontFamily: "inherit",
      fontSize: 13,
      color: "var(--label)"
    }
  }), q ? /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setQ("");
    },
    title: "Clear",
    "aria-label": "Clear search",
    style: {
      border: 0,
      background: "transparent",
      cursor: "pointer",
      display: "inline-flex",
      padding: 2,
      color: "var(--label-tertiary)"
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "x",
    size: 13,
    stroke: 2.3
  })) : null), open ? /*#__PURE__*/React.createElement("div", {
    role: "listbox",
    "aria-label": "Matching hosts",
    style: {
      position: "absolute",
      top: "calc(100% + 5px)",
      left: 0,
      right: 0,
      zIndex: 50,
      background: "var(--surface-raised)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-menu)",
      padding: 4,
      maxHeight: 232,
      overflow: "auto"
    },
    ref: listRef
  }, results.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "11px 10px",
      fontSize: 12.5,
      color: "var(--label-tertiary)",
      textAlign: "center"
    }
  }, pool.length === 0 ? "Every host in your config is already added." : "No matching hosts in ~/.ssh/config.") : results.map((h, i) => {
    const on = i === active;
    return /*#__PURE__*/React.createElement("button", {
      key: h.id,
      role: "option",
      "aria-selected": on,
      onMouseEnter: () => setActive(i),
      onClick: () => add(h),
      style: {
        display: "flex",
        alignItems: "center",
        gap: 9,
        width: "100%",
        textAlign: "left",
        border: 0,
        cursor: "pointer",
        padding: "8px 9px",
        borderRadius: "var(--radius-sm)",
        background: on ? "var(--accent)" : "transparent",
        color: on ? "#fff" : "var(--label)"
      }
    }, /*#__PURE__*/React.createElement(StatusDot, {
      status: h.online ? "online" : "offline"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 500
      }
    }, h.name), /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: "auto",
        fontFamily: "var(--font-mono)",
        fontSize: 11.5,
        color: on ? "rgba(255,255,255,.8)" : "var(--label-tertiary)"
      }
    }, h.user, "@", h.address), /*#__PURE__*/React.createElement(Ic, {
      name: "plus",
      size: 14,
      stroke: 2.3,
      style: {
        color: on ? "#fff" : "var(--label-quaternary)"
      }
    }));
  })) : null);
}
function HostsPane({
  pool,
  configCount,
  addedIds,
  addHost,
  removeHost,
  addManual,
  onDiagnose,
  selectedId,
  setSelected,
  defaultId,
  setDefault,
  tests,
  runTest,
  folders,
  defaultFolder,
  setFolder,
  clearFolder,
  moveHost,
  renameHost,
  recent
}) {
  const added = addedIds.map(id => pool.find(h => h.id === id)).filter(Boolean);
  const available = pool.filter(h => !addedIds.includes(h.id));
  const sel = added.find(h => h.id === selectedId) || added[0] || null;
  const t = sel ? tests[sel.id] || "idle" : "idle";
  const manualCount = added.filter(h => h.manual).length;
  const overridden = !!(sel && folders && Object.prototype.hasOwnProperty.call(folders, sel.id));
  const effFolder = sel ? overridden ? folders[sel.id] : defaultFolder : defaultFolder;
  const lastBeam = sel && recent ? recent.find(r => r.hostId === sel.id) : null;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Group, {
    title: "In Hostbeam",
    footnote: "These hosts appear in the menu-bar popover. Keys and passphrases are never stored."
  }, added.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "22px 14px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--label-secondary)"
    }
  }, "No host yet"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: "var(--label-tertiary)",
      marginTop: 3
    }
  }, "Search your SSH config below, or add one manually.")) : added.map((h, i) => {
    const isSel = sel && h.id === sel.id;
    return /*#__PURE__*/React.createElement("div", {
      key: h.id,
      className: "pf-row",
      style: {
        display: "flex",
        alignItems: "center",
        borderTop: i ? "1px solid var(--separator)" : 0,
        background: isSel ? "var(--accent-tint)" : undefined
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setSelected(h.id),
      style: {
        flex: 1,
        minWidth: 0,
        display: "flex",
        alignItems: "center",
        gap: 12,
        border: 0,
        background: "transparent",
        cursor: "pointer",
        textAlign: "left",
        padding: "11px 4px 11px 14px"
      }
    }, /*#__PURE__*/React.createElement(StatusDot, {
      status: h.online === false ? "offline" : "online"
    }), /*#__PURE__*/React.createElement(Label, {
      title: h.name,
      sub: `${h.user}@${h.address}`
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: "auto",
        display: "inline-flex",
        alignItems: "center",
        gap: 6
      }
    }, h.manual ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9.5,
        textTransform: "uppercase",
        letterSpacing: ".04em",
        color: "var(--label-tertiary)",
        border: "1px solid var(--separator)",
        borderRadius: "var(--radius-xs)",
        padding: "1px 5px"
      }
    }, "Manual") : null, h.id === defaultId ? /*#__PURE__*/React.createElement(Badge, {
      tone: "accent"
    }, "Default") : null)), added.length > 1 ? /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        flexDirection: "column",
        flex: "none",
        marginRight: 2
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => moveHost(h.id, -1),
      disabled: i === 0,
      title: "Move up",
      "aria-label": `Move ${h.name} up`,
      className: "pf-reorder",
      style: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 24,
        height: 16,
        border: 0,
        background: "transparent",
        cursor: i === 0 ? "default" : "pointer",
        color: i === 0 ? "var(--label-quaternary)" : "var(--label-tertiary)",
        opacity: i === 0 ? 0.4 : 1,
        padding: 0
      }
    }, /*#__PURE__*/React.createElement(Ic, {
      name: "chevron-up",
      size: 13,
      stroke: 2.4
    })), /*#__PURE__*/React.createElement("button", {
      onClick: () => moveHost(h.id, 1),
      disabled: i === added.length - 1,
      title: "Move down",
      "aria-label": `Move ${h.name} down`,
      className: "pf-reorder",
      style: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 24,
        height: 16,
        border: 0,
        background: "transparent",
        cursor: i === added.length - 1 ? "default" : "pointer",
        color: i === added.length - 1 ? "var(--label-quaternary)" : "var(--label-tertiary)",
        opacity: i === added.length - 1 ? 0.4 : 1,
        padding: 0
      }
    }, /*#__PURE__*/React.createElement(Ic, {
      name: "chevron-down",
      size: 13,
      stroke: 2.4
    }))) : null, /*#__PURE__*/React.createElement("button", {
      onClick: () => removeHost(h.id),
      title: `Remove ${h.name}`,
      "aria-label": `Remove ${h.name}`,
      style: {
        flex: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 30,
        height: 30,
        marginRight: 8,
        border: 0,
        cursor: "pointer",
        borderRadius: "var(--radius-md)",
        background: "transparent",
        color: "var(--label-tertiary)"
      },
      onMouseEnter: e => {
        e.currentTarget.style.background = "var(--fill-tertiary)";
        e.currentTarget.style.color = "var(--danger)";
      },
      onMouseLeave: e => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--label-tertiary)";
      }
    }, /*#__PURE__*/React.createElement(Ic, {
      name: "minus",
      size: 15,
      stroke: 2.4
    })));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      margin: "0 2px 7px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10.5,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: ".05em",
      color: "var(--label-tertiary)"
    }
  }, "Add a host"), /*#__PURE__*/React.createElement("button", {
    onClick: addManual,
    style: {
      marginLeft: "auto",
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      border: 0,
      background: "transparent",
      cursor: "pointer",
      color: "var(--accent)",
      fontSize: 12,
      fontWeight: 500,
      padding: 2
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "plus",
    size: 13,
    stroke: 2.4
  }), " Add manually")), /*#__PURE__*/React.createElement(HostSearch, {
    pool: available,
    onAdd: addHost
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--label-tertiary)",
      margin: "7px 2px 0",
      lineHeight: 1.45
    }
  }, configCount, " in ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)"
    }
  }, "~/.ssh/config"), " \xB7 ", added.length, " added", manualCount ? ` · ${manualCount} manual` : "", available.length === 0 ? " · all added" : "", ".")), sel ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Group, {
    title: `${sel.name} — details`
  }, /*#__PURE__*/React.createElement(Row, {
    first: true
  }, /*#__PURE__*/React.createElement(Label, {
    title: "Name",
    sub: sel.manual ? "Editable — added manually" : "From your ~/.ssh/config"
  }), sel.manual ? /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      width: 190
    }
  }, /*#__PURE__*/React.createElement(Field, {
    value: sel.name,
    onChange: e => renameHost(sel.id, e.target.value)
  })) : /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      fontSize: 13,
      color: "var(--label)",
      fontWeight: 500
    }
  }, sel.name)), /*#__PURE__*/React.createElement(Row, null, /*#__PURE__*/React.createElement(Label, {
    title: "Address"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      color: "var(--label)"
    }
  }, sel.user, "@", sel.address)), /*#__PURE__*/React.createElement(Row, null, /*#__PURE__*/React.createElement(Label, {
    title: "Last beamed"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      fontSize: 12.5,
      color: lastBeam ? "var(--label)" : "var(--label-tertiary)"
    }
  }, lastBeam ? relTime(lastBeam.at) : "Never")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "11px 14px",
      borderTop: "1px solid var(--separator)",
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Label, {
    title: "Remote folder",
    sub: overridden ? "Set just for this host" : "Using the default"
  }), overridden ? /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    onClick: () => clearFolder(sel.id)
  }, "Use default")) : null), /*#__PURE__*/React.createElement(Field, {
    mono: true,
    value: effFolder,
    placeholder: defaultFolder,
    onChange: e => setFolder(sel.id, e.target.value)
  })), /*#__PURE__*/React.createElement(Row, null, /*#__PURE__*/React.createElement(Label, {
    title: "Connection"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      display: "inline-flex",
      alignItems: "center",
      gap: 9
    }
  }, t === "testing" && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontSize: 12,
      color: "var(--label-secondary)"
    }
  }, /*#__PURE__*/React.createElement(Spinner, {
    size: 13
  }), " Testing\u2026"), t === "ok" && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      fontSize: 12,
      color: "var(--success)",
      fontWeight: 500
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "check",
    size: 14,
    stroke: 2.4
  }), " Reachable"), t === "fail" && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      fontSize: 12,
      color: "var(--danger)",
      fontWeight: 500
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "x",
    size: 14,
    stroke: 2.4
  }), " Unreachable"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    onClick: () => runTest(sel.id),
    disabled: t === "testing"
  }, t === "idle" ? "Test" : "Re-test")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 9,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "md",
    disabled: sel.id === defaultId,
    onClick: () => setDefault(sel.id)
  }, sel.id === defaultId ? "Default host" : "Set as default"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "md",
    icon: /*#__PURE__*/React.createElement(Ic, {
      name: "activity",
      size: 14
    }),
    onClick: () => onDiagnose(sel.id)
  }, "Diagnostics"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "md",
    icon: /*#__PURE__*/React.createElement(Ic, {
      name: "terminal",
      size: 14
    })
  }, "Open in Terminal"))) : null);
}
function HotkeyPane({
  hotkey,
  setHotkey,
  s,
  set
}) {
  const conflict = OB.hotkeyConflict(hotkey);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Group, {
    title: "Global hotkey",
    footnote: conflict ? undefined : "Press this shortcut from any app to beam the clipboard screenshot."
  }, /*#__PURE__*/React.createElement(Row, {
    first: true
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "keyboard",
    size: 16,
    style: {
      color: "var(--label-tertiary)"
    }
  }), /*#__PURE__*/React.createElement(Label, {
    title: "Beam shortcut"
  }), /*#__PURE__*/React.createElement(HotkeyRecorder, {
    value: hotkey,
    onChange: setHotkey
  })), conflict ? /*#__PURE__*/React.createElement(Row, null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      color: "var(--warning)"
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "alert-triangle",
    size: 15,
    stroke: 2.1,
    style: {
      flex: "none"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--label)"
    }
  }, "This conflicts with ", /*#__PURE__*/React.createElement("b", {
    style: {
      fontWeight: 600
    }
  }, conflict), ". Pick another shortcut."))) : null), /*#__PURE__*/React.createElement(Group, {
    title: "Feedback"
  }, /*#__PURE__*/React.createElement(Row, {
    first: true
  }, /*#__PURE__*/React.createElement(Label, {
    title: "Play a sound when a beam lands"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto"
    }
  }, /*#__PURE__*/React.createElement(Switch, {
    checked: s.sound,
    onChange: v => set("sound", v)
  }))), /*#__PURE__*/React.createElement(Row, null, /*#__PURE__*/React.createElement(Label, {
    title: "Flash the menu-bar icon"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto"
    }
  }, /*#__PURE__*/React.createElement(Switch, {
    checked: s.flash,
    onChange: v => set("flash", v)
  })))));
}
function AboutPane({
  onReset
}) {
  const [confirm, setConfirm] = React.useState(false);
  const [upd, setUpd] = React.useState("idle"); // idle | checking | latest
  React.useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(false), 3000);
    return () => clearTimeout(t);
  }, [confirm]);
  const checkUpdate = () => {
    if (upd === "checking") return;
    setUpd("checking");
    setTimeout(() => setUpd("latest"), 1400);
  };
  const Link = ({
    children
  }) => /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => e.preventDefault(),
    style: {
      color: "var(--accent)",
      textDecoration: "none",
      fontSize: 12
    },
    onMouseEnter: e => {
      e.currentTarget.style.textDecoration = "underline";
    },
    onMouseLeave: e => {
      e.currentTarget.style.textDecoration = "none";
    }
  }, children);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      padding: "18px 0 8px",
      gap: 9
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/hostbeam-icon.svg",
    width: "72",
    height: "72",
    alt: ""
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 600,
      color: "var(--label)"
    }
  }, "Hostbeam"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--label-secondary)",
      marginTop: 2,
      fontFamily: "var(--font-mono)",
      whiteSpace: "nowrap"
    }
  }, "Version 0.1.0 (build 47)")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: "var(--label-secondary)",
      maxWidth: 320,
      lineHeight: 1.5
    }
  }, "A small menu-bar utility for beaming a clipboard screenshot to a remote SSH host and getting a paste-ready path back."), /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: 30,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2
    }
  }, upd === "idle" ? /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    icon: /*#__PURE__*/React.createElement(Ic, {
      name: "rotate-cw",
      size: 13
    }),
    onClick: checkUpdate
  }, "Check for updates") : upd === "checking" ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      fontSize: 12,
      color: "var(--label-secondary)"
    }
  }, /*#__PURE__*/React.createElement(Spinner, {
    size: 13
  }), " Checking\u2026") : /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontSize: 12,
      color: "var(--success)",
      fontWeight: 500
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "check",
    size: 14,
    stroke: 2.4
  }), " You\u2019re on the latest version")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontSize: 12,
      color: "var(--label-secondary)"
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "lock",
    size: 12.5,
    stroke: 2,
    style: {
      color: "var(--label-tertiary)",
      flex: "none"
    }
  }), /*#__PURE__*/React.createElement("span", null, "Nothing leaves your Mac except the screenshot you beam.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      marginTop: 4,
      color: "var(--label-quaternary)",
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement(Link, null, "Website"), /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement(Link, null, "Source"), /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement(Link, null, "Privacy"), /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement(Link, null, "Licenses")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    icon: /*#__PURE__*/React.createElement(Ic, {
      name: "bell",
      size: 13
    })
  }, "Send feedback")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--label-tertiary)",
      marginTop: 8
    }
  }, "\u201CHostbeam\u201D is a provisional name, pending clearance."), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (confirm) {
        onReset();
        setConfirm(false);
      } else {
        setConfirm(true);
      }
    },
    style: {
      marginTop: 4,
      border: 0,
      background: "transparent",
      cursor: "pointer",
      fontSize: 11.5,
      fontWeight: 500,
      padding: "4px 8px",
      borderRadius: "var(--radius-sm)",
      color: confirm ? "var(--danger)" : "var(--label-tertiary)"
    }
  }, confirm ? "Click again to reset everything" : "Reset to defaults…"));
}

/* --- Modal sheet shell ----------------------------------------------- */
function Sheet({
  title,
  onClose,
  children,
  footer,
  width = 384
}) {
  const cardRef = React.useRef(null);
  React.useEffect(() => {
    const opener = document.activeElement;
    const card = cardRef.current;
    // autofocus the first field (or the dialog itself for read-only sheets)
    const first = card && (card.querySelector("input, textarea") || card);
    if (first && first.focus) first.focus();
    const onKey = e => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab" && card) {
        const els = [...card.querySelectorAll('input, textarea, button, a[href], [tabindex]:not([tabindex="-1"])')].filter(el => !el.disabled && el.offsetParent !== null);
        if (!els.length) return;
        const firstEl = els[0],
          lastEl = els[els.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      if (opener && opener.focus) opener.focus(); // restore focus to the trigger
    };
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    onMouseDown: onClose,
    style: {
      position: "absolute",
      inset: 0,
      zIndex: 100,
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      paddingTop: 70,
      background: "rgba(0,0,0,0.18)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: cardRef,
    className: "pf-sheet",
    role: "dialog",
    "aria-modal": "true",
    "aria-label": title,
    tabIndex: -1,
    onMouseDown: e => e.stopPropagation(),
    style: {
      width,
      background: "var(--surface-popover)",
      borderRadius: "var(--radius-xl)",
      boxShadow: "var(--shadow-popover)",
      overflow: "hidden",
      maxHeight: "calc(100% - 110px)",
      display: "flex",
      flexDirection: "column",
      outline: "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      padding: "13px 14px",
      borderBottom: "1px solid var(--separator)",
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--label)",
      whiteSpace: "nowrap"
    }
  }, title), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Close",
    style: {
      marginLeft: "auto",
      border: 0,
      background: "transparent",
      cursor: "pointer",
      color: "var(--label-tertiary)",
      display: "inline-flex",
      padding: 3,
      borderRadius: "var(--radius-sm)"
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "x",
    size: 15,
    stroke: 2.2
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      overflow: "auto"
    }
  }, children), footer ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 9,
      justifyContent: "flex-end",
      padding: "12px 14px",
      borderTop: "1px solid var(--separator)",
      background: "var(--surface-sunken)",
      flex: "none"
    }
  }, footer) : null));
}

/* --- Add a host manually --------------------------------------------- */
function AddHostSheet({
  existing,
  defaultFolder,
  onClose,
  onSave
}) {
  const [name, setName] = React.useState("");
  const [user, setUser] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [folder, setFolder] = React.useState(defaultFolder || "/tmp/hostbeam");
  const [test, setTest] = React.useState("idle"); // idle | testing | ok | fail
  const nameTaken = existing.some(h => h.name.toLowerCase() === name.trim().toLowerCase());
  const valid = name.trim() && user.trim() && address.trim() && !nameTaken;

  // a fresh address invalidates a prior test result
  React.useEffect(() => {
    setTest("idle");
  }, [address, user]);
  const runTest = () => {
    if (!address.trim() || test === "testing") return;
    setTest("testing");
    window.OB.testHost({
      address: address.trim()
    }).then(r => setTest(r.ok ? "ok" : "fail"));
  };
  const save = () => {
    if (valid) onSave({
      name: name.trim(),
      user: user.trim(),
      address: address.trim(),
      folder: folder.trim() || "/tmp/hostbeam",
      online: test !== "fail"
    });
  };
  const onKey = e => {
    if (e.key === "Enter" && valid) save();
  };
  return /*#__PURE__*/React.createElement(Sheet, {
    title: "Add a host",
    onClose: onClose,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "md",
      onClick: onClose
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "md",
      disabled: !valid,
      onClick: save
    }, test === "fail" ? "Add anyway" : "Add host"))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 13
    },
    onKeyDown: onKey
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Name",
    placeholder: "prod-box",
    value: name,
    onChange: e => setName(e.target.value),
    invalid: !!nameTaken,
    help: nameTaken ? "A host with this name already exists." : undefined
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "User",
    mono: true,
    placeholder: "dev",
    value: user,
    onChange: e => setUser(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 2,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Address",
    mono: true,
    placeholder: "10.4.0.12 or host.example.com",
    value: address,
    onChange: e => setAddress(e.target.value)
  }))), /*#__PURE__*/React.createElement(Field, {
    label: "Remote folder",
    mono: true,
    value: folder,
    onChange: e => setFolder(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      paddingTop: 2
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    disabled: !address.trim() || test === "testing",
    onClick: runTest
  }, test === "testing" ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Spinner, {
    size: 12
  }), " Testing\u2026") : "Test connection"), test === "ok" ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      fontSize: 12,
      color: "var(--success)",
      fontWeight: 500,
      whiteSpace: "nowrap"
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "check",
    size: 14,
    stroke: 2.4
  }), " Reachable") : null, test === "fail" ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      fontSize: 12,
      color: "var(--danger)",
      fontWeight: 500,
      whiteSpace: "nowrap"
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "x",
    size: 14,
    stroke: 2.4
  }), " Couldn\u2019t connect") : null, test === "idle" ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11.5,
      color: "var(--label-tertiary)"
    }
  }, "Optional \u2014 check before adding") : null), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: "var(--label-tertiary)"
    }
  }, "Connects as ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      color: "var(--label-secondary)"
    }
  }, user.trim() || "user", "@", address.trim() || "address"))));
}

/* --- Host diagnostics ------------------------------------------------ */
function DiagRow({
  label,
  status,
  detail,
  first
}) {
  const icon = status === "ok" ? /*#__PURE__*/React.createElement(Ic, {
    name: "check",
    size: 15,
    stroke: 2.5,
    style: {
      color: "var(--success)"
    }
  }) : status === "fail" ? /*#__PURE__*/React.createElement(Ic, {
    name: "x",
    size: 15,
    stroke: 2.5,
    style: {
      color: "var(--danger)"
    }
  }) : status === "warn" ? /*#__PURE__*/React.createElement(Ic, {
    name: "alert-triangle",
    size: 15,
    stroke: 2.1,
    style: {
      color: "var(--warning)"
    }
  }) : /*#__PURE__*/React.createElement(Ic, {
    name: "minus",
    size: 15,
    stroke: 2.2,
    style: {
      color: "var(--label-quaternary)"
    }
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "11px 13px",
      borderTop: first ? 0 : "1px solid var(--separator)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: "none",
      display: "inline-flex",
      width: 16
    }
  }, icon), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      color: status === "skip" ? "var(--label-tertiary)" : "var(--label)"
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      fontFamily: "var(--font-mono)",
      fontSize: 11.5,
      color: "var(--label-tertiary)",
      textAlign: "right"
    }
  }, detail));
}
function DiagnosticsSheet({
  host,
  onClose
}) {
  const [rows, setRows] = React.useState(null);
  const run = React.useCallback(() => {
    setRows(null);
    OB.runDiagnostics(host && host.id).then(setRows);
  }, [host && host.id]);
  React.useEffect(() => {
    run();
  }, [run]);
  const overall = rows ? rows.some(r => r.status === "fail") ? "fail" : rows.some(r => r.status === "warn") ? "warn" : "ok" : "run";
  const summary = {
    run: {
      c: "var(--label-secondary)",
      t: "Running checks…"
    },
    ok: {
      c: "var(--success)",
      t: "All checks passed"
    },
    warn: {
      c: "var(--warning)",
      t: "Reachable with warnings"
    },
    fail: {
      c: "var(--danger)",
      t: "Host unreachable"
    }
  }[overall];
  return /*#__PURE__*/React.createElement(Sheet, {
    title: `Diagnostics — ${host ? host.name : ""}`,
    onClose: onClose,
    width: 400,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "md",
      onClick: onClose
    }, "Close"), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "md",
      icon: /*#__PURE__*/React.createElement(Ic, {
        name: "rotate-cw",
        size: 13
      }),
      disabled: !rows,
      onClick: run
    }, "Run again"))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      marginBottom: 13
    }
  }, overall === "run" ? /*#__PURE__*/React.createElement(Spinner, {
    size: 16
  }) : /*#__PURE__*/React.createElement(Ic, {
    name: overall === "ok" ? "check-circle" : overall === "warn" ? "alert-triangle" : "x",
    size: 18,
    stroke: 2.2,
    style: {
      color: summary.c
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13.5,
      fontWeight: 600,
      color: summary.c
    }
  }, summary.t), host ? /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      fontFamily: "var(--font-mono)",
      fontSize: 11.5,
      color: "var(--label-tertiary)"
    }
  }, host.user, "@", host.address) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-content)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "inset 0 0 0 0.5px var(--separator)",
      overflow: "hidden"
    }
  }, (rows || [{
    label: "SSH reachable"
  }, {
    label: "Authentication"
  }, {
    label: "Remote folder writable"
  }, {
    label: "Round-trip latency"
  }]).map((r, i) => /*#__PURE__*/React.createElement(DiagRow, {
    key: r.label,
    first: i === 0,
    label: r.label,
    status: rows ? r.status : "run",
    detail: rows ? r.detail : /*#__PURE__*/React.createElement(Spinner, {
      size: 12
    })
  }))));
}

/* --- Recent beams: full history (the popover shows only the last few) --- */
function RecentPane({
  recent,
  sentence,
  onRemove,
  onClear
}) {
  const [copiedId, setCopiedId] = React.useState(null);
  const list = recent || [];
  const copy = e => {
    const text = (sentence || "").includes("{path}") ? (sentence || "").split("{path}").join(e.path) : e.path;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(() => {});
    } catch (err) {}
    setCopiedId(e.id);
    setTimeout(() => setCopiedId(c => c === e.id ? null : c), 1400);
  };
  if (!list.length) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "64px 20px",
        gap: 9
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 46,
        height: 46,
        borderRadius: "50%",
        background: "var(--fill-secondary)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement(Ic, {
      name: "clock",
      size: 22,
      style: {
        color: "var(--label-tertiary)"
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 600,
        color: "var(--label)"
      }
    }, "Nothing beamed yet"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--label-secondary)",
        maxWidth: 260,
        lineHeight: 1.5
      }
    }, "Beams you send show up here, ready to copy again."));
  }
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      margin: "0 2px 7px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10.5,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: ".05em",
      color: "var(--label-tertiary)",
      whiteSpace: "nowrap"
    }
  }, list.length, " beam", list.length === 1 ? "" : "s"), /*#__PURE__*/React.createElement("button", {
    onClick: onClear,
    style: {
      marginLeft: "auto",
      border: 0,
      background: "transparent",
      cursor: "pointer",
      color: "var(--accent)",
      fontSize: 12,
      fontWeight: 500,
      padding: 2
    }
  }, "Clear all")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-content)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "inset 0 0 0 0.5px var(--separator)",
      overflow: "hidden"
    }
  }, list.map((e, i) => {
    const copied = copiedId === e.id;
    return /*#__PURE__*/React.createElement("div", {
      key: e.id,
      className: "pf-row",
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 10px 10px 14px",
        borderTop: i ? "1px solid var(--separator)" : 0
      }
    }, /*#__PURE__*/React.createElement(window.ShotThumb, {
      w: 42,
      h: 28
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 2,
        minWidth: 0,
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        color: "var(--label)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      }
    }, baseName(e.path)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: "var(--label-tertiary)"
      }
    }, e.hostName, " \xB7 ", relTime(e.at))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 2,
        marginLeft: "auto",
        flex: "none"
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => copy(e),
      title: "Copy paste-ready sentence",
      "aria-label": `Copy sentence for ${baseName(e.path)}`,
      style: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        border: 0,
        cursor: "pointer",
        borderRadius: "var(--radius-md)",
        background: "transparent",
        color: copied ? "var(--success)" : "var(--label-tertiary)"
      }
    }, /*#__PURE__*/React.createElement(Ic, {
      name: copied ? "check" : "clipboard",
      size: 15,
      stroke: copied ? 2.6 : 2
    })), /*#__PURE__*/React.createElement("button", {
      onClick: () => onRemove(e.id),
      title: "Remove from history",
      "aria-label": `Remove ${baseName(e.path)}`,
      style: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        border: 0,
        cursor: "pointer",
        borderRadius: "var(--radius-md)",
        background: "transparent",
        color: "var(--label-tertiary)"
      }
    }, /*#__PURE__*/React.createElement(Ic, {
      name: "x",
      size: 14,
      stroke: 2.2
    }))));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--label-tertiary)",
      margin: "7px 2px 0",
      lineHeight: 1.45
    }
  }, "The last ", list.length, " screenshot", list.length === 1 ? "" : "s", " you beamed. Copy re-uses your paste-ready sentence; nothing is re-sent."));
}

/* --- Ventura-style sidebar nav --------------------------------------- */
const NAV = [{
  id: "general",
  label: "General",
  icon: "sliders",
  tile: "#8E8E93"
}, {
  id: "hosts",
  label: "Hosts",
  icon: "server",
  tile: "var(--accent)"
}, {
  id: "hotkey",
  label: "Hotkey",
  icon: "keyboard",
  tile: "#5E5CE6"
}, {
  id: "recent",
  label: "Recent",
  icon: "clock",
  tile: "#34C759"
}, {
  id: "about",
  label: "About",
  icon: "info",
  tile: "#30B0C7",
  appIcon: true
}];

/* Rounded colored icon tile, white glyph — the Ventura signature. */
function NavTile({
  item
}) {
  if (item.appIcon) {
    return /*#__PURE__*/React.createElement("img", {
      src: "../../assets/hostbeam-icon.svg",
      width: "22",
      height: "22",
      alt: "",
      style: {
        borderRadius: 5,
        flex: "none",
        boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,.12)"
      }
    });
  }
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      borderRadius: 5,
      flex: "none",
      background: item.tile,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,.10), 0 0.5px 1px rgba(0,0,0,.10)"
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: item.icon,
    size: 13.5,
    stroke: 2.1,
    style: {
      color: "#fff"
    }
  }));
}
function Sidebar({
  tab,
  setTab
}) {
  const [q, setQ] = React.useState("");
  const items = NAV.filter(n => n.label.toLowerCase().includes(q.trim().toLowerCase()));
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 218,
      flex: "none",
      display: "flex",
      flexDirection: "column",
      background: "var(--surface-sunken)",
      borderRight: "1px solid var(--separator)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 38,
      flex: "none",
      display: "flex",
      alignItems: "center",
      padding: "0 13px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, ["#FF5F57", "#FEBC2E", "#28C840"].map(c => /*#__PURE__*/React.createElement("span", {
    key: c,
    style: {
      width: 12,
      height: 12,
      borderRadius: "50%",
      background: c,
      boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,.12)"
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "2px 12px 10px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      height: 26,
      padding: "0 8px",
      borderRadius: "var(--radius-md)",
      background: "var(--fill-secondary)"
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "search",
    size: 13,
    stroke: 2.1,
    style: {
      color: "var(--label-tertiary)"
    }
  }), /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "Search",
    "aria-label": "Search settings",
    style: {
      flex: 1,
      minWidth: 0,
      border: 0,
      outline: 0,
      background: "transparent",
      fontFamily: "inherit",
      fontSize: 12.5,
      color: "var(--label)"
    }
  }))), /*#__PURE__*/React.createElement("nav", {
    "aria-label": "Settings sections",
    style: {
      flex: 1,
      overflow: "auto",
      padding: "0 10px 12px",
      display: "flex",
      flexDirection: "column",
      gap: 1
    }
  }, items.map((n, i) => {
    const sel = n.id === tab;
    const onNavKey = e => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const ni = e.key === "ArrowDown" ? Math.min(i + 1, items.length - 1) : Math.max(i - 1, 0);
      setTab(items[ni].id);
      const btns = e.currentTarget.parentElement.querySelectorAll("[data-navitem]");
      if (btns[ni]) btns[ni].focus();
    };
    return /*#__PURE__*/React.createElement("button", {
      key: n.id,
      "data-navitem": true,
      onClick: () => setTab(n.id),
      onKeyDown: onNavKey,
      "aria-current": sel ? "page" : undefined,
      className: "pf-nav-item" + (sel ? " is-sel" : ""),
      style: {
        display: "flex",
        alignItems: "center",
        gap: 9,
        width: "100%",
        textAlign: "left",
        border: 0,
        cursor: "pointer",
        padding: "5px 8px",
        borderRadius: "var(--radius-md)",
        background: sel ? "var(--accent)" : "transparent"
      }
    }, /*#__PURE__*/React.createElement(NavTile, {
      item: n
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 400,
        color: sel ? "#fff" : "var(--label)"
      }
    }, n.label));
  }), items.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--label-tertiary)",
      padding: "8px 9px"
    }
  }, "No results") : null));
}

/* --- Window ----------------------------------------------------------- */
function PrefsApp() {
  const [tab, setTab] = React.useState(() => {
    const h = (window.location.hash || "").replace("#", "");
    return NAV.some(n => n.id === h) ? h : "general";
  });
  const [cfg, update] = useHBConfig();
  const s = cfg.settings;
  const set = (k, v) => update(p => ({
    ...p,
    settings: {
      ...p.settings,
      [k]: v
    }
  }));
  const addedIds = cfg.addedIds || [];
  const defaultId = cfg.defaultId;
  const hotkey = cfg.hotkey;
  const setDefault = id => update({
    defaultId: id
  });
  const setHotkey = keys => update({
    hotkey: keys
  });
  const pool = window.HB.allHosts();
  const configCount = (OB.sshConfig || []).length;
  const folders = cfg.folders || {};
  const setFolder = (id, val) => update(p => ({
    ...p,
    folders: {
      ...(p.folders || {}),
      [id]: val
    }
  }));
  const clearFolder = id => update(p => {
    const f = {
      ...(p.folders || {})
    };
    delete f[id];
    return {
      ...p,
      folders: f
    };
  });
  const [selectedId, setSelectedId] = React.useState(addedIds[0] || null);
  const [tests, setTests] = React.useState({});
  const [sheet, setSheet] = React.useState(null); // {type:'add'} | {type:'diag', hostId}

  // keep selection valid as the added list changes
  React.useEffect(() => {
    if (!addedIds.includes(selectedId)) setSelectedId(addedIds[0] || null);
  }, [addedIds.join(",")]);
  const addHost = id => {
    update(p => ({
      ...p,
      addedIds: p.addedIds.includes(id) ? p.addedIds : [...p.addedIds, id]
    }));
    setSelectedId(id);
  };
  const moveHost = (id, dir) => update(p => {
    const ids = [...p.addedIds];
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return p;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    return {
      ...p,
      addedIds: ids
    };
  });
  const renameHost = (id, name) => update(p => ({
    ...p,
    manualHosts: (p.manualHosts || []).map(h => h.id === id ? {
      ...h,
      name
    } : h)
  }));
  const removeHost = id => update(p => {
    const next = p.addedIds.filter(x => x !== id);
    const isManual = (p.manualHosts || []).some(h => h.id === id);
    const folders = {
      ...(p.folders || {})
    };
    delete folders[id]; // drop any per-host folder override so a later re-add starts clean
    return {
      ...p,
      addedIds: next,
      // a manually-added host is forgotten entirely — it isn't in ~/.ssh/config to re-find,
      // so leaving it in the pool would wrongly resurface it in the config autocomplete.
      manualHosts: isManual ? (p.manualHosts || []).filter(h => h.id !== id) : p.manualHosts,
      folders,
      defaultId: p.defaultId === id ? next[0] || null : p.defaultId
    };
  });
  const addManualHost = ({
    name,
    user,
    address,
    folder,
    online
  }) => {
    const base = (name || "host").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "host";
    const taken = new Set(pool.map(h => h.id));
    let id = base,
      n = 2;
    while (taken.has(id)) id = `${base}-${n++}`;
    const host = {
      id,
      name,
      user,
      address,
      online: online !== false,
      manual: true
    };
    update(p => {
      const nextFolders = {
        ...(p.folders || {})
      };
      if (folder && folder !== p.settings.folder) nextFolders[id] = folder;
      return {
        ...p,
        manualHosts: [...(p.manualHosts || []), host],
        addedIds: [...p.addedIds, id],
        folders: nextFolders
      };
    });
    setSelectedId(id);
    setSheet(null);
  };
  const runTest = id => {
    setTests(p => ({
      ...p,
      [id]: "testing"
    }));
    OB.testConnection(id).then(r => setTests(p => ({
      ...p,
      [id]: r.ok ? "ok" : "fail"
    })));
  };
  const current = NAV.find(n => n.id === tab);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width: 720,
      height: 552,
      background: "var(--surface-content)",
      borderRadius: "var(--radius-xl)",
      boxShadow: "var(--shadow-popover)",
      overflow: "hidden",
      display: "flex"
    }
  }, /*#__PURE__*/React.createElement(Sidebar, {
    tab: tab,
    setTab: setTab
  }), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      background: "var(--window)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 38,
      flex: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    key: tab,
    className: "pf-pane",
    style: {
      flex: 1,
      overflow: "auto",
      padding: "0 30px 28px"
    }
  }, tab !== "about" ? /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 22,
      fontWeight: 700,
      color: "var(--label)",
      margin: "0 0 20px",
      letterSpacing: "-0.01em"
    }
  }, current.label) : null, tab === "general" && /*#__PURE__*/React.createElement(GeneralPane, {
    s: s,
    set: set,
    recent: cfg.recent
  }), tab === "hosts" && /*#__PURE__*/React.createElement(HostsPane, {
    pool: pool,
    configCount: configCount,
    addedIds: addedIds,
    addHost: addHost,
    removeHost: removeHost,
    addManual: () => setSheet({
      type: "add"
    }),
    onDiagnose: id => setSheet({
      type: "diag",
      hostId: id
    }),
    selectedId: selectedId,
    setSelected: setSelectedId,
    defaultId: defaultId,
    setDefault: setDefault,
    tests: tests,
    runTest: runTest,
    folders: folders,
    defaultFolder: s.folder,
    setFolder: setFolder,
    clearFolder: clearFolder,
    moveHost: moveHost,
    renameHost: renameHost,
    recent: cfg.recent
  }), tab === "hotkey" && /*#__PURE__*/React.createElement(HotkeyPane, {
    hotkey: hotkey,
    setHotkey: setHotkey,
    s: s,
    set: set
  }), tab === "recent" && /*#__PURE__*/React.createElement(RecentPane, {
    recent: cfg.recent,
    sentence: s.sentence,
    onRemove: id => update(p => ({
      ...p,
      recent: (p.recent || []).filter(r => r.id !== id)
    })),
    onClear: () => update(p => ({
      ...p,
      recent: []
    }))
  }), tab === "about" && /*#__PURE__*/React.createElement(AboutPane, {
    onReset: () => {
      update(JSON.parse(JSON.stringify(window.HB.DEFAULTS)));
      setSelectedId(window.HB.DEFAULTS.addedIds[0] || null);
      setSheet(null);
    }
  }))), sheet && sheet.type === "add" ? /*#__PURE__*/React.createElement(AddHostSheet, {
    existing: pool,
    defaultFolder: s.folder,
    onClose: () => setSheet(null),
    onSave: addManualHost
  }) : null, sheet && sheet.type === "diag" ? /*#__PURE__*/React.createElement(DiagnosticsSheet, {
    host: pool.find(h => h.id === sheet.hostId) || null,
    onClose: () => setSheet(null)
  }) : null);
}
window.PrefsApp = PrefsApp;
})(); } catch (e) { __ds_ns.__errors.push({ path: "prototypes/preferences/prefs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/hostbeam-app/app.jsx
try { (() => {
/* Hostbeam UI kit — app orchestrator + desktop chrome + demo rail. */
const HBa = window.HostbeamDesignSystem_23dc0f;
const {
  IconButton,
  Tooltip,
  Keycap
} = HBa;
const {
  PopoverShell,
  ReadyView,
  UploadingView,
  SuccessView,
  NoImageView,
  HostFailureView,
  NoHostView,
  SetupView,
  RecentView,
  HostsView,
  DiagnosticsView
} = window;
const DATA = window.HB_DATA;
function HeaderActions({
  onRecent,
  onHosts
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Tooltip, {
    label: "Recent beams"
  }, /*#__PURE__*/React.createElement(IconButton, {
    variant: "plain",
    size: "sm",
    label: "Recent",
    icon: /*#__PURE__*/React.createElement("i", {
      "data-lucide": "clock"
    }),
    onClick: onRecent
  })), /*#__PURE__*/React.createElement(Tooltip, {
    label: "Hosts & settings"
  }, /*#__PURE__*/React.createElement(IconButton, {
    variant: "plain",
    size: "sm",
    label: "Settings",
    icon: /*#__PURE__*/React.createElement("i", {
      "data-lucide": "settings"
    }),
    onClick: onHosts
  })));
}
function App() {
  const initId = (DATA.hosts.find(h => h.isDefault) || DATA.hosts[0] || {
    id: "prod"
  }).id;
  const [view, setView] = React.useState("ready");
  const [hostId, setHostId] = React.useState(initId);
  const [selectedId, setSelectedId] = React.useState(initId);
  const [defaultId, setDefaultId] = React.useState(initId);
  const [copiedId, setCopiedId] = React.useState(null);
  const [copiedMain, setCopiedMain] = React.useState(false);
  const [diagTab, setDiagTab] = React.useState("Summary");
  const [setupHost, setSetupHost] = React.useState(initId);
  const timer = React.useRef(null);
  const hosts = DATA.hosts.map(h => ({
    ...h,
    isDefault: h.id === defaultId
  }));
  const host = hosts.find(h => h.id === hostId) || hosts[0];
  const lastFile = DATA.recents[0] && DATA.recents[0].file || "hostbeam-screenshot.png";
  React.useEffect(() => () => clearTimeout(timer.current), []);

  // Convert static <i data-lucide> icons after each view mounts.
  React.useEffect(() => {
    const id = setTimeout(() => window.lucide && window.lucide.createIcons(), 0);
    return () => clearTimeout(id);
  }, [view]);
  const startUpload = () => {
    setView("uploading");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setCopiedMain(true);
      setView("success");
    }, 1500);
  };
  const go = v => {
    clearTimeout(timer.current);
    setView(v);
  };
  const headerActions = /*#__PURE__*/React.createElement(HeaderActions, {
    onRecent: () => go("recent"),
    onHosts: () => go("hosts")
  });
  let shellProps = {
    actions: headerActions
  };
  let body = null;
  switch (view) {
    case "ready":
      body = /*#__PURE__*/React.createElement(ReadyView, {
        host: host,
        hotkey: DATA.hotkey,
        onUpload: startUpload,
        onChangeHost: () => go("hosts")
      });
      break;
    case "uploading":
      shellProps = {};
      body = /*#__PURE__*/React.createElement(UploadingView, {
        host: host,
        progress: 0.66
      });
      break;
    case "success":
      shellProps = {
        actions: headerActions
      };
      body = /*#__PURE__*/React.createElement(SuccessView, {
        host: host,
        file: lastFile,
        copied: copiedMain,
        onCopy: () => {
          setCopiedMain(true);
        },
        onAnother: () => {
          setCopiedMain(false);
          go("ready");
        }
      });
      break;
    case "noimage":
      body = /*#__PURE__*/React.createElement(NoImageView, {
        hotkey: DATA.hotkey
      });
      break;
    case "failure":
      shellProps = {};
      body = /*#__PURE__*/React.createElement(HostFailureView, {
        host: host,
        onRetry: startUpload,
        onChooseHost: () => go("hosts"),
        onDetails: () => go("diagnostics")
      });
      break;
    case "nohost":
      shellProps = {};
      body = /*#__PURE__*/React.createElement(NoHostView, {
        hosts: hosts,
        onPick: id => {
          setHostId(id);
          setSelectedId(id);
          startUpload();
        }
      });
      break;
    case "setup":
      shellProps = {
        header: false,
        beak: true
      };
      body = /*#__PURE__*/React.createElement(SetupView, {
        hosts: hosts,
        hostId: setupHost,
        onHost: setSetupHost,
        hotkey: DATA.hotkey,
        onContinue: () => {
          setHostId(setupHost);
          setSelectedId(setupHost);
          setDefaultId(setupHost);
          go("ready");
        },
        onSkip: () => go("ready")
      });
      break;
    case "recent":
      shellProps = {
        onBack: () => go("ready"),
        title: "Recent beams",
        actions: null
      };
      body = /*#__PURE__*/React.createElement(RecentView, {
        recents: DATA.recents,
        hosts: hosts,
        copiedId: copiedId,
        onCopy: r => {
          setCopiedId(r.id);
          setTimeout(() => setCopiedId(c => c === r.id ? null : c), 1400);
        }
      });
      break;
    case "hosts":
      shellProps = {
        onBack: () => go("ready"),
        title: "Hosts",
        actions: null
      };
      body = /*#__PURE__*/React.createElement(HostsView, {
        hosts: hosts,
        selectedId: selectedId,
        onSelect: id => {
          setSelectedId(id);
          setHostId(id);
        },
        onSetDefault: id => setDefaultId(id)
      });
      break;
    case "diagnostics":
      shellProps = {
        onBack: () => go("failure"),
        title: "Diagnostics",
        actions: null
      };
      body = /*#__PURE__*/React.createElement(DiagnosticsView, {
        host: host,
        tab: diagTab,
        onTab: setDiagTab
      });
      break;
    default:
      body = /*#__PURE__*/React.createElement(ReadyView, {
        host: host,
        hotkey: DATA.hotkey,
        onUpload: startUpload,
        onChangeHost: () => go("hosts")
      });
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "hb-desktop"
  }, /*#__PURE__*/React.createElement(MenuBar, {
    onToggle: () => go(view === "ready" ? "recent" : "ready"),
    active: true
  }), /*#__PURE__*/React.createElement("div", {
    className: "hb-pop-anchor"
  }, /*#__PURE__*/React.createElement("div", {
    key: view,
    className: "hb-view-anim"
  }, /*#__PURE__*/React.createElement(PopoverShell, shellProps, body))), /*#__PURE__*/React.createElement(DemoRail, {
    view: view,
    setView: go
  }));
}
function MenuBar({
  active
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "hb-menubar"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      opacity: .9
    }
  }, "Terminal"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      opacity: .7
    }
  }, "Shell"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      opacity: .7
    }
  }, "Edit"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      opacity: .7
    }
  }, "View"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "wifi",
    style: {
      width: 15,
      height: 15,
      opacity: .8
    }
  }), /*#__PURE__*/React.createElement("i", {
    "data-lucide": "battery-full",
    style: {
      width: 17,
      height: 17,
      opacity: .8
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "hb-menubar-app" + (active ? " on" : "")
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/hostbeam-menubar.svg",
    width: "17",
    height: "17",
    alt: "Hostbeam"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      opacity: .85,
      fontVariantNumeric: "tabular-nums",
      whiteSpace: "nowrap"
    }
  }, "Sun 15:30")));
}
const RAIL = [{
  grp: "Core flow",
  items: [["ready", "Ready", "circle-check"], ["noimage", "No image", "image"], ["uploading", "Beaming", "loader"], ["success", "Beamed", "check"], ["failure", "Host failure", "triangle-alert"]]
}, {
  grp: "Hosts & setup",
  items: [["nohost", "No host", "server"], ["hosts", "Host list", "list"], ["setup", "First run", "sparkles"]]
}, {
  grp: "Detail",
  items: [["recent", "Recent", "clock"], ["diagnostics", "Diagnostics", "stethoscope"]]
}];
function DemoRail({
  view,
  setView
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "hb-rail"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hb-rail-title"
  }, "Hostbeam \xB7 states"), RAIL.map(g => /*#__PURE__*/React.createElement("div", {
    key: g.grp,
    className: "hb-rail-grp"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hb-rail-grp-h"
  }, g.grp), g.items.map(([id, label, icon]) => /*#__PURE__*/React.createElement("button", {
    key: id,
    className: "hb-rail-btn" + (view === id ? " on" : ""),
    onClick: () => setView(id)
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": icon
  }), /*#__PURE__*/React.createElement("span", null, label))))));
}
window.HBApp = App;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/hostbeam-app/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/hostbeam-app/data.js
try { (() => {
/* Hostbeam UI kit — mock data.
   Reflects the SAME shared config the prototypes write (localStorage key
   "hostbeam.config.v1") so the kit matches the live product. Falls back to a
   self-contained mock when no config is present (e.g. fresh Design System tab).
   The public API (hosts / hotkey / recents / pathFor / sentenceFor) is stable,
   so the state views consume it unchanged. */
(function () {
  const KEY = "hostbeam.config.v1";
  const TINTS = ["#cdd6e6", "#e3dccf", "#d9e3da", "#e6d3da", "#d3dde6"];

  // Built-in catalog = the config-host pool + the fallback mock.
  const BASE = {
    hosts: [{
      id: "prod",
      name: "prod-box",
      address: "10.4.0.12",
      status: "online",
      isDefault: true,
      folder: "/tmp/hostbeam"
    }, {
      id: "stg",
      name: "staging",
      address: "10.4.0.30",
      status: "pending",
      isDefault: false,
      folder: "/tmp/hostbeam"
    }, {
      id: "dev",
      name: "dev-box",
      address: "10.4.0.88",
      status: "online",
      isDefault: false,
      folder: "/tmp/hostbeam"
    }, {
      id: "edge",
      name: "edge-eu",
      address: "fra1.dev",
      status: "offline",
      isDefault: false,
      folder: "/tmp/hostbeam"
    }],
    hotkey: "cmd shift 7",
    recents: [{
      id: 1,
      file: "hostbeam-2026-06-14-153012.png",
      host: "prod-box",
      when: "just now",
      tint: "#cdd6e6"
    }, {
      id: 2,
      file: "hostbeam-2026-06-14-151847.png",
      host: "prod-box",
      when: "12 min ago",
      tint: "#e3dccf"
    }, {
      id: 3,
      file: "hostbeam-2026-06-14-144503.png",
      host: "staging",
      when: "1 hr ago",
      tint: "#d9e3da"
    }, {
      id: 4,
      file: "hostbeam-2026-06-14-141120.png",
      host: "prod-box",
      when: "2 hr ago",
      tint: "#e6d3da"
    }, {
      id: 5,
      file: "hostbeam-2026-06-13-191002.png",
      host: "dev-box",
      when: "yesterday",
      tint: "#d3dde6"
    }],
    sentence: "Use this screenshot: {path}"
  };
  function baseName(p) {
    const x = String(p || "").split("/");
    return x[x.length - 1] || p;
  }
  function relTime(at) {
    const s = Math.max(0, Math.round((Date.now() - (at || Date.now())) / 1000));
    if (s < 45) return "just now";
    const m = Math.round(s / 60);
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h} hr ago`;
    const d = Math.round(h / 24);
    return d === 1 ? "yesterday" : `${d} days ago`;
  }
  function fromStore() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const cfg = JSON.parse(raw);
      const catalog = {};
      BASE.hosts.forEach(h => {
        catalog[h.id] = h;
      });
      (cfg.manualHosts || []).forEach(h => {
        catalog[h.id] = {
          id: h.id,
          name: h.name,
          address: `${h.user}@${h.address}`,
          status: h.online === false ? "offline" : "online",
          isDefault: false,
          folder: "/tmp/hostbeam",
          manual: true
        };
      });
      const folders = cfg.folders || {};
      const defFolder = cfg.settings && cfg.settings.folder || "/tmp/hostbeam";
      const ids = cfg.addedIds && cfg.addedIds.length ? cfg.addedIds : Object.keys(catalog);
      const hosts = ids.map(id => catalog[id]).filter(Boolean).map(h => ({
        ...h,
        isDefault: h.id === cfg.defaultId,
        folder: folders[h.id] || defFolder
      }));
      if (!hosts.length) return null;
      const hotkey = Array.isArray(cfg.hotkey) ? cfg.hotkey.join(" ") : cfg.hotkey || BASE.hotkey;
      const recents = (cfg.recent || []).map((r, i) => ({
        id: r.id || i,
        file: baseName(r.path),
        host: r.hostName,
        when: relTime(r.at),
        tint: TINTS[i % TINTS.length]
      }));
      const sentence = cfg.settings && cfg.settings.sentence || BASE.sentence;
      return {
        hosts,
        hotkey,
        recents: recents.length ? recents : BASE.recents,
        sentence
      };
    } catch (e) {
      return null;
    }
  }
  const s = fromStore();
  window.HB_DATA = {
    hosts: s ? s.hosts : BASE.hosts,
    hotkey: s ? s.hotkey : BASE.hotkey,
    recents: s ? s.recents : BASE.recents,
    _sentence: s ? s.sentence : BASE.sentence,
    pathFor(host, file) {
      return `${host && host.folder || "/tmp/hostbeam"}/${file}`;
    },
    sentenceFor(host, file) {
      const p = this.pathFor(host, file);
      const t = this._sentence || BASE.sentence;
      return t.includes("{path}") ? t.split("{path}").join(p) : `${t} ${p}`;
    }
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/hostbeam-app/data.js", error: String((e && e.message) || e) }); }

// ui_kits/hostbeam-app/lists.jsx
try { (() => {
/* Hostbeam UI kit — supporting views: no-host, setup, recent, hosts, diagnostics. */
const HBl = window.HostbeamDesignSystem_23dc0f;
const {
  Button,
  Badge,
  StatusDot,
  Keycap,
  Surface,
  ListRow,
  IconButton,
  Switch,
  SegmentedControl,
  HostSelect
} = HBl;

/* No default host yet — just-in-time pick from SSH config, then continue. */
function NoHostView({
  hosts,
  onPick
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 12px 6px",
      display: "flex",
      gap: 9,
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement(window.Medallion, {
    tone: "accent",
    icon: /*#__PURE__*/React.createElement("i", {
      "data-lucide": "server",
      style: {
        width: 20,
        height: 20
      }
    })
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13.5,
      fontWeight: 600,
      color: "var(--label)"
    }
  }, "Pick a host to beam to"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: "var(--label-secondary)",
      marginTop: 2
    }
  }, "From your SSH config. We'll remember it."))), /*#__PURE__*/React.createElement(window.SectionLabel, null, "Hosts"), /*#__PURE__*/React.createElement("div", null, hosts.map(h => /*#__PURE__*/React.createElement(ListRow, {
    key: h.id,
    interactive: true,
    onClick: () => onPick(h.id),
    leading: /*#__PURE__*/React.createElement(StatusDot, {
      status: h.status,
      pulse: h.status === "pending"
    }),
    title: h.name,
    subtitle: h.address,
    monoSub: true,
    trailing: /*#__PURE__*/React.createElement("i", {
      "data-lucide": "chevron-right",
      style: {
        width: 16,
        height: 16,
        color: "var(--label-tertiary)"
      }
    })
  }))));
}

/* First-run setup — lightweight, skippable. */
function SetupView({
  hosts,
  hostId,
  onHost,
  onContinue,
  onSkip,
  hotkey
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "16px 16px 14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      gap: 7,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/hostbeam-icon.svg",
    width: "48",
    height: "48",
    alt: ""
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 17,
      fontWeight: 600,
      color: "var(--label)"
    }
  }, "Welcome to Hostbeam"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--label-secondary)",
      maxWidth: 250
    }
  }, "Beam a clipboard screenshot to a remote host and get a paste-ready path back.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: "var(--label-secondary)",
      marginBottom: 6
    }
  }, "Default host"), /*#__PURE__*/React.createElement(HostSelect, {
    hosts: hosts,
    value: hostId,
    onChange: onHost
  })), /*#__PURE__*/React.createElement(Surface, {
    variant: "card",
    style: {
      padding: "10px 12px",
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "keyboard",
    style: {
      width: 16,
      height: 16,
      color: "var(--label-tertiary)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--label)"
    }
  }, "Global hotkey"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto"
    }
  }, /*#__PURE__*/React.createElement(Keycap, {
    combo: hotkey
  }))), /*#__PURE__*/React.createElement(Switch, {
    defaultChecked: true,
    label: "Launch Hostbeam at login"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "md",
    onClick: onSkip
  }, "Skip for now"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "md",
    block: true,
    onClick: onContinue
  }, "Continue")));
}

/* Recent beams — last five; thumbnail / path / copy. */
function RecentView({
  recents,
  hosts,
  onCopy,
  copiedId
}) {
  const hostByName = n => hosts.find(h => h.name === n) || hosts[0];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(window.SectionLabel, {
    right: /*#__PURE__*/React.createElement("button", {
      style: {
        border: 0,
        background: "transparent",
        color: "var(--accent)",
        fontSize: 11,
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "var(--font-system)"
      }
    }, "Clear")
  }, "Recent uploads"), /*#__PURE__*/React.createElement("div", {
    style: {
      maxHeight: 260,
      overflow: "auto"
    }
  }, recents.map(r => /*#__PURE__*/React.createElement(ListRow, {
    key: r.id,
    leading: /*#__PURE__*/React.createElement(window.Thumb, {
      tint: r.tint,
      size: "md"
    }),
    title: r.file,
    monoTitle: true,
    subtitle: `${r.host} · ${r.when}`,
    trailing: /*#__PURE__*/React.createElement(IconButton, {
      variant: "plain",
      label: "Copy path",
      icon: /*#__PURE__*/React.createElement(window.Ic, {
        name: copiedId === r.id ? "check" : "copy"
      }),
      onClick: () => onCopy(r)
    })
  }))));
}

/* Host list — selected / default behavior. */
function HostsView({
  hosts,
  selectedId,
  onSelect,
  onSetDefault
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(window.SectionLabel, {
    right: /*#__PURE__*/React.createElement("button", {
      style: {
        border: 0,
        background: "transparent",
        color: "var(--accent)",
        fontSize: 11,
        fontWeight: 500,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontFamily: "var(--font-system)"
      }
    }, /*#__PURE__*/React.createElement("i", {
      "data-lucide": "plus",
      style: {
        width: 13,
        height: 13
      }
    }), "Add")
  }, "Hosts"), /*#__PURE__*/React.createElement("div", null, hosts.map(h => /*#__PURE__*/React.createElement(ListRow, {
    key: h.id,
    interactive: true,
    selected: h.id === selectedId,
    onClick: () => onSelect(h.id),
    leading: /*#__PURE__*/React.createElement(StatusDot, {
      status: h.status,
      pulse: h.status === "pending"
    }),
    title: h.name,
    subtitle: h.address,
    monoSub: true,
    trailing: h.isDefault ? /*#__PURE__*/React.createElement(Badge, {
      tone: "accent"
    }, "Default") : h.id === selectedId ? /*#__PURE__*/React.createElement("span", {
      role: "button",
      tabIndex: 0,
      onClick: e => {
        e.stopPropagation();
        onSetDefault(h.id);
      },
      onKeyDown: e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onSetDefault(h.id);
        }
      },
      style: {
        color: "var(--accent)",
        fontSize: 11,
        fontWeight: 500,
        cursor: "pointer"
      }
    }, "Set default") : null
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "8px 12px 12px",
      fontSize: 10.5,
      color: "var(--label-tertiary)",
      display: "flex",
      alignItems: "center",
      gap: 5,
      borderTop: "1px solid var(--separator)"
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "info",
    style: {
      width: 12,
      height: 12
    }
  }), "Hosts come from your ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)"
    }
  }, "~/.ssh/config"), "."));
}

/* Diagnostics — developer-facing connection details. */
function DiagnosticsView({
  host,
  tab,
  onTab
}) {
  const log = ["$ ssh -o BatchMode=yes prod-box 'mkdir -p /tmp/hostbeam'", "debug1: Reading configuration data ~/.ssh/config", "debug1: Authenticating to 10.4.0.12:22 as 'dev'", "debug1: Offering public key via agent: ed25519 SHA256:hT9…2kQ", "debug1: Server accepts key: agent ed25519", "ssh: connect to host 10.4.0.12 port 22: Operation timed out"];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(SegmentedControl, {
    options: ["Summary", "Log"],
    value: tab,
    onChange: onTab
  })), tab === "Summary" ? /*#__PURE__*/React.createElement(Surface, {
    variant: "card",
    style: {
      overflow: "hidden"
    }
  }, [["Host", host.name], ["Address", host.address], ["Remote folder", host.folder], ["Auth", "ssh-agent · ed25519"], ["Last error", "Operation timed out"]].map(([k, v], i) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: "flex",
      alignItems: "center",
      padding: "8px 11px",
      borderTop: i ? "1px solid var(--separator)" : 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11.5,
      color: "var(--label-secondary)",
      width: 96,
      flex: "none"
    }
  }, k), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11.5,
      color: k === "Last error" ? "var(--danger)" : "var(--label)",
      fontFamily: "var(--font-mono)",
      textAlign: "right",
      marginLeft: "auto",
      whiteSpace: "nowrap"
    }
  }, v)))) : /*#__PURE__*/React.createElement(Surface, {
    variant: "well",
    style: {
      padding: "10px 11px"
    }
  }, /*#__PURE__*/React.createElement("pre", {
    style: {
      margin: 0,
      fontFamily: "var(--font-mono)",
      fontSize: 10.5,
      lineHeight: 1.65,
      color: "var(--label-secondary)",
      whiteSpace: "pre-wrap",
      wordBreak: "break-all"
    }
  }, log.map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      color: l.startsWith("ssh:") ? "var(--danger)" : l.startsWith("$") ? "var(--label)" : "var(--label-secondary)"
    }
  }, l)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 7,
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "md",
    block: true,
    icon: /*#__PURE__*/React.createElement("i", {
      "data-lucide": "copy"
    })
  }, "Copy log"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "md",
    block: true,
    icon: /*#__PURE__*/React.createElement("i", {
      "data-lucide": "rotate-cw"
    })
  }, "Retry")));
}
Object.assign(window, {
  NoHostView,
  SetupView,
  RecentView,
  HostsView,
  DiagnosticsView
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/hostbeam-app/lists.jsx", error: String((e && e.message) || e) }); }

// ui_kits/hostbeam-app/shell.jsx
try { (() => {
/* Hostbeam UI kit — shell + small shared pieces. Assigns to window. */
const HB = window.HostbeamDesignSystem_23dc0f;
const {
  Surface,
  IconButton,
  Tooltip
} = HB;

/* macOS popover shell: header (drag region) + body. */
function PopoverShell({
  children,
  onBack,
  actions,
  title = "Hostbeam",
  subtitle,
  beak = true,
  width = 340,
  header = true
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width
    }
  }, beak ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: -7,
      right: 22,
      width: 14,
      height: 14,
      background: "var(--surface-popover)",
      transform: "rotate(45deg)",
      borderRadius: 3,
      boxShadow: "var(--shadow-popover)",
      zIndex: 0
    }
  }) : null, /*#__PURE__*/React.createElement(Surface, {
    variant: "popover",
    style: {
      width,
      position: "relative",
      zIndex: 1
    }
  }, header ? /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "9px 10px 9px 12px",
      borderBottom: "1px solid var(--separator)",
      WebkitAppRegion: "drag"
    }
  }, onBack ? /*#__PURE__*/React.createElement(IconButton, {
    variant: "plain",
    size: "sm",
    label: "Back",
    icon: /*#__PURE__*/React.createElement("i", {
      "data-lucide": "chevron-left"
    }),
    onClick: onBack
  }) : /*#__PURE__*/React.createElement("img", {
    src: "../../assets/hostbeam-mark.svg",
    width: "18",
    height: "18",
    style: {
      ["--accent"]: "var(--accent)"
    },
    alt: ""
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      lineHeight: 1.1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--label)",
      whiteSpace: "nowrap"
    }
  }, title), subtitle ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: "var(--label-tertiary)",
      fontFamily: "var(--font-mono)"
    }
  }, subtitle) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      display: "flex",
      gap: 2
    }
  }, actions)) : null, /*#__PURE__*/React.createElement("div", null, children)));
}

/* Screenshot thumbnail placeholder — neutral, screenshot-ish, never filtered. */
function Thumb({
  tint = "#d4dae4",
  size = "md"
}) {
  const dims = size === "lg" ? {
    w: 52,
    h: 38
  } : size === "sm" ? {
    w: 34,
    h: 24
  } : {
    w: 44,
    h: 30
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: dims.w,
      height: dims.h,
      borderRadius: "var(--radius-sm)",
      flex: "none",
      background: tint,
      boxShadow: "inset 0 0 0 0.5px var(--separator)",
      position: "relative",
      overflow: "hidden",
      display: "inline-block"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 4,
      left: 4,
      display: "flex",
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 3,
      height: 3,
      borderRadius: "50%",
      background: "rgba(0,0,0,.18)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 3,
      height: 3,
      borderRadius: "50%",
      background: "rgba(0,0,0,.12)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 3,
      height: 3,
      borderRadius: "50%",
      background: "rgba(0,0,0,.12)"
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      left: 4,
      right: 4,
      bottom: 4,
      height: dims.h * 0.45,
      borderRadius: 2,
      background: "rgba(0,0,0,.07)"
    }
  }));
}

/* Inline SVG icon — for icons whose name TOGGLES across renders (copy↔check),
   where Lucide's DOM-replacement would otherwise go stale. Static icons use
   <i data-lucide> + lucide.createIcons(). */
function Ic({
  name,
  size = 16,
  stroke = 2,
  style
}) {
  const paths = {
    copy: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      width: "13",
      height: "13",
      x: "9",
      y: "9",
      rx: "2",
      ry: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5 15c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h9c1.1 0 2 .9 2 2"
    })),
    check: /*#__PURE__*/React.createElement("path", {
      d: "M20 6 9 17l-5-5"
    })
  };
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      display: "inline-block",
      verticalAlign: "middle",
      ...style
    }
  }, paths[name] || null);
}

/* Small uppercase section label used above grouped content. */
function SectionLabel({
  children,
  right
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      padding: "10px 12px 4px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: ".05em",
      textTransform: "uppercase",
      color: "var(--label-tertiary)",
      whiteSpace: "nowrap"
    }
  }, children), right ? /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto"
    }
  }, right) : null);
}

/* Big centered icon medallion for empty / error / success states. */
function Medallion({
  icon,
  tone = "neutral"
}) {
  const map = {
    neutral: {
      bg: "var(--fill-secondary)",
      fg: "var(--label-tertiary)"
    },
    accent: {
      bg: "var(--accent-tint)",
      fg: "var(--accent)"
    },
    success: {
      bg: "var(--success-tint)",
      fg: "var(--success)"
    },
    warning: {
      bg: "var(--warning-tint)",
      fg: "var(--warning)"
    },
    danger: {
      bg: "var(--danger-tint)",
      fg: "var(--danger)"
    }
  }[tone];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: 48,
      height: 48,
      borderRadius: "50%",
      background: map.bg,
      color: map.fg,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "none"
    }
  }, icon);
}

/* Animated brand mark (the beam) — mirrors the live product. state:
   "uploading" (slices pulse up), "landing" (node pop + ring once), "idle" (static). */
function BeamMark({
  size = 56,
  state = "uploading"
}) {
  const cls = "bm" + (state === "uploading" ? " bm-uploading" : state === "landing" ? " bm-landing" : "");
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 1024 1024",
    fill: "none",
    className: cls,
    style: {
      filter: "drop-shadow(0 6px 14px rgba(25,48,110,.28))"
    },
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "bm-g",
    x1: "512",
    y1: "64",
    x2: "512",
    y2: "960",
    gradientUnits: "userSpaceOnUse"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#5A95FF"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#2A66EC"
  }))), /*#__PURE__*/React.createElement("rect", {
    width: "1024",
    height: "1024",
    rx: "232",
    fill: "url(#bm-g)"
  }), /*#__PURE__*/React.createElement("rect", {
    width: "1024",
    height: "512",
    rx: "232",
    fill: "#fff",
    opacity: "0.07"
  }), /*#__PURE__*/React.createElement("circle", {
    className: "bm-ring",
    cx: "512",
    cy: "250",
    r: "56",
    fill: "none",
    stroke: "#fff",
    strokeWidth: "16"
  }), /*#__PURE__*/React.createElement("circle", {
    className: "bm-el bm-node",
    cx: "512",
    cy: "250",
    r: "50",
    fill: "#fff",
    style: {
      animationDelay: ".36s"
    }
  }), /*#__PURE__*/React.createElement("path", {
    className: "bm-el",
    d: "M462 362 H562",
    stroke: "#fff",
    strokeWidth: "46",
    strokeLinecap: "round",
    style: {
      animationDelay: ".24s"
    }
  }), /*#__PURE__*/React.createElement("path", {
    className: "bm-el",
    d: "M430 454 H594",
    stroke: "#fff",
    strokeWidth: "46",
    strokeLinecap: "round",
    style: {
      animationDelay: ".12s"
    }
  }), /*#__PURE__*/React.createElement("path", {
    className: "bm-el",
    d: "M392 546 H632",
    stroke: "#fff",
    strokeWidth: "46",
    strokeLinecap: "round",
    style: {
      animationDelay: "0s"
    }
  }), /*#__PURE__*/React.createElement("rect", {
    x: "360",
    y: "616",
    width: "304",
    height: "226",
    rx: "48",
    fill: "#fff"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "404",
    y: "664",
    width: "216",
    height: "130",
    rx: "22",
    fill: "url(#bm-g)",
    opacity: "0.26"
  }));
}
Object.assign(window, {
  PopoverShell,
  Thumb,
  SectionLabel,
  Medallion,
  Ic,
  BeamMark
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/hostbeam-app/shell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/hostbeam-app/states.jsx
try { (() => {
/* Hostbeam UI kit — core flow states (body content inside PopoverShell). */
const HBc = window.HostbeamDesignSystem_23dc0f;
const {
  Button,
  Badge,
  StatusDot,
  Spinner,
  Keycap,
  Surface,
  IconButton
} = HBc;
const PAD = {
  padding: "12px"
};
const center = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center"
};

/* Small clipboard preview line shown above the action. */
function ClipboardPreview({
  tint = "#cdd6e6",
  dims = "2560 × 1440"
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px",
      background: "var(--surface-content)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "inset 0 0 0 0.5px var(--separator)"
    }
  }, /*#__PURE__*/React.createElement(window.Thumb, {
    tint: tint,
    size: "md"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 1,
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 500,
      color: "var(--label)",
      whiteSpace: "nowrap"
    }
  }, "Screenshot on clipboard"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10.5,
      color: "var(--label-tertiary)",
      fontFamily: "var(--font-mono)"
    }
  }, "PNG \xB7 ", dims)), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto"
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "success",
    dot: true
  }, "Ready")));
}

/* Destination footer: host + remote folder, with a Change affordance. */
function DestinationBar({
  host,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "9px 12px",
      borderTop: "1px solid var(--separator)"
    }
  }, /*#__PURE__*/React.createElement(StatusDot, {
    status: host.status,
    pulse: host.status === "pending"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--label)",
      fontWeight: 500,
      whiteSpace: "nowrap"
    }
  }, host.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--label-tertiary)",
      fontFamily: "var(--font-mono)",
      flex: 1,
      minWidth: 0,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, host.folder), /*#__PURE__*/React.createElement("button", {
    onClick: onChange,
    style: {
      marginLeft: "auto",
      border: 0,
      background: "transparent",
      cursor: "pointer",
      color: "var(--accent)",
      fontSize: 12,
      fontWeight: 500,
      fontFamily: "var(--font-system)",
      padding: "2px 4px",
      borderRadius: 4,
      whiteSpace: "nowrap"
    }
  }, "Change"));
}
function ReadyView({
  host,
  onUpload,
  onChangeHost,
  hotkey
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...PAD,
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(ClipboardPreview, null), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    block: true,
    icon: /*#__PURE__*/React.createElement("i", {
      "data-lucide": "upload"
    }),
    onClick: onUpload
  }, "Beam screenshot"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      flexWrap: "nowrap",
      color: "var(--label-tertiary)",
      fontSize: 11
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      whiteSpace: "nowrap"
    }
  }, "or press"), /*#__PURE__*/React.createElement(Keycap, {
    combo: hotkey
  }))), /*#__PURE__*/React.createElement(DestinationBar, {
    host: host,
    onChange: onChangeHost
  }));
}
function UploadingView({
  host
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...PAD,
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(ClipboardPreview, null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 12,
      padding: "4px 0 2px"
    }
  }, /*#__PURE__*/React.createElement(window.BeamMark, {
    size: 56,
    state: "uploading"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 500,
      color: "var(--label)",
      whiteSpace: "nowrap"
    }
  }, "Beaming to ", host.name, "\u2026"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      height: 4,
      borderRadius: 3,
      background: "var(--fill-tertiary)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bm-bar"
  })))));
}
function SuccessView({
  host,
  file,
  onAnother,
  onCopy,
  copied
}) {
  const sentence = window.HB_DATA.sentenceFor(host, file);
  const path = window.HB_DATA.pathFor(host, file);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...PAD,
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...center,
      gap: 10,
      paddingTop: 6
    }
  }, /*#__PURE__*/React.createElement(window.BeamMark, {
    size: 52,
    state: "landing"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      color: "var(--label)"
    }
  }, "Beamed to ", host.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--label-secondary)",
      marginTop: 2
    }
  }, "Paste it into your agent."))), /*#__PURE__*/React.createElement(Surface, {
    variant: "well",
    style: {
      padding: "9px 10px",
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--label)",
      lineHeight: 1.4,
      wordBreak: "break-all",
      flex: 1
    }
  }, sentence), /*#__PURE__*/React.createElement(IconButton, {
    variant: "solid",
    label: "Copy again",
    icon: /*#__PURE__*/React.createElement(window.Ic, {
      name: copied ? "check" : "copy"
    }),
    onClick: onCopy
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "md",
    block: true,
    onClick: onAnother
  }, "Beam another"));
}
function NoImageView({
  hotkey
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...PAD,
      ...center,
      gap: 11,
      padding: "22px 16px 18px"
    }
  }, /*#__PURE__*/React.createElement(window.Medallion, {
    tone: "neutral",
    icon: /*#__PURE__*/React.createElement("i", {
      "data-lucide": "image",
      style: {
        width: 22,
        height: 22
      }
    })
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: "var(--label)"
    }
  }, "No screenshot on the clipboard"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--label-secondary)",
      marginTop: 3,
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      flexWrap: "wrap",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("span", null, "Copy a screenshot, then press"), /*#__PURE__*/React.createElement(Keycap, {
    combo: hotkey
  }))));
}
function HostFailureView({
  host,
  onRetry,
  onChooseHost,
  onDetails
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...PAD,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      paddingTop: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...center,
      gap: 9
    }
  }, /*#__PURE__*/React.createElement(window.Medallion, {
    tone: "danger",
    icon: /*#__PURE__*/React.createElement("i", {
      "data-lucide": "triangle-alert",
      style: {
        width: 22,
        height: 22
      }
    })
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: "var(--label)"
    }
  }, host.name, " didn't answer."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: "var(--label-secondary)",
      marginTop: 3,
      fontFamily: "var(--font-mono)"
    }
  }, "Operation timed out after 10s"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 7
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "md",
    block: true,
    icon: /*#__PURE__*/React.createElement("i", {
      "data-lucide": "rotate-cw"
    }),
    onClick: onRetry
  }, "Try again"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 7
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "md",
    block: true,
    onClick: onChooseHost
  }, "Choose another host"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "md",
    onClick: onDetails
  }, "Details"))));
}
Object.assign(window, {
  ClipboardPreview,
  DestinationBar,
  ReadyView,
  UploadingView,
  SuccessView,
  NoImageView,
  HostFailureView
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/hostbeam-app/states.jsx", error: String((e && e.message) || e) }); }

// walkthrough/animations.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// animations.jsx
// Reusable animation starter: Stage, Timeline, Sprite, easing helpers.
// Exports (to window): Stage, Sprite, PlaybackBar, TextSprite, ImageSprite, RectSprite,
//   useTime, useTimeline, useSprite, Easing, interpolate, animate, clamp.
//
// Usage (in an HTML file that loads React + Babel):
//
//   <Stage width={1280} height={720} duration={10} background="#f6f4ef">
//     <MyScene />
//   </Stage>
//
// <Stage> auto-scales to the viewport and provides the scrubber, play/pause,
// ←/→ seek, space, and 0-to-reset controls, and persists the playhead.
// Inside <Stage>, any child can call useTime() to read the current
// playhead (seconds). Or wrap content in <Sprite start={1} end={4}>...</Sprite>
// to only render during that window -- children receive a `localTime` and
// `progress` via the useSprite() hook. Use Easing + interpolate()/animate()
// for tweens; TextSprite / ImageSprite / RectSprite have built-in entry/exit.
// Build YOUR scenes by composing Sprites inside a Stage.
/* END USAGE */
// ─────────────────────────────────────────────────────────────────────────────

// ── Easing functions (hand-rolled, Popmotion-style) ─────────────────────────
// All easings take t ∈ [0,1] and return eased t ∈ [0,1] (may overshoot for back/elastic).
const Easing = {
  linear: t => t,
  // Quad
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  // Cubic
  easeInCubic: t => t * t * t,
  easeOutCubic: t => --t * t * t + 1,
  easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  // Quart
  easeInQuart: t => t * t * t * t,
  easeOutQuart: t => 1 - --t * t * t * t,
  easeInOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t,
  // Expo
  easeInExpo: t => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeInOutExpo: t => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return 0.5 * Math.pow(2, 20 * t - 10);
    return 1 - 0.5 * Math.pow(2, -20 * t + 10);
  },
  // Sine
  easeInSine: t => 1 - Math.cos(t * Math.PI / 2),
  easeOutSine: t => Math.sin(t * Math.PI / 2),
  easeInOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  // Back (overshoot)
  easeOutBack: t => {
    const c1 = 1.70158,
      c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInBack: t => {
    const c1 = 1.70158,
      c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  easeInOutBack: t => {
    const c1 = 1.70158,
      c2 = c1 * 1.525;
    return t < 0.5 ? Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2) / 2 : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },
  // Elastic
  easeOutElastic: t => {
    const c4 = 2 * Math.PI / 3;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }
};

// ── Core interpolation helpers ──────────────────────────────────────────────

// Clamp a value to [min, max]
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// interpolate([0, 0.5, 1], [0, 100, 50], ease?) -> fn(t)
// Popmotion-style: linearly maps t across input keyframes to output values,
// with optional easing per segment (single fn or array of fns).
function interpolate(input, output, ease = Easing.linear) {
  return t => {
    if (t <= input[0]) return output[0];
    if (t >= input[input.length - 1]) return output[output.length - 1];
    for (let i = 0; i < input.length - 1; i++) {
      if (t >= input[i] && t <= input[i + 1]) {
        const span = input[i + 1] - input[i];
        const local = span === 0 ? 0 : (t - input[i]) / span;
        const easeFn = Array.isArray(ease) ? ease[i] || Easing.linear : ease;
        const eased = easeFn(local);
        return output[i] + (output[i + 1] - output[i]) * eased;
      }
    }
    return output[output.length - 1];
  };
}

// animate({from, to, start, end, ease})(t) — simpler single-segment tween.
// Returns `from` before `start`, `to` after `end`.
function animate({
  from = 0,
  to = 1,
  start = 0,
  end = 1,
  ease = Easing.easeInOutCubic
}) {
  return t => {
    if (t <= start) return from;
    if (t >= end) return to;
    const local = (t - start) / (end - start);
    return from + (to - from) * ease(local);
  };
}

// ── Timeline context ────────────────────────────────────────────────────────

const TimelineContext = React.createContext({
  time: 0,
  duration: 10,
  playing: false
});
const useTime = () => React.useContext(TimelineContext).time;
const useTimeline = () => React.useContext(TimelineContext);

// ── Sprite ──────────────────────────────────────────────────────────────────
// Renders children only when the playhead is inside [start, end]. Provides
// a sub-context with `localTime` (seconds since start) and `progress` (0..1).
//
//   <Sprite start={2} end={5}>
//     {({ localTime, progress }) => <Thing x={progress * 100} />}
//   </Sprite>
//
// Or as a plain wrapper — children can call useSprite() themselves.

const SpriteContext = React.createContext({
  localTime: 0,
  progress: 0,
  duration: 0
});
const useSprite = () => React.useContext(SpriteContext);
function Sprite({
  start = 0,
  end = Infinity,
  children,
  keepMounted = false
}) {
  const {
    time
  } = useTimeline();
  const visible = time >= start && time <= end;
  if (!visible && !keepMounted) return null;
  const duration = end - start;
  const localTime = Math.max(0, time - start);
  const progress = duration > 0 && isFinite(duration) ? clamp(localTime / duration, 0, 1) : 0;
  const value = {
    localTime,
    progress,
    duration,
    visible
  };
  return /*#__PURE__*/React.createElement(SpriteContext.Provider, {
    value: value
  }, typeof children === 'function' ? children(value) : children);
}

// ── Sample sprite components ────────────────────────────────────────────────

// TextSprite: fades/slides text in on entry, holds, then fades out on exit.
// Props: text, x, y, size, color, font, entryDur, exitDur, align
function TextSprite({
  text,
  x = 0,
  y = 0,
  size = 48,
  color = '#111',
  font = 'Inter, system-ui, sans-serif',
  weight = 600,
  entryDur = 0.45,
  exitDur = 0.35,
  entryEase = Easing.easeOutBack,
  exitEase = Easing.easeInCubic,
  align = 'left',
  letterSpacing = '-0.01em'
}) {
  const {
    localTime,
    duration
  } = useSprite();
  const exitStart = Math.max(0, duration - exitDur);
  let opacity = 1;
  let ty = 0;
  if (localTime < entryDur) {
    const t = entryEase(clamp(localTime / entryDur, 0, 1));
    opacity = t;
    ty = (1 - t) * 16;
  } else if (localTime > exitStart) {
    const t = exitEase(clamp((localTime - exitStart) / exitDur, 0, 1));
    opacity = 1 - t;
    ty = -t * 8;
  }
  const translateX = align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: x,
      top: y,
      transform: `translate(${translateX}, ${ty}px)`,
      opacity,
      fontFamily: font,
      fontSize: size,
      fontWeight: weight,
      color,
      letterSpacing,
      whiteSpace: 'pre',
      lineHeight: 1.1,
      willChange: 'transform, opacity'
    }
  }, text);
}

// ImageSprite: scales + fades in; optional Ken Burns drift during hold.
function ImageSprite({
  src,
  x = 0,
  y = 0,
  width = 400,
  height = 300,
  entryDur = 0.6,
  exitDur = 0.4,
  kenBurns = false,
  kenBurnsScale = 1.08,
  radius = 12,
  fit = 'cover',
  placeholder = null // {label: string} for striped placeholder
}) {
  const {
    localTime,
    duration
  } = useSprite();
  const exitStart = Math.max(0, duration - exitDur);
  let opacity = 1;
  let scale = 1;
  if (localTime < entryDur) {
    const t = Easing.easeOutCubic(clamp(localTime / entryDur, 0, 1));
    opacity = t;
    scale = 0.96 + 0.04 * t;
  } else if (localTime > exitStart) {
    const t = Easing.easeInCubic(clamp((localTime - exitStart) / exitDur, 0, 1));
    opacity = 1 - t;
    scale = (kenBurns ? kenBurnsScale : 1) + 0.02 * t;
  } else if (kenBurns) {
    const holdSpan = exitStart - entryDur;
    const holdT = holdSpan > 0 ? (localTime - entryDur) / holdSpan : 0;
    scale = 1 + (kenBurnsScale - 1) * holdT;
  }
  const content = placeholder ? /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'repeating-linear-gradient(135deg, #e9e6df 0 10px, #dcd8cf 10px 20px)',
      color: '#6b6458',
      fontFamily: 'JetBrains Mono, ui-monospace, monospace',
      fontSize: 13,
      letterSpacing: '0.04em',
      textTransform: 'uppercase'
    }
  }, placeholder.label || 'image') : /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: "",
    style: {
      width: '100%',
      height: '100%',
      objectFit: fit,
      display: 'block'
    }
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: x,
      top: y,
      width,
      height,
      opacity,
      transform: `scale(${scale})`,
      transformOrigin: 'center',
      borderRadius: radius,
      overflow: 'hidden',
      willChange: 'transform, opacity'
    }
  }, content);
}

// RectSprite: simple rectangle that animates position/size/color via props.
// Useful demo primitive — takes a `render` fn for per-frame customization.
function RectSprite({
  x = 0,
  y = 0,
  width = 100,
  height = 100,
  color = '#111',
  radius = 8,
  entryDur = 0.4,
  exitDur = 0.3,
  render // optional: (ctx) => style overrides
}) {
  const spriteCtx = useSprite();
  const {
    localTime,
    duration
  } = spriteCtx;
  const exitStart = Math.max(0, duration - exitDur);
  let opacity = 1;
  let scale = 1;
  if (localTime < entryDur) {
    const t = Easing.easeOutBack(clamp(localTime / entryDur, 0, 1));
    opacity = clamp(localTime / entryDur, 0, 1);
    scale = 0.4 + 0.6 * t;
  } else if (localTime > exitStart) {
    const t = Easing.easeInQuad(clamp((localTime - exitStart) / exitDur, 0, 1));
    opacity = 1 - t;
    scale = 1 - 0.15 * t;
  }
  const overrides = render ? render(spriteCtx) : {};
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: x,
      top: y,
      width,
      height,
      background: color,
      borderRadius: radius,
      opacity,
      transform: `scale(${scale})`,
      transformOrigin: 'center',
      willChange: 'transform, opacity',
      ...overrides
    }
  });
}
function Stage({
  width = 1280,
  height = 720,
  duration = 10,
  background = '#f6f4ef',
  fps = 60,
  loop = true,
  autoplay = true,
  persistKey = 'animstage',
  children
}) {
  const [time, setTime] = React.useState(() => {
    try {
      const v = parseFloat(localStorage.getItem(persistKey + ':t') || '0');
      return isFinite(v) ? clamp(v, 0, duration) : 0;
    } catch {
      return 0;
    }
  });
  const [playing, setPlaying] = React.useState(autoplay);
  const [hoverTime, setHoverTime] = React.useState(null);
  const [scale, setScale] = React.useState(1);
  const stageRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const rafRef = React.useRef(null);
  const lastTsRef = React.useRef(null);

  // Persist playhead
  React.useEffect(() => {
    try {
      localStorage.setItem(persistKey + ':t', String(time));
    } catch {}
  }, [time, persistKey]);

  // Auto-scale to fit viewport
  React.useEffect(() => {
    if (!stageRef.current) return;
    const el = stageRef.current;
    const measure = () => {
      const barH = 44; // playback bar height
      const s = Math.min(el.clientWidth / width, (el.clientHeight - barH) / height);
      setScale(Math.max(0.05, s));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [width, height]);

  // Animation loop
  React.useEffect(() => {
    if (!playing) {
      lastTsRef.current = null;
      return;
    }
    const step = ts => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      setTime(t => {
        let next = t + dt;
        if (next >= duration) {
          if (loop) next = next % duration;else {
            next = duration;
            setPlaying(false);
          }
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [playing, duration, loop]);

  // Keyboard: space = play/pause, ← → = seek
  React.useEffect(() => {
    const onKey = e => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setPlaying(p => !p);
      } else if (e.code === 'ArrowLeft') {
        setTime(t => clamp(t - (e.shiftKey ? 1 : 0.1), 0, duration));
      } else if (e.code === 'ArrowRight') {
        setTime(t => clamp(t + (e.shiftKey ? 1 : 0.1), 0, duration));
      } else if (e.key === '0' || e.code === 'Home') {
        setTime(0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [duration]);
  const displayTime = hoverTime != null ? hoverTime : time;
  const ctxValue = React.useMemo(() => ({
    time: displayTime,
    duration,
    playing,
    setTime,
    setPlaying
  }), [displayTime, duration, playing]);
  return /*#__PURE__*/React.createElement("div", {
    ref: stageRef,
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      background: '#0a0a0a',
      fontFamily: 'Inter, system-ui, sans-serif'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: canvasRef,
    style: {
      width,
      height,
      background,
      position: 'relative',
      transform: `scale(${scale})`,
      transformOrigin: 'center',
      flexShrink: 0,
      boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(TimelineContext.Provider, {
    value: ctxValue
  }, children))), /*#__PURE__*/React.createElement(PlaybackBar, {
    time: displayTime,
    actualTime: time,
    duration: duration,
    playing: playing,
    onPlayPause: () => setPlaying(p => !p),
    onReset: () => {
      setTime(0);
    },
    onSeek: t => setTime(t),
    onHover: t => setHoverTime(t)
  }));
}

// ── Playback bar ────────────────────────────────────────────────────────────
// Play/pause, return-to-begin, scrub track, time display.
// Uses fixed-width time fields so layout doesn't thrash.

function PlaybackBar({
  time,
  duration,
  playing,
  onPlayPause,
  onReset,
  onSeek,
  onHover
}) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  const timeFromEvent = React.useCallback(e => {
    const rect = trackRef.current.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    return x * duration;
  }, [duration]);
  const onTrackMove = e => {
    if (!trackRef.current) return;
    const t = timeFromEvent(e);
    if (dragging) {
      onSeek(t);
    } else {
      onHover(t);
    }
  };
  const onTrackLeave = () => {
    if (!dragging) onHover(null);
  };
  const onTrackDown = e => {
    setDragging(true);
    const t = timeFromEvent(e);
    onSeek(t);
    onHover(null);
  };
  React.useEffect(() => {
    if (!dragging) return;
    const onUp = () => setDragging(false);
    const onMove = e => {
      if (!trackRef.current) return;
      const t = timeFromEvent(e);
      onSeek(t);
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
    };
  }, [dragging, timeFromEvent, onSeek]);
  const pct = duration > 0 ? time / duration * 100 : 0;
  const fmt = t => {
    const total = Math.max(0, t);
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    const cs = Math.floor(total * 100 % 100);
    return `${String(m).padStart(1, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  };
  const mono = 'JetBrains Mono, ui-monospace, SFMono-Regular, monospace';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '8px 16px',
      background: 'rgba(20,20,20,0.92)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      width: '100%',
      maxWidth: 680,
      alignSelf: 'center',
      borderRadius: 8,
      color: '#f6f4ef',
      fontFamily: 'Inter, system-ui, sans-serif',
      userSelect: 'none',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    onClick: onReset,
    title: "Return to start (0)"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 14 14",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 2v10M12 2L5 7l7 5V2z",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinejoin: "round",
    strokeLinecap: "round"
  }))), /*#__PURE__*/React.createElement(IconButton, {
    onClick: onPlayPause,
    title: "Play/pause (space)"
  }, playing ? /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 14 14",
    fill: "none"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "2",
    width: "3",
    height: "10",
    fill: "currentColor"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "8",
    y: "2",
    width: "3",
    height: "10",
    fill: "currentColor"
  })) : /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 14 14",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 2l9 5-9 5V2z",
    fill: "currentColor"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: mono,
      fontSize: 12,
      fontVariantNumeric: 'tabular-nums',
      width: 64,
      textAlign: 'right',
      color: '#f6f4ef'
    }
  }, fmt(time)), /*#__PURE__*/React.createElement("div", {
    ref: trackRef,
    onMouseMove: onTrackMove,
    onMouseLeave: onTrackLeave,
    onMouseDown: onTrackDown,
    style: {
      flex: 1,
      height: 22,
      position: 'relative',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 4,
      background: 'rgba(255,255,255,0.12)',
      borderRadius: 2
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      width: `${pct}%`,
      height: 4,
      background: 'oklch(72% 0.12 250)',
      borderRadius: 2
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: `${pct}%`,
      top: '50%',
      width: 12,
      height: 12,
      marginLeft: -6,
      marginTop: -6,
      background: '#fff',
      borderRadius: 6,
      boxShadow: '0 2px 4px rgba(0,0,0,0.4)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: mono,
      fontSize: 12,
      fontVariantNumeric: 'tabular-nums',
      width: 64,
      textAlign: 'left',
      color: 'rgba(246,244,239,0.55)'
    }
  }, fmt(duration)));
}
function IconButton({
  children,
  onClick,
  title
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    title: title,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      width: 28,
      height: 28,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: hover ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 6,
      color: '#f6f4ef',
      cursor: 'pointer',
      padding: 0,
      transition: 'background 120ms'
    }
  }, children);
}
Object.assign(window, {
  Easing,
  interpolate,
  animate,
  clamp,
  TimelineContext,
  useTime,
  useTimeline,
  Sprite,
  SpriteContext,
  useSprite,
  TextSprite,
  ImageSprite,
  RectSprite,
  Stage,
  PlaybackBar
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "walkthrough/animations.jsx", error: String((e && e.message) || e) }); }

// walkthrough/walkthrough.jsx
try { (() => {
/* Hostbeam — product walkthrough (16:9, ~14s, plays once, ends on the paste-ready line).
   Story: a screenshot stuck on your Mac → one hotkey → pick a host → beam → paste the line.
   Reuses window.Ic / BeamMark / ShotThumb (shared.jsx), the DS bundle, and the
   animations.jsx timeline engine. The beam is the only expressive motion; everything
   else is camera + calm state changes. */

const DSW = window.HostbeamDesignSystem_23dc0f;
const {
  Keycap,
  StatusDot,
  Badge
} = DSW;
const WIc = window.Ic;
const WBeamMark = window.BeamMark;
const WShotThumb = window.ShotThumb;
const {
  Stage,
  Sprite,
  useTime,
  Easing,
  interpolate,
  clamp
} = window;
const W = 1280,
  H = 720;
const ACCENT = "#2D6CF6";

/* ----- camera: focus a world point (fx,fy) at scale s, mapped to canvas center ----- */
function camAt(time) {
  const inT = [0, 2.8, 3.5, 5.2, 5.9, 7.7, 8.0, 10.6, 11.3, 14];
  const fx = [470, 470, 800, 800, 1112, 1112, 1112, 1112, 470, 470];
  const fy = [350, 350, 300, 300, 250, 250, 320, 320, 540, 540];
  const sc = [1.04, 1.08, 1.14, 1.14, 1.5, 1.5, 1.54, 1.54, 1.34, 1.34];
  const ease = Easing.easeInOutCubic;
  const x = interpolate(inT, fx, ease)(time);
  const y = interpolate(inT, fy, ease)(time);
  const s = interpolate(inT, sc, ease)(time);
  const tx = W / 2 - x * s,
    ty = H / 2 - y * s;
  return `translate(${tx}px, ${ty}px) scale(${s})`;
}

/* ====================================================================== */
/*  Desktop chrome                                                         */
/* ====================================================================== */
function Wallpaper() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      background: "radial-gradient(130% 110% at 76% 0%, #6E7C99 0%, #41506b 46%, #2b3650 100%)"
    }
  });
}
function MenuBar({
  blip
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 32,
      zIndex: 30,
      display: "flex",
      alignItems: "center",
      gap: 20,
      padding: "0 16px",
      color: "#fff",
      background: "rgba(20,22,28,0.4)",
      backdropFilter: "blur(20px) saturate(160%)",
      WebkitBackdropFilter: "blur(20px) saturate(160%)",
      fontSize: 13.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600
    }
  }, "Coding Agent"), /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: .8
    }
  }, "File"), /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: .8
    }
  }, "Edit"), /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: .8
    }
  }, "View"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      display: "flex",
      alignItems: "center",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "mb-app",
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 26,
      height: 22,
      borderRadius: 6,
      background: blip ? "rgba(45,108,246,0.30)" : "rgba(255,255,255,0.16)",
      boxShadow: blip ? "0 0 0 3px rgba(45,108,246,0.35)" : "none",
      transform: blip ? "scale(1.12)" : "scale(1)",
      transition: "all .25s ease"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../assets/hostbeam-menubar.svg",
    width: "16",
    height: "16",
    alt: ""
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      opacity: .9,
      fontVariantNumeric: "tabular-nums"
    }
  }, "Mon 15:30")));
}

/* ====================================================================== */
/*  Coding-agent window                                                    */
/* ====================================================================== */
function AgentWindow({
  phase
}) {
  // phase: "stuck" (cold open) | "waiting" | "pasted"
  const pasted = phase === "pasted";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 150,
      top: 96,
      width: 620,
      height: 510,
      background: "#fff",
      borderRadius: 14,
      overflow: "hidden",
      boxShadow: "0 30px 80px -20px rgba(10,16,40,0.55), 0 0 0 0.5px rgba(0,0,0,0.2)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 40,
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "0 14px",
      background: "#f4f5f7",
      boxShadow: "inset 0 -0.5px 0 rgba(0,0,0,0.08)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      gap: 7
    }
  }, ["#ff5f57", "#febc2e", "#28c840"].map(c => /*#__PURE__*/React.createElement("span", {
    key: c,
    style: {
      width: 12,
      height: 12,
      borderRadius: "50%",
      background: c
    }
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 10,
      fontSize: 12.5,
      fontWeight: 600,
      color: "#6b7280"
    }
  }, "coding-agent \u2014 ~/project")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px 20px 0",
      display: "flex",
      flexDirection: "column",
      gap: 14,
      height: 388,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement(Bubble, {
    who: "agent"
  }, "Sure \u2014 what does the error screen look like?"), /*#__PURE__*/React.createElement(Bubble, {
    who: "me"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", null, "Here's the screenshot of the crash:"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "9px 11px",
      borderRadius: 10,
      background: pasted ? "rgba(45,108,246,0.08)" : "#f4f5f7",
      boxShadow: pasted ? "inset 0 0 0 1px rgba(45,108,246,0.4)" : "inset 0 0 0 1px rgba(0,0,0,0.06)",
      transition: "all .3s ease"
    }
  }, pasted ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      color: "#1f2937",
      wordBreak: "break-all"
    }
  }, "Use this screenshot: ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: ACCENT,
      fontWeight: 600
    }
  }, "/tmp/hostbeam/2026-06-16-15.12.04.png")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(WShotThumb, {
    w: 42,
    h: 28
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11.5,
      color: "#9aa1ad",
      textDecoration: "line-through"
    }
  }, "~/Desktop/Screenshot.png"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10.5,
      color: "#c2453b",
      fontWeight: 600
    }
  }, "local file \u2014 the agent can't open it")))))), pasted ? /*#__PURE__*/React.createElement(Bubble, {
    who: "agent"
  }, "Got it \u2014 I can see it now. The stack trace points to a null host config\u2026") : null), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 20,
      right: 20,
      bottom: 18,
      height: 46,
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "0 14px",
      borderRadius: 12,
      background: "#fff",
      boxShadow: pasted ? `inset 0 0 0 2px ${ACCENT}` : "inset 0 0 0 1px rgba(0,0,0,0.12)",
      transition: "box-shadow .3s ease"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontFamily: pasted ? "var(--font-mono)" : "var(--font-system)",
      fontSize: pasted ? 12 : 14,
      color: pasted ? "#1f2937" : "#9aa1ad",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, pasted ? "Use this screenshot: /tmp/hostbeam/2026-06-16-15.12.04.png" : "Message the agent…"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 30,
      height: 30,
      borderRadius: 8,
      background: pasted ? ACCENT : "#e5e7eb",
      color: pasted ? "#fff" : "#9aa1ad",
      transition: "all .3s ease"
    }
  }, /*#__PURE__*/React.createElement(WIc, {
    name: "arrow-right",
    size: 16,
    stroke: 2.4
  }))));
}
function Bubble({
  who,
  children
}) {
  const me = who === "me";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: me ? "flex-end" : "flex-start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "78%",
      padding: "10px 13px",
      borderRadius: 14,
      fontSize: 13.5,
      lineHeight: 1.5,
      background: me ? ACCENT : "#f1f2f4",
      color: me ? "#fff" : "#1f2937",
      borderBottomRightRadius: me ? 4 : 14,
      borderBottomLeftRadius: me ? 14 : 4
    }
  }, children));
}

/* ====================================================================== */
/*  Keystroke (hotkey beat)                                                */
/* ====================================================================== */
function Keystroke() {
  const t = useTime();
  // pop in ~3.4, press ~3.9, fade ~5.1
  const appear = interpolate([3.3, 3.6, 5.0, 5.3], [0, 1, 1, 0], Easing.easeOutCubic)(t);
  const press = interpolate([3.7, 3.95, 4.2], [0, 1, 0], Easing.easeOutQuad)(t);
  const y = (1 - appear) * 14 + press * 3;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 800,
      top: 330,
      transform: `translate(-50%,-50%) translateY(${y}px)`,
      opacity: appear,
      display: "flex",
      alignItems: "center",
      gap: 10,
      zIndex: 20,
      padding: "16px 20px",
      borderRadius: 16,
      background: "rgba(20,22,28,0.82)",
      backdropFilter: "blur(10px)",
      boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
      scale: String(1 - press * 0.04)
    }
  }, /*#__PURE__*/React.createElement(Keycap, {
    keys: ["cmd", "shift", "7"],
    size: "lg"
  }));
}

/* ====================================================================== */
/*  Popover                                                                */
/* ====================================================================== */
function Popover() {
  const t = useTime();
  // appears at 5.3 (slides from menu bar), beam phases below
  const inP = interpolate([5.3, 5.7], [0, 1], Easing.easeOutCubic)(t);
  const yOff = (1 - inP) * -16;
  let phase = "idle"; // idle | uploading | landing | done
  if (t >= 9.7) phase = "done";else if (t >= 9.1) phase = "landing";else if (t >= 8.0) phase = "uploading";
  const hostHighlight = t >= 6.4 && t < 8.0;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 962,
      top: 40,
      width: 300,
      opacity: inP,
      transform: `translateY(${yOff}px)`,
      zIndex: 25
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: -7,
      right: 26,
      width: 0,
      height: 0,
      borderLeft: "8px solid transparent",
      borderRight: "8px solid transparent",
      borderBottom: "8px solid #fff",
      zIndex: 2
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      background: "#fff",
      borderRadius: 16,
      boxShadow: "0 24px 60px -12px rgba(10,16,40,0.5), 0 0 0 0.5px rgba(0,0,0,0.12)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      padding: "12px 15px",
      borderBottom: "1px solid #eef0f3"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../assets/hostbeam-mark.svg",
    width: "17",
    height: "17",
    alt: ""
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "#1f2937"
    }
  }, "Hostbeam")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 15,
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "11px 12px",
      borderRadius: 11,
      background: "#f7f8fa",
      boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.07)"
    }
  }, /*#__PURE__*/React.createElement(WShotThumb, {
    w: 42,
    h: 28
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2,
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      fontWeight: 500,
      color: "#1f2937"
    }
  }, "Screenshot on clipboard"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10.5,
      color: "#9aa1ad",
      fontFamily: "var(--font-mono)"
    }
  }, "PNG \xB7 2560 \xD7 1440")), /*#__PURE__*/React.createElement(Badge, {
    tone: phase === "done" || phase === "landing" ? "accent" : "success",
    dot: true
  }, phase === "done" || phase === "landing" ? "Beamed" : "Ready")), phase === "idle" ? /*#__PURE__*/React.createElement("button", {
    style: {
      height: 42,
      borderRadius: 11,
      border: 0,
      cursor: "default",
      background: ACCENT,
      color: "#fff",
      fontSize: 14,
      fontWeight: 600,
      fontFamily: "var(--font-system)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      boxShadow: hostHighlight ? `0 0 0 4px rgba(45,108,246,0.28)` : "0 6px 16px -6px rgba(45,108,246,0.6)",
      transition: "box-shadow .25s ease",
      whiteSpace: "nowrap"
    }
  }, /*#__PURE__*/React.createElement(WIc, {
    name: "upload",
    size: 15,
    stroke: 2.3
  }), " Beam screenshot") : null, phase === "uploading" || phase === "landing" ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 11,
      padding: "6px 0 4px"
    }
  }, /*#__PURE__*/React.createElement(WBeamMark, {
    size: 56,
    state: phase
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 500,
      color: "#1f2937"
    }
  }, phase === "uploading" ? "Beaming to prod-box…" : "Beamed to prod-box")) : null, phase === "done" ? /*#__PURE__*/React.createElement("div", {
    style: {
      background: "rgba(45,108,246,0.08)",
      boxShadow: "inset 0 0 0 1px rgba(45,108,246,0.25)",
      borderRadius: 10,
      padding: "11px 12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement(WIc, {
    name: "clipboard",
    size: 13,
    stroke: 2.1,
    style: {
      color: ACCENT
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10.5,
      fontWeight: 600,
      color: "#6b7280"
    }
  }, "Copied to clipboard")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11.5,
      lineHeight: 1.5,
      color: "#1f2937",
      wordBreak: "break-word"
    }
  }, "Use this screenshot: ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: ACCENT,
      fontWeight: 600
    }
  }, "/tmp/hostbeam/2026-06-16-15.12.04.png"))) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      padding: "8px 11px",
      borderRadius: 10,
      background: "#f7f8fa",
      boxShadow: hostHighlight ? `inset 0 0 0 1.5px ${ACCENT}` : "inset 0 0 0 0.5px rgba(0,0,0,0.07)",
      transition: "box-shadow .25s ease"
    }
  }, /*#__PURE__*/React.createElement(StatusDot, {
    status: "online"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 1,
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      fontWeight: 500,
      color: "#1f2937"
    }
  }, "prod-box"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10.5,
      color: "#9aa1ad",
      fontFamily: "var(--font-mono)"
    }
  }, "dev@10.4.0.12")), /*#__PURE__*/React.createElement(WIc, {
    name: "chevron-down",
    size: 15,
    style: {
      color: "#9aa1ad"
    }
  })))));
}

/* ====================================================================== */
/*  Captions (lower third, outside the camera)                            */
/* ====================================================================== */
const CAPTIONS = [{
  s: 0.4,
  e: 3.0,
  text: "Your screenshot is stuck on your Mac."
}, {
  s: 3.5,
  e: 5.2,
  text: "Press one hotkey."
}, {
  s: 5.9,
  e: 7.7,
  text: "Pick a host."
}, {
  s: 8.1,
  e: 9.6,
  text: "Beam it."
}, {
  s: 11.2,
  e: 14.0,
  text: "Paste the line — now your agent can see it."
}];
function Captions() {
  const t = useTime();
  return /*#__PURE__*/React.createElement(React.Fragment, null, CAPTIONS.map((c, i) => {
    const f = interpolate([c.s, c.s + 0.35, c.e - 0.35, c.e], [0, 1, 1, 0], Easing.easeOutCubic)(t);
    if (f <= 0.001) return null;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 56,
        textAlign: "center",
        opacity: f,
        transform: `translateY(${(1 - f) * 10}px)`,
        zIndex: 60
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-block",
        padding: "11px 22px",
        borderRadius: 999,
        background: "rgba(16,18,24,0.78)",
        backdropFilter: "blur(12px)",
        color: "#fff",
        fontSize: 26,
        fontWeight: 600,
        letterSpacing: "-0.02em",
        fontFamily: "var(--font-system)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        whiteSpace: "nowrap"
      }
    }, c.text));
  }));
}

/* ====================================================================== */
/*  World + Stage                                                          */
/* ====================================================================== */
function World() {
  const t = useTime();
  const blip = t >= 9.6 && t < 10.4; // menu-bar blip when beam lands
  const agentPhase = t >= 11.0 ? "pasted" : "stuck";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      transformOrigin: "0 0",
      transform: camAt(t)
    }
  }, /*#__PURE__*/React.createElement(Wallpaper, null), /*#__PURE__*/React.createElement(AgentWindow, {
    phase: agentPhase
  }), /*#__PURE__*/React.createElement(MenuBar, {
    blip: blip
  }), /*#__PURE__*/React.createElement(Sprite, {
    start: 3.3,
    end: 5.3
  }, /*#__PURE__*/React.createElement(Keystroke, null)), /*#__PURE__*/React.createElement(Sprite, {
    start: 5.3,
    end: 14
  }, /*#__PURE__*/React.createElement(Popover, null)));
}
function ScreenLabel() {
  // update data-screen-label each second for review/commenting
  const t = useTime();
  React.useEffect(() => {
    const root = document.getElementById("vid-root");
    if (root) root.setAttribute("data-screen-label", "t=" + Math.floor(t) + "s");
  }, [Math.floor(t)]);
  return null;
}
function Expose() {
  const {
    setTime,
    setPlaying
  } = window.useTimeline();
  React.useEffect(() => {
    window.__seek = t => {
      setPlaying(false);
      setTime(t);
    };
  }, []);
  return null;
}
function App() {
  return /*#__PURE__*/React.createElement("div", {
    id: "vid-root",
    "data-screen-label": "t=0s",
    style: {
      position: "absolute",
      inset: 0
    }
  }, /*#__PURE__*/React.createElement(Stage, {
    width: W,
    height: H,
    duration: 14,
    background: "#0a0a0a",
    loop: false,
    persistKey: "hb-walkthrough"
  }, /*#__PURE__*/React.createElement(World, null), /*#__PURE__*/React.createElement(Captions, null), /*#__PURE__*/React.createElement(ScreenLabel, null), /*#__PURE__*/React.createElement(Expose, null)));
}
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
})(); } catch (e) { __ds_ns.__errors.push({ path: "walkthrough/walkthrough.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Spinner = __ds_scope.Spinner;

__ds_ns.StatusDot = __ds_scope.StatusDot;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Field = __ds_scope.Field;

__ds_ns.HostSelect = __ds_scope.HostSelect;

__ds_ns.SegmentedControl = __ds_scope.SegmentedControl;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Keycap = __ds_scope.Keycap;

__ds_ns.ListRow = __ds_scope.ListRow;

__ds_ns.Surface = __ds_scope.Surface;

})();

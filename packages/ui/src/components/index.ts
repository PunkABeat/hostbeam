// The design-system component library — the barrel both apps import from
// (e.g. `import { Button, Ic } from "@hostbeam/ui"`).
export { Button } from "./actions/Button";
export { IconButton } from "./actions/IconButton";
export { Badge } from "./feedback/Badge";
export { Spinner } from "./feedback/Spinner";
export { StatusDot } from "./feedback/StatusDot";
export { Tooltip } from "./feedback/Tooltip";
export { Field } from "./forms/Field";
export { HostSelect } from "./forms/HostSelect";
export { SegmentedControl } from "./forms/SegmentedControl";
export { Switch } from "./forms/Switch";
export { Keycap } from "./surfaces/Keycap";
export { ListRow } from "./surfaces/ListRow";
export { Surface } from "./surfaces/Surface";
export { Ic } from "./Icon";
export type { IcProps } from "./Icon";
export { BeamMark } from "./BeamMark";
export type { BeamMarkProps } from "./BeamMark";
export { QrCode, qrIconLayout } from "./surfaces/QrCode";
export type { QrCodeProps } from "./surfaces/QrCode";
export { ShotThumb } from "./ShotThumb";
export type { ShotThumbProps } from "./ShotThumb";
export { FileThumb } from "./FileThumb";
export type { FileThumbProps } from "./FileThumb";

// Every component below styles itself by injecting a <style> on first render.
// That is fine in the Mac app, which renders only on the client, but a
// server-rendered page ships the class names in its HTML and paints before any
// island hydrates — so the controls flash as bare browser defaults. `componentCss`
// is the same CSS, as a string a page can put in <head> at build time
// (apps/web/src/layouts/Base.astro does). Add new self-styling components here.
import { buttonCss } from "./actions/Button";
import { iconButtonCss } from "./actions/IconButton";
import { badgeCss } from "./feedback/Badge";
import { spinnerCss } from "./feedback/Spinner";
import { statusDotCss } from "./feedback/StatusDot";
import { tooltipCss } from "./feedback/Tooltip";
import { fieldCss } from "./forms/Field";
import { hostSelectCss } from "./forms/HostSelect";
import { segmentedControlCss } from "./forms/SegmentedControl";
import { switchCss } from "./forms/Switch";
import { keycapCss } from "./surfaces/Keycap";
import { listRowCss } from "./surfaces/ListRow";
import { surfaceCss } from "./surfaces/Surface";

export const componentCss = [
  buttonCss,
  iconButtonCss,
  badgeCss,
  spinnerCss,
  statusDotCss,
  tooltipCss,
  fieldCss,
  hostSelectCss,
  segmentedControlCss,
  switchCss,
  keycapCss,
  listRowCss,
  surfaceCss,
].join("\n");

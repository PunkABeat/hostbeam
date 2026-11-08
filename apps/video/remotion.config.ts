// The film imports the site's real components from packages/ui, which lives
// outside this project (apps/video is not an npm workspace, like apps/raycast).
// Two aliases make that work: @hostbeam/ui points at the source, and React
// resolves to this project's copy only — two Reacts in one bundle break hooks.
import path from "node:path";
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: {
      ...(config.resolve?.alias ?? {}),
      "@hostbeam/ui": path.resolve(process.cwd(), "../../packages/ui/src/components/index.ts"),
      "@hostbeam/ui-styles": path.resolve(process.cwd(), "../../packages/ui/src/styles.css"),
      react: path.resolve(process.cwd(), "node_modules/react"),
      "react-dom": path.resolve(process.cwd(), "node_modules/react-dom"),
      "qrcode-generator": path.resolve(process.cwd(), "../../node_modules/qrcode-generator"),
    },
  },
}));

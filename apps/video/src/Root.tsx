import { Composition } from "remotion";
import { FPS, HEIGHT, WIDTH } from "./lib";
import { Launch, type LaunchProps, launchLength } from "./Launch";

const metadata = ({ props }: { props: LaunchProps }) => ({ durationInFrames: launchLength(props.pace) });

export function Root() {
  return (
    <>
      {/* The full film, for YouTube, Product Hunt and the site (~44 s). */}
      <Composition
        id="HostbeamLaunch"
        component={Launch}
        durationInFrames={launchLength(0.82)}
        calculateMetadata={metadata}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ pace: 0.82, grain: false, sound: true } satisfies LaunchProps}
      />
      {/* The same film, quicker, for X (~36 s). */}
      <Composition
        id="HostbeamX"
        component={Launch}
        durationInFrames={launchLength(0.68)}
        calculateMetadata={metadata}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ pace: 0.68, grain: false, sound: true } satisfies LaunchProps}
      />
    </>
  );
}

import { Globe } from "@mtt/ui/components/ui/globe";
import { type ReactElement, useMemo } from "react";
import { landingGlobeNodes } from "./mesh";
import { useTheme } from "@/hooks/use-theme";

const coral: [number, number, number] = [255 / 255, 73 / 255, 95 / 255];
const inkLight: [number, number, number] = [0.96, 0.96, 0.96];
const inkDark: [number, number, number] = [0.13, 0.13, 0.14];
const glowLight: [number, number, number] = [1, 1, 1];

export function LandingCobe(): ReactElement {
  const theme = useTheme();
  const dark = theme === "dark";

  const config = useMemo(() => {
    const ink = dark ? inkDark : inkLight;
    const glow = dark ? inkDark : glowLight;
    return {
      width: 800,
      height: 800,
      onRender: () => {},
      devicePixelRatio: 2,
      phi: 5.85,
      theta: 0.42,
      dark: dark ? 1 : 0,
      diffuse: 0.4,
      mapSamples: 16000,
      mapBrightness: dark ? 6 : 1.4,
      baseColor: ink,
      markerColor: coral,
      glowColor: glow,
      markers: landingGlobeNodes.map((node) => ({
        location: [node.lat, node.lng] as [number, number],
        size: node.gateway ? 0.1 : 0.04,
      })),
    };
  }, [dark]);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[42%] overflow-hidden" aria-hidden>
      <div
        className="absolute aspect-square w-[min(120vw,52rem)]"
        style={{
          left: "50%",
          bottom: 0,
          transform: "translateX(-50%) translateY(28%)",
          transformOrigin: "bottom center",
        }}
      >
        <Globe className="relative inset-auto size-full max-w-none!" config={config} />
      </div>
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background-full to-transparent" />
    </div>
  );
}

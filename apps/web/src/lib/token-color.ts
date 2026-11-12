/** The tokens the map and charts paint with. */
export type PaintToken = "--oa-primary" | "--color-gateway" | "--color-route-selected" | "--color-text-white";

/**
 * A colour token as `rgb(...)`. MapLibre and canvas charts need concrete colours and may not parse
 * every CSS colour space a token can hold (Tailwind's are oklch), so the colour is
 * painted on a one-pixel canvas and read back.
 */
export function tokenColor(token: PaintToken): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!context) return resolved;
  context.fillStyle = resolved;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * A colour token as `rgb(...)`. MapLibre and canvas charts need concrete colours and may not parse
 * every CSS colour space a token can hold (Tailwind's are oklch), so the colour is
 * painted on a one-pixel canvas and read back.
 */
export function tokenColor(token: string, fallback: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${token}, ${fallback})`;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!context) return fallback;
  context.fillStyle = resolved;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return `rgb(${r}, ${g}, ${b})`;
}

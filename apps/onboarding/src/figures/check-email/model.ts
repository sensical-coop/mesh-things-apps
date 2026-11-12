import { RESEND_COOLDOWN_SECONDS } from "@mtt/contracts/resend-cooldown";
import { span } from "../view";

export const COOLDOWN_SECONDS = RESEND_COOLDOWN_SECONDS;

export const TOUR_SECONDS = 12.4;

export type Scene = {
  drop: number;
  flag: number;
  seconds: number;
  door: number;
  taken: number;
  lamp: number;
};

export function sceneAt(unit: number): Scene {
  const sweep = span(unit, 0.3, 0.62);
  return {
    drop: span(unit, 0.06, 0.18),
    flag: span(unit, 0.18, 0.3),
    seconds: COOLDOWN_SECONDS * (1 - sweep),
    door: span(unit, 0.62, 0.74),
    taken: span(unit, 0.74, 0.88),
    lamp: span(unit, 0.86, 0.96),
  };
}

export type Phase = "waiting" | "sent" | "confirmed";

export function phaseOf(scene: Scene): Phase {
  if (scene.lamp > 0.5) return "confirmed";
  if (scene.flag > 0.5) return "sent";
  return "waiting";
}

export function secondsLeft(scene: Scene): number {
  return Math.max(0, Math.ceil(scene.seconds - 1e-6));
}

export function tourUnit(clock: number): number {
  const at = clock % TOUR_SECONDS;
  if (at < 0.7) return 0;
  if (at > TOUR_SECONDS - 0.9) return 1;
  return (at - 0.7) / (TOUR_SECONDS - 1.6);
}

const start = sceneAt(0);
const end = sceneAt(1);
if (start.seconds !== COOLDOWN_SECONDS || start.flag !== 0 || start.lamp !== 0) throw new Error("check-email rest");
if (end.seconds !== 0 || end.lamp < 1 || end.door < 1 || end.taken < 1) throw new Error("check-email end");

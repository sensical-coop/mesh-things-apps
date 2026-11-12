import { HOP, KNOB_R, KNOB_TRAVEL, PILL } from "./geometry";

/** Knob translate inside its row group. `t` is 0 off (left) .. 1 on (right). */
export function knobShift(_index: number, t: number): string {
  const x = PILL.x + KNOB_R + 0.8 + t * KNOB_TRAVEL;
  return `translate(${x.toFixed(2)} 0)`;
}

export function packetShift(along: number): string {
  const home = HOP.at(0);
  const at = HOP.at(along);
  return `translate(${(at[0] - home[0]).toFixed(2)} ${(at[1] - home[1]).toFixed(2)})`;
}

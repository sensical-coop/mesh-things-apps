/** Connect step: MQTT, uplink and encryption must all be on before a packet counts as seen. The page polls every 5s (`connect-step.tsx`). Port is whatever the broker returns; this figure does not invent one. */

export const POLL_MS = 5000;

export const SWITCHES = ["mqtt", "uplink", "encryption"] as const;
export type SwitchName = (typeof SWITCHES)[number];

export interface Gate {
  mqtt: boolean;
  uplink: boolean;
  encryption: boolean;
}

export const REST_GATE: Gate = { mqtt: false, uplink: false, encryption: false };

export function gateSeen(gate: Gate): boolean {
  return gate.mqtt && gate.uplink && gate.encryption;
}

export function switchesOn(gate: Gate): number {
  return Number(gate.mqtt) + Number(gate.uplink) + Number(gate.encryption);
}

export function withSwitch(gate: Gate, name: SwitchName, on: boolean): Gate {
  return { mqtt: gate.mqtt, uplink: gate.uplink, encryption: gate.encryption, [name]: on };
}

export interface ReadoutWords {
  mqtt: string;
  uplink: string;
  encryption: string;
  on: string;
  off: string;
  of: string;
  waiting: string;
  seen: string;
}

/** Plate corner. Longest en "3 of 3 on · waiting" (20), es "3 de 3 activos · espera" (23). */
export function readoutOf(on: number, arrived: boolean, words: ReadoutWords): string {
  return `${on} ${words.of} · ${arrived ? words.seen : words.waiting}`;
}

/** Spoken per-switch state. Not the plate readout. */
export function valueText(gate: Gate, arrived: boolean, words: ReadoutWords): string {
  const bit = (name: SwitchName) => `${words[name]} ${gate[name] ? words.on : words.off}`;
  return `${bit("mqtt")}, ${bit("uplink")}, ${bit("encryption")}, ${arrived ? words.seen : words.waiting}`;
}

/** Idle tour, seconds. Switches close one by one, then open again. */
export function tourGate(time: number): Gate {
  const at = time % 8.4;
  return {
    mqtt: at >= 0.9 && at < 7.3,
    uplink: at >= 2.15 && at < 7.3,
    encryption: at >= 3.4 && at < 7.3,
  };
}

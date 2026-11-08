import { type KeyboardEvent, type ReactNode, useEffect, useRef } from "react";
import { IsoFigure } from "@/iso/react/draw";
import { asksForStillness, follow, useInView, useLoop, useReadout } from "@/iso/react/live";
import { FIGURE_HEIGHT, FIGURE_WIDTH } from "../view";
import { KNOB_R, PILL, ROW_Y, SCREEN_AT, TOGGLE_OFF, TOGGLE_ON } from "./geometry";
import { REST_GATE, SWITCHES, gateSeen, readoutOf, switchesOn, tourGate, valueText, withSwitch, type Gate, type ReadoutWords } from "./model";
import { knobShift, packetShift } from "./pose";

export interface ConnectCopy extends ReadoutWords {
  aria: string;
}

const TRAVEL = 1.45;
const GAP = 0.35;

function shownGate(angles: readonly number[]): Gate {
  const mid = (TOGGLE_OFF + TOGGLE_ON) / 2;
  return {
    mqtt: (angles[0] ?? TOGGLE_OFF) > mid,
    uplink: (angles[1] ?? TOGGLE_OFF) > mid,
    encryption: (angles[2] ?? TOGGLE_OFF) > mid,
  };
}

export function ConnectLive({
  copy,
  label,
  bench,
  radio,
  phone,
  ble,
  broker,
  lens,
  wifi,
  packet,
}: {
  copy: ConnectCopy;
  label: string;
  bench: ReactNode;
  radio: ReactNode;
  phone: ReactNode;
  ble: ReactNode;
  broker: ReactNode;
  lens: ReactNode;
  wifi: ReactNode;
  packet: ReactNode;
}) {
  const { anchor, say } = useReadout<HTMLDivElement>();
  const visible = useInView(anchor);
  const flow = useRef<SVGGElement>(null);
  const lamp = useRef<SVGGElement>(null);
  const bead = useRef<SVGGElement>(null);
  const handles = [useRef<SVGGElement>(null), useRef<SVGGElement>(null), useRef<SVGGElement>(null)];
  const gate = useRef<Gate>({ ...REST_GATE });
  const angles = useRef<[number, number, number]>([TOGGLE_OFF, TOGGLE_OFF, TOGGLE_OFF]);
  const pulse = useRef(0);
  const latched = useRef(false);
  const clock = useRef(0);
  const wait = useRef(0);
  const idle = useRef(0);
  const engaged = useRef(false);
  const cursor = useRef(0);
  const spoken = useRef("");
  const resume = useRef(0);

  const kick = useLoop((dt, calm) => {
    if (!engaged.current) {
      wait.current += dt;
      if (wait.current > 1.4 && !calm) clock.current += dt;
    } else {
      idle.current += dt;
      if (idle.current > 3.6) engaged.current = false;
    }
    const touring = !engaged.current && !calm && wait.current > 1.4;
    if (touring) gate.current = tourGate(clock.current);
    let settled = !touring;
    for (let index = 0; index < SWITCHES.length; index += 1) {
      const name = SWITCHES[index];
      if (!name) continue;
      const target = gate.current[name] ? TOGGLE_ON : TOGGLE_OFF;
      const next = follow(angles.current[index] ?? target, target, dt, 0.16, calm);
      angles.current[index] = next;
      if (next !== target) settled = false;
      handles[index]?.current?.setAttribute("transform", knobShift(index, next));
      const track = anchor.current?.querySelector(`[data-track="${index}"]`);
      if (track) {
        if (next > (TOGGLE_OFF + TOGGLE_ON) / 2) track.setAttribute("data-lit", "");
        else track.removeAttribute("data-lit");
      }
    }
    const shown = shownGate(angles.current);
    const all = gateSeen(shown);
    if (!all) {
      pulse.current = 0;
      latched.current = false;
    } else if (!calm) {
      pulse.current += dt / TRAVEL;
      if (pulse.current >= 1) latched.current = true;
      if (pulse.current > 1 + GAP) pulse.current = 0;
    }
    const moving = all && !calm && pulse.current <= 1;
    const arrived = all && (calm || latched.current);
    if (bead.current) {
      bead.current.setAttribute("transform", packetShift(Math.min(pulse.current, 1)));
      bead.current.style.opacity = moving ? "1" : "0";
    }
    if (flow.current) flow.current.style.opacity = all ? "1" : "0";
    const lensNode = lamp.current?.querySelector(".iso-solid");
    const glow = lamp.current?.querySelector(".lamp-glow");
    if (lensNode) {
      if (arrived) lensNode.setAttribute("data-lit", "");
      else lensNode.removeAttribute("data-lit");
    }
    if (glow instanceof SVGElement) glow.style.opacity = arrived ? "1" : "0";
    const text = readoutOf(switchesOn(shown), arrived, copy);
    if (text !== spoken.current) {
      spoken.current = text;
      say(text);
      anchor.current?.setAttribute("aria-valuetext", valueText(shown, arrived, copy));
      anchor.current?.setAttribute("aria-valuenow", String(switchesOn(shown)));
    }
    if (all && !calm) settled = false;
    return !settled;
  }, visible);

  useEffect(() => {
    if (!visible || asksForStillness()) return;
    const id = window.setTimeout(() => {
      if (!engaged.current) {
        wait.current = 1.5;
        kick();
      }
    }, 1400);
    return () => window.clearTimeout(id);
  }, [visible, kick]);

  function claim() {
    engaged.current = true;
    idle.current = 0;
    wait.current = 0;
    window.clearTimeout(resume.current);
    resume.current = window.setTimeout(() => {
      engaged.current = false;
      wait.current = 1.5;
      clock.current = 0;
      kick();
    }, 3600);
  }

  function setGate(next: Gate) {
    claim();
    gate.current = next;
    kick();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const key = event.key;
    if (key === "ArrowRight" || key === "ArrowLeft") {
      event.preventDefault();
      cursor.current = (cursor.current + (key === "ArrowRight" ? 1 : -1) + SWITCHES.length) % SWITCHES.length;
      return;
    }
    const name = SWITCHES[cursor.current];
    if (!name) return;
    if (key === "ArrowUp" || key === "ArrowDown" || key === " " || key === "Enter") {
      event.preventDefault();
      const on = key === "ArrowDown" ? false : key === "ArrowUp" ? true : !gate.current[name];
      setGate(withSwitch(gate.current, name, on));
      return;
    }
    if (key === "Home" || key === "End") {
      event.preventDefault();
      const on = key === "End";
      setGate({ mqtt: on, uplink: on, encryption: on });
    }
  }

  const rest = valueText(REST_GATE, false, copy);

  return (
    <div
      ref={anchor}
      className="connect-fig"
      tabIndex={0}
      role="slider"
      aria-label={copy.aria}
      aria-valuemin={0}
      aria-valuemax={3}
      aria-valuenow={0}
      aria-valuetext={rest}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => {
        if (!(event.target instanceof Element)) return;
        const hit = event.target.closest("[data-switch]")?.getAttribute("data-switch");
        if (hit !== "0" && hit !== "1" && hit !== "2") return;
        const index = Number(hit);
        const picked = SWITCHES[index];
        if (!picked) return;
        cursor.current = index;
        setGate(withSwitch(gate.current, picked, !gate.current[picked]));
      }}
    >
      <IsoFigure width={FIGURE_WIDTH} height={FIGURE_HEIGHT} label={label}>
        {bench}
        {radio}
        {phone}
        <g transform={SCREEN_AT}>
          {[copy.mqtt, copy.uplink, copy.encryption].map((name, index) => {
            const y = ROW_Y[index] ?? 0;
            return (
              <g key={name} transform={`translate(0 ${y})`}>
                <text className="iso-face-text" data-tone="hi" x={1.6} y={1.4} fontSize={4.4}>
                  {name}
                </text>
                <rect
                  data-track={index}
                  className="pill"
                  x={PILL.x}
                  y={-PILL.h / 2}
                  width={PILL.w}
                  height={PILL.h}
                  rx={PILL.h / 2}
                />
                <rect className="iso-hit" data-switch={index} x={0} y={-5} width={PILL.x + PILL.w + 1} height={10} />
                <g ref={handles[index]} data-switch={index} transform={knobShift(index, TOGGLE_OFF)}>
                  <circle className="pill-knob" r={KNOB_R} />
                </g>
              </g>
            );
          })}
        </g>
        {ble}
        {broker}
        <g ref={lamp}>{lens}</g>
        <g ref={flow} style={{ opacity: 0 }}>
          {wifi}
        </g>
        <g ref={bead} style={{ opacity: 0 }}>
          {packet}
        </g>
      </IsoFigure>
    </div>
  );
}

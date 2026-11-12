import { useRef } from "react";
import { useIntl } from "react-intl";
import { IsoFigure, Line } from "@/iso/react/draw";
import { follow, useInView, useLoop, useReadout } from "@/iso/react/live";
import { BENCH } from "./art";
import { DIAL_R, FACE, HEIGHT, LAMP_AT, TICKS, TRIP_TICK, WATCH_HOP, WIDTH, needleLocal } from "./geometry";
import { INTERVAL, MISSED_TO_TRIP, TRIP, benchOf, seenSeconds, tourAge } from "./model";

const HOLD_STEP = INTERVAL * 0.35;

export function DoneLive() {
  const { formatMessage } = useIntl();
  const { anchor, say } = useReadout<HTMLDivElement>();
  const needle = useRef<SVGPathElement>(null);
  const flag = useRef<SVGGElement>(null);
  const lamp = useRef<SVGGElement>(null);
  const packet = useRef<SVGCircleElement>(null);
  const state = useRef({ age: 2, shown: 2, clock: 0, idle: 0, touching: false });
  const visible = useInView(anchor);

  const label = formatMessage({
    id: "figure.done.stage",
    defaultMessage: "Three nodes, a gateway on a mast, and a watchdog dial. Hold to pause packets.",
  });
  const emailWord = formatMessage({ id: "figure.done.email", defaultMessage: "email" });
  const armedWord = formatMessage({ id: "figure.done.armed", defaultMessage: "armed" });

  function describe(shown: number, touching: boolean) {
    const bench = benchOf(shown, touching);
    const watchdog = bench.trip ? emailWord : armedWord;
    const text = touching
      ? formatMessage({ id: "figure.done.heldReadout", defaultMessage: "Held · {watchdog}" }, { watchdog })
      : formatMessage(
          { id: "figure.done.readout", defaultMessage: "Seen {seconds} s ago · {watchdog}" },
          { seconds: seenSeconds(shown), watchdog },
        );
    say(text);
    const node = anchor.current;
    if (node && node.getAttribute("aria-valuetext") !== text) {
      node.setAttribute("aria-valuetext", text);
      node.setAttribute("aria-valuenow", String(Math.min(MISSED_TO_TRIP, Math.round((shown / INTERVAL) * 10) / 10)));
    }
  }

  const kick = useLoop((dt, calm) => {
    const s = state.current;
    if (!s.touching) {
      s.idle += dt;
      if (s.idle > 1.2) {
        if (!calm) s.clock += dt;
        s.age = tourAge(s.clock);
      }
    } else s.age = Math.min(TRIP, s.age + dt);
    s.shown = follow(s.shown, s.age, dt, 0.16, calm);
    const bench = benchOf(s.shown, s.touching);
    needle.current?.setAttribute("d", needleLocal(Math.min(s.shown / TRIP, 1)));
    flag.current?.setAttribute("transform", `rotate(${bench.trip ? 55 : -70})`);
    lamp.current?.toggleAttribute("data-seen", s.shown < INTERVAL);
    const flying = !calm && !s.touching && s.shown < 0.7;
    if (packet.current) {
      const along = flying ? 1 - s.shown / 0.7 : 0;
      packet.current.setAttribute("opacity", flying ? "1" : "0");
      const at = WATCH_HOP.at(along);
      packet.current.setAttribute("cx", String(at[0]));
      packet.current.setAttribute("cy", String(at[1]));
    }
    describe(s.shown, s.touching);
    const touring = !s.touching && s.idle > 1.2;
    return touring || s.touching || Math.abs(s.shown - s.age) > 0.04;
  }, visible);

  function touch(on: boolean) {
    state.current.touching = on;
    state.current.idle = 0;
    kick();
  }

  function nudge(by: number) {
    const s = state.current;
    s.touching = true;
    s.idle = 0;
    s.age = Math.max(0, Math.min(TRIP, s.age + by));
    kick();
  }

  return (
    <div
      ref={anchor}
      className="done-stage"
      tabIndex={0}
      role="slider"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={MISSED_TO_TRIP}
      aria-valuenow={0}
      aria-valuetext={formatMessage(
        { id: "figure.done.readout", defaultMessage: "Seen {seconds} s ago · {watchdog}" },
        { seconds: seenSeconds(2), watchdog: armedWord },
      )}
      onPointerEnter={() => touch(true)}
      onPointerDown={() => touch(true)}
      onPointerUp={() => touch(false)}
      onPointerLeave={() => touch(false)}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowUp") nudge(HOLD_STEP);
        if (event.key === "ArrowLeft" || event.key === "ArrowDown") nudge(-HOLD_STEP);
        if (event.key === "Home") nudge(-TRIP);
        if (event.key === "End") nudge(TRIP);
        if (event.key === " " || event.key === "Enter") touch(true);
        if (event.key === "Escape") touch(false);
      }}
      onKeyUp={(event) => {
        if (event.key === " " || event.key === "Enter") touch(false);
      }}
      onBlur={() => touch(false)}
    >
      <IsoFigure width={WIDTH} height={HEIGHT} label={label}>
        {BENCH}
        <g transform={FACE}>
          <circle r={DIAL_R} className="done-face" />
          <circle r="18.2" className="iso-line done-bezel" data-tone="mid" />
          <circle r="16.4" className="done-glass" />
          <Line d={TICKS.minor} tone="faint" />
          <Line d={TICKS.major} tone="lo" />
          <Line d={TRIP_TICK} tone="red" />
          <circle r="2.3" className="iso-line" data-tone="hi" />
          <path ref={needle} className="iso-line" data-tone="lit" data-free="end" d={needleLocal(2 / TRIP)} />
          <g transform="translate(18.2 0)">
            <circle r="2.2" className="done-pin" />
            <g ref={flag}>
              <path className="done-flag" d="M1.4 -1.8 H13.5 L15.2 0 L13.5 1.8 H1.4 Z" />
            </g>
          </g>
        </g>
        <g ref={lamp} className="done-lamp" data-seen="" transform={`translate(${LAMP_AT[0]} ${LAMP_AT[1]})`}>
          <circle r="2.4" />
        </g>
        <circle ref={packet} className="done-packet" r="2.6" cx={WATCH_HOP.at(0)[0]} cy={WATCH_HOP.at(0)[1]} opacity="0" />
      </IsoFigure>
    </div>
  );
}

import { type KeyboardEvent, type PointerEvent, type ReactNode, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { FaceText, IsoFigure } from "@/iso/react/draw";
import { follow, spring, useInView, useLoop, useReadout, type Spring } from "@/iso/react/live";
import {
  FACE,
  HEIGHT,
  WIDTH,
  bandPath,
  bezelRing,
  dialAngle,
  dropOf,
  hubRing,
  majorInner,
  needlePath,
  restDial,
  sensorNode,
  sensorReadout,
  slideOf,
  spoke,
  strikeOf,
  tabTip,
  tickInner,
  tickMajor,
  tickMinor,
  tickOuter,
} from "./geometry";
import {
  BIG_STEP,
  RANGE_MAX,
  RANGE_MIN,
  REST_READING,
  SCALE_HI,
  SCALE_LO,
  STEP,
  alarming,
  formatTenths,
  placeMax,
  placeMin,
  placeReading,
} from "./model";
import "./next-steps.css";

const TAU = 0.28;
const TOUR = 8.6;
const PAUSE = 3.6;

const ease = (t: number) => {
  const u = Math.min(1, Math.max(0, t));
  return u * u * (3 - 2 * u);
};

function tourReading(t: number) {
  const at = t % TOUR;
  if (at < 1.3) return REST_READING;
  if (at < 3.5) return REST_READING + (34 - REST_READING) * ease((at - 1.3) / 2.2);
  if (at < 5.3) return 34;
  if (at < 7.5) return 34 + (REST_READING - 34) * ease((at - 5.3) / 2.2);
  return REST_READING;
}

interface Props {
  label: string;
  base: ReactNode;
  sensor: ReactNode;
  air: ReactNode;
  bell: ReactNode;
  gauge: ReactNode;
  chute: ReactNode;
  rule: ReactNode;
  striker: ReactNode;
  letter: ReactNode;
  slide: ReactNode;
  wire: ReactNode;
}

export function NextStepsLive(props: Props) {
  const { formatMessage } = useIntl();
  const { anchor, say } = useReadout<HTMLDivElement>();
  const visible = useInView(anchor);
  const needle = useRef<SVGPathElement>(null);
  const band = useRef<SVGPathElement>(null);
  const minTab = useRef<SVGPathElement>(null);
  const maxTab = useRef<SVGPathElement>(null);
  const needleTip = useRef<SVGCircleElement>(null);
  const minTip = useRef<SVGCircleElement>(null);
  const maxTip = useRef<SVGCircleElement>(null);
  const striker = useRef<SVGGElement>(null);
  const letter = useRef<SVGGElement>(null);
  const slide = useRef<SVGGElement>(null);
  const oled = useRef<SVGTSpanElement>(null);
  const reading = useRef(REST_READING);
  const min = useRef(RANGE_MIN);
  const max = useRef(RANGE_MAX);
  const targetReading = useRef(REST_READING);
  const targetMin = useRef(RANGE_MIN);
  const targetMax = useRef(RANGE_MAX);
  const drop = useRef(0);
  const strike = useRef<Spring>({ at: 0, rate: 0 });
  const wasOut = useRef(false);
  const clock = useRef(0);
  const quiet = useRef(PAUSE);
  const engaged = useRef(false);
  const held = useRef(false);
  const [valuetext, setValuetext] = useState(() => spoken(REST_READING, RANGE_MIN, RANGE_MAX));
  const [valueNow, setValueNow] = useState(REST_READING);
  const voice = useRef(valuetext);

  function stateWord(out: boolean) {
    return formatMessage(out ? { id: "figure.next-steps.alarm", defaultMessage: "alarm" } : { id: "figure.next-steps.inRange", defaultMessage: "in range" });
  }

  function spoken(value: number, low: number, high: number) {
    const out = alarming(value, low, high);
    return formatMessage(
      {
        id: "figure.next-steps.value",
        defaultMessage:
          "{reading} degrees, range {min} to {max}, {state}. Left and right move the reading. Up and down move the high set-point. Shift up and down moves the low set-point.",
      },
      { reading: formatTenths(value), min: Math.round(low), max: Math.round(high), state: stateWord(out) },
    );
  }

  function lineOf(value: number, low: number, high: number) {
    return formatMessage(
      { id: "figure.next-steps.readout", defaultMessage: "{reading} °C · {state}" },
      {
        reading: formatTenths(value),
        state: stateWord(alarming(value, low, high)),
      },
    );
  }

  function paint(value: number, low: number, high: number, struck: number, fallen: number) {
    needle.current?.setAttribute("d", needlePath(value));
    band.current?.setAttribute("d", bandPath(high));
    minTab.current?.setAttribute("d", spoke(dialAngle(low), 15.2, 25.2));
    maxTab.current?.setAttribute("d", spoke(dialAngle(high), 15.2, 27.4));
    place(needleTip.current, tabTip(value, 13.4));
    place(minTip.current, tabTip(low, 25.2));
    place(maxTip.current, tabTip(high, 27.4));
    striker.current?.setAttribute("transform", strikeOf(Math.max(0, struck)));
    letter.current?.setAttribute("transform", dropOf(fallen));
    slide.current?.setAttribute("transform", slideOf(value));
    if (oled.current) oled.current.textContent = `${formatTenths(value)}°`;
    say(lineOf(value, low, high));
    const nextVoice = spoken(value, low, high);
    if (nextVoice !== voice.current) {
      voice.current = nextVoice;
      setValuetext(nextVoice);
      setValueNow(Math.round(value));
    }
  }

  const kick = useLoop((dt, calm) => {
    const step = Math.min(dt, 1 / 30);
    if (!engaged.current) quiet.current += step;
    const touring = !engaged.current && quiet.current > PAUSE && !calm;
    if (touring) {
      clock.current += step;
      targetReading.current = tourReading(clock.current);
    }
    reading.current = follow(reading.current, targetReading.current, step, TAU, calm);
    min.current = follow(min.current, targetMin.current, step, TAU, calm);
    max.current = follow(max.current, targetMax.current, step, TAU, calm);
    const out = alarming(reading.current, min.current, max.current);
    if (out && !wasOut.current) strike.current.rate = 9;
    wasOut.current = out;
    const struck = spring(strike.current, 0, step, 240, calm ? 40 : 11, false);
    drop.current = follow(drop.current, out ? 1 : 0, step, 0.45, calm);
    paint(reading.current, min.current, max.current, strike.current.at, drop.current);
    const still =
      reading.current === targetReading.current &&
      min.current === targetMin.current &&
      max.current === targetMax.current &&
      struck &&
      drop.current === (out ? 1 : 0) &&
      !touring;
    return !still;
  }, visible);

  function engage() {
    engaged.current = true;
    quiet.current = 0;
  }

  function release() {
    engaged.current = false;
    quiet.current = 0;
  }

  function fromPointer(clientX: number) {
    const rect = anchor.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return REST_READING;
    const share = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return placeReading(SCALE_LO + share * (SCALE_HI - SCALE_LO));
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    held.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    engage();
    applyPointer(event);
    kick();
  }

  function applyPointer(event: PointerEvent<HTMLDivElement>) {
    const next = fromPointer(event.clientX);
    if (event.shiftKey) targetMin.current = placeMin(next, targetMax.current);
    else if (event.altKey) targetMax.current = placeMax(next, targetMin.current);
    else targetReading.current = next;
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    let used = true;
    if (event.key === "ArrowLeft") targetReading.current = placeReading(targetReading.current - (event.shiftKey ? BIG_STEP : STEP));
    else if (event.key === "ArrowRight") targetReading.current = placeReading(targetReading.current + (event.shiftKey ? BIG_STEP : STEP));
    else if (event.key === "ArrowUp") {
      if (event.shiftKey) targetMin.current = placeMin(targetMin.current + STEP, targetMax.current);
      else targetMax.current = placeMax(targetMax.current + STEP, targetMin.current);
    } else if (event.key === "ArrowDown") {
      if (event.shiftKey) targetMin.current = placeMin(targetMin.current - STEP, targetMax.current);
      else targetMax.current = placeMax(targetMax.current - STEP, targetMin.current);
    } else if (event.key === "Home") targetReading.current = SCALE_LO;
    else if (event.key === "End") targetReading.current = SCALE_HI;
    else used = false;
    if (!used) return;
    event.preventDefault();
    engage();
    kick();
  }

  return (
    <div
      ref={anchor}
      className="next-steps"
      tabIndex={0}
      role="slider"
      aria-label={props.label}
      aria-valuemin={SCALE_LO}
      aria-valuemax={SCALE_HI}
      aria-valuenow={valueNow}
      aria-valuetext={valuetext}
      onPointerDown={onPointerDown}
      onPointerMove={(event) => {
        if (!held.current) return;
        applyPointer(event);
        kick();
      }}
      onPointerUp={() => {
        held.current = false;
        release();
      }}
      onPointerCancel={() => {
        held.current = false;
        release();
      }}
      onPointerEnter={engage}
      onPointerLeave={() => {
        if (!held.current) release();
      }}
      onFocus={engage}
      onBlur={release}
      onKeyDown={onKeyDown}
      onKeyUp={release}
    >
      <IsoFigure width={WIDTH} height={HEIGHT} label={props.label}>
        {props.base}
        {props.sensor}
        <FaceText transform={`${sensorNode.screen} translate(13.5 6.5) rotate(180)`} size={sensorReadout} tone="hi">
          <tspan ref={oled}>{formatTenths(REST_READING)}°</tspan>
        </FaceText>
        {props.bell}
        {props.wire}
        {props.gauge}
        <g transform={FACE}>
          <path className="iso-line" data-tone="lo" d={bezelRing} />
          <path className="iso-line" data-tone="faint" d={tickInner} />
          <path className="iso-line" data-tone="mid" d={tickOuter} />
          <path className="iso-line" data-tone="lo" d={tickMinor} />
          <path className="iso-line" data-tone="mid" d={tickMajor} />
          <path className="iso-line" data-tone="faint" d={majorInner} />
          <path className="iso-line" data-tone="mid" d={hubRing} />
          <path ref={band} className="iso-line" data-tone="red" d={restDial.band} strokeWidth={2.4} />
          <path ref={minTab} className="iso-line" data-tone="lo" d={restDial.minTab} strokeWidth={1.6} />
          <path ref={maxTab} className="iso-line" data-tone="mid" d={restDial.maxTab} strokeWidth={2.2} />
          <path ref={needle} className="iso-line" data-tone="lit" d={restDial.needle} strokeWidth={1.35} />
          <circle ref={needleTip} className="iso-wire-end" cx={restDial.needleTip[0]} cy={restDial.needleTip[1]} r={1.05} />
          <circle ref={minTip} className="iso-wire-end" cx={restDial.minTip[0]} cy={restDial.minTip[1]} r={1.15} />
          <circle ref={maxTip} className="iso-wire-end" cx={restDial.maxTip[0]} cy={restDial.maxTip[1]} r={1.35} />
        </g>
        <g ref={striker}>{props.striker}</g>
        {props.chute}
        <g ref={letter}>{props.letter}</g>
        {props.rule}
        <g ref={slide}>{props.slide}</g>
        {props.air}
      </IsoFigure>
    </div>
  );
}

function place(node: SVGCircleElement | null, at: [number, number]) {
  if (!node) return;
  node.setAttribute("cx", at[0].toFixed(2));
  node.setAttribute("cy", at[1].toFixed(2));
}

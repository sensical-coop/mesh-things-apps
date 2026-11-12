import { FaceText, IsoFigure, Line, Solid } from "@/iso/react/draw";
import { follow, useInView, useLoop, useReadout } from "@/iso/react/live";
import { FIGURE_HEIGHT, FIGURE_WIDTH } from "../view";
import { useIntl } from "react-intl";
import { useRef } from "react";
import { LoraRadio } from "../parts/lora-radio-art";
import { RegisterArt } from "./art";
import { scene } from "./geometry";
import { glyphOf, hexId, placeOf, readoutOf, shortName, tourAt, WHEEL_COUNT } from "./model";

const DIGIT_DRAG = 16;

type Drag = {
  index: number;
  y: number;
  base: number;
};

function at(values: readonly number[], index: number): number {
  return values[index] ?? 0;
}

function wrap(digit: number): number {
  return ((digit % 16) + 16) % 16;
}

export function RegisterLive() {
  const { formatMessage } = useIntl();
  const { anchor, say } = useReadout<HTMLDivElement>();
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root);
  const glyphs = useRef<Array<SVGTextElement | null>>([]);
  const wheels = useRef<Array<SVGGElement | null>>([]);
  const shortLine = useRef<SVGTSpanElement>(null);
  const idLine = useRef<SVGTSpanElement>(null);
  const hit = useRef<HTMLDivElement>(null);
  const goal = useRef<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);
  const shown = useRef<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);
  const wheel = useRef(0);
  const idle = useRef(2);
  const tour = useRef(0);
  const over = useRef(false);
  const drag = useRef<Drag | null>(null);
  const kick = useLoop((dt, calm) => {
    const goals = goal.current;
    const digits = shown.current;
    if (calm) {
      if (idle.current > 1) {
        const frame = tourAt(5.2);
        for (let index = 0; index < WHEEL_COUNT; index++) digits[index] = at(frame, index);
      } else {
        for (let index = 0; index < WHEEL_COUNT; index++) digits[index] = wrap(at(goals, index));
      }
      paint();
      return false;
    }
    if (!over.current && !drag.current) idle.current += dt;
    if (idle.current > 1.4 && !drag.current) {
      const frame = tourAt(tour.current);
      tour.current += dt;
      for (let index = 0; index < WHEEL_COUNT; index++) goals[index] = at(frame, index);
    }
    for (let index = 0; index < WHEEL_COUNT; index++) {
      digits[index] = follow(at(digits, index), at(goals, index), dt, 0.12, false);
    }
    paint();
    return true;
  }, inView);

  function paint() {
    const digits = shown.current;
    for (let index = 0; index < WHEEL_COUNT; index++) {
      const glyph = glyphs.current[index];
      const character = glyphOf(at(digits, index));
      if (glyph && glyph.textContent !== character) glyph.textContent = character;
      const solid = wheels.current[index]?.querySelector(".iso-solid");
      if (!(solid instanceof SVGElement)) continue;
      if (index === wheel.current) solid.dataset.lit = "";
      else delete solid.dataset.lit;
    }
    const name = shortName(digits);
    const id = hexId(digits);
    if (shortLine.current && shortLine.current.textContent !== name) shortLine.current.textContent = name;
    if (idLine.current && idLine.current.textContent !== id) idLine.current.textContent = id;
    const text = readoutOf(digits);
    say(text);
    const control = hit.current;
    if (!control) return;
    control.setAttribute("aria-valuenow", String(placeOf(at(digits, wheel.current))));
    control.setAttribute("aria-valuetext", text);
  }

  function pointOf(event: { clientX: number; clientY: number }): [number, number] | null {
    const svg = root.current?.querySelector("svg");
    if (!svg) return null;
    const box = svg.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return null;
    return [((event.clientX - box.left) / box.width) * FIGURE_WIDTH, ((event.clientY - box.top) / box.height) * FIGURE_HEIGHT];
  }

  function nearest(px: number, py: number): number {
    let best = wheel.current;
    let score = 36 * 36;
    for (const wheel of scene.wheels) {
      const distance = (wheel.at[0] - px) ** 2 + (wheel.at[1] - py) ** 2;
      if (distance < score) {
        score = distance;
        best = wheel.index;
      }
    }
    return best;
  }

  function claim() {
    if (idle.current > 1) {
      for (let index = 0; index < WHEEL_COUNT; index++) goal.current[index] = at(shown.current, index);
    }
    idle.current = 0;
    tour.current = 0;
    kick();
  }

  return (
    <div
      className="register-live"
      ref={(node) => {
        root.current = node;
        anchor.current = node;
      }}
    >
      <IsoFigure
        width={FIGURE_WIDTH}
        height={FIGURE_HEIGHT}
        label={formatMessage({
          id: "figure.register.label",
          defaultMessage: "Meshtastic radio showing a node ID beside eight hex wheels",
        })}
      >
        <RegisterArt />
        <LoraRadio parts={scene.radio} />
        <FaceText transform={`${scene.radio.screen} translate(${scene.screenType.inset} ${scene.screenType.inset})`} size={scene.screenType.short} tone="hi">
          <tspan ref={shortLine} x="0" dy="0.8em">
            0000
          </tspan>
        </FaceText>
        <FaceText
          transform={`${scene.radio.screen} translate(${scene.screenType.inset} ${scene.screenType.inset + scene.screenType.gap})`}
          size={scene.screenType.id}
          tone="hi"
        >
          <tspan ref={idLine} x="0" dy="0.8em">
            !00000000
          </tspan>
        </FaceText>
        {scene.wheels.map((wheel) => (
          <g
            key={wheel.index}
            ref={(node) => {
              wheels.current[wheel.index] = node;
            }}
          >
            <g className="register-band">
              <Solid paths={wheel.band} tone="lo" />
            </g>
            <g className="register-face" clipPath={`url(#register-wheel-${wheel.index})`}>
              <Solid paths={wheel.face} tone="mid" />
              <text
                ref={(node) => {
                  glyphs.current[wheel.index] = node;
                }}
                className="iso-face-text"
                data-tone="hi"
                transform={wheel.label}
                fontSize={scene.wheelGlyph}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                0
              </text>
            </g>
            <Line d={wheel.rings} tone="hi" />
            <Line d={wheel.ticks} tone="mid" />
          </g>
        ))}
        <defs>
          {scene.wheels.map((wheel) => (
            <clipPath key={wheel.index} id={`register-wheel-${wheel.index}`}>
              <path d={wheel.clip} />
            </clipPath>
          ))}
        </defs>
      </IsoFigure>
      <div
        ref={hit}
        className="register-hit"
        tabIndex={0}
        role="slider"
        aria-label={formatMessage({ id: "figure.register.control", defaultMessage: "Node ID wheels" })}
        aria-valuemin={0}
        aria-valuemax={15}
        aria-valuenow={0}
        aria-valuetext="!00000000 = 0"
        onPointerEnter={() => {
          over.current = true;
        }}
        onPointerLeave={() => {
          over.current = false;
        }}
        onPointerDown={(event) => {
          const point = pointOf(event);
          if (!point) return;
          claim();
          const index = nearest(point[0], point[1]);
          wheel.current = index;
          drag.current = { index, y: event.clientY, base: at(goal.current, index) };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const current = drag.current;
          if (!current) return;
          goal.current[current.index] = current.base + (current.y - event.clientY) / DIGIT_DRAG;
          claim();
        }}
        onPointerUp={() => {
          const current = drag.current;
          drag.current = null;
          if (!current) return;
          goal.current[current.index] = Math.round(at(goal.current, current.index));
          claim();
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
          claim();
          const index = wheel.current;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            wheel.current = (index + (event.key === "ArrowRight" ? 1 : WHEEL_COUNT - 1)) % WHEEL_COUNT;
          } else {
            goal.current[index] = at(goal.current, index) + (event.key === "ArrowUp" ? 1 : -1);
          }
          event.preventDefault();
        }}
      />
    </div>
  );
}

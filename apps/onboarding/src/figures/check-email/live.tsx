import { type ReactNode, useRef } from "react";
import { useIntl } from "react-intl";
import { IsoFigure } from "@/iso/react/draw";
import { follow, useInView, useLoop, useReadout } from "@/iso/react/live";
import { FIGURE_HEIGHT, FIGURE_WIDTH, needleHubAt } from "./geometry";
import { phaseOf, sceneAt, secondsLeft, tourUnit, type Scene } from "./model";
import { doorPaths, doorRest, envelopeOpacity, envelopeTransform, flagPaths, flagRest, needlePath, needleRest, writeSolid } from "./pose";
import "./check-email.css";

const REST_MS = 3600;

interface Props {
  base: ReactNode;
  post: ReactNode;
  box: ReactNode;
  dial: ReactNode;
  letter: ReactNode;
  lamp: ReactNode;
}

interface Motion {
  at: number;
  target: number;
  clock: number;
  touched: number;
  held: boolean;
}

export function CheckEmailLive({ base, post, box, dial, letter, lamp }: Props) {
  const { formatMessage } = useIntl();
  const { anchor, say } = useReadout<HTMLDivElement>();
  const visible = useInView(anchor);
  const door = useRef<SVGGElement>(null);
  const flag = useRef<SVGGElement>(null);
  const letterNode = useRef<SVGGElement>(null);
  const lampNode = useRef<SVGGElement>(null);
  const needle = useRef<SVGPathElement>(null);
  const needleTip = useRef<SVGCircleElement>(null);
  const motion = useRef<Motion>({ at: 0, target: 0, clock: 0, touched: 0, held: false });

  const waiting = formatMessage({ id: "figure.check-email.readout.waiting", defaultMessage: "Waiting" });
  const confirmed = formatMessage({ id: "figure.check-email.readout.confirmed", defaultMessage: "Confirmed" });
  const waitingVoice = formatMessage({ id: "figure.check-email.voice.waiting", defaultMessage: "Waiting for the letter" });
  const confirmedVoice = formatMessage({ id: "figure.check-email.voice.confirmed", defaultMessage: "Confirmed. The lamp is on." });
  const label = formatMessage({
    id: "figure.check-email.aria",
    defaultMessage: "Scrub the mailbox from the letter arriving to the lamp confirming the link",
  });
  const svgLabel = formatMessage({
    id: "figure.check-email.svg",
    defaultMessage: "Kerbside mailbox with a red flag and a 60-second resend dial",
  });

  const sent = (seconds: number) =>
    formatMessage({ id: "figure.check-email.readout.sent", defaultMessage: "Sent · resend {seconds}s" }, { seconds });
  const sentVoice = (seconds: number) =>
    formatMessage({ id: "figure.check-email.voice.sent", defaultMessage: "Sent. Resend in {seconds} seconds." }, { seconds });

  const words = useRef({ waiting, confirmed, waitingVoice, confirmedVoice, sent, sentVoice });
  words.current = { waiting, confirmed, waitingVoice, confirmedVoice, sent, sentVoice };

  const readoutOf = (scene: Scene) => {
    const phase = phaseOf(scene);
    const text = words.current;
    if (phase === "confirmed") return text.confirmed;
    if (phase === "sent") return text.sent(secondsLeft(scene));
    return text.waiting;
  };

  const voiceOf = (scene: Scene) => {
    const phase = phaseOf(scene);
    const text = words.current;
    if (phase === "confirmed") return text.confirmedVoice;
    if (phase === "sent") return text.sentVoice(secondsLeft(scene));
    return text.waitingVoice;
  };

  const paint = (scene: Scene) => {
    writeSolid(door.current, doorPaths(scene.door));
    writeSolid(flag.current, flagPaths(scene.flag));
    letterNode.current?.setAttribute("transform", envelopeTransform(scene));
    if (letterNode.current) letterNode.current.style.opacity = String(envelopeOpacity(scene));
    const mark = needlePath(scene.seconds);
    needle.current?.setAttribute("d", mark.d);
    needleTip.current?.setAttribute("cx", String(Math.round(mark.tip[0] * 10) / 10));
    needleTip.current?.setAttribute("cy", String(Math.round(mark.tip[1] * 10) / 10));
    const lens = lampNode.current?.querySelector(".iso-solid");
    if (scene.lamp > 0.55) lens?.setAttribute("data-lit", "");
    else lens?.removeAttribute("data-lit");
    say(readoutOf(scene));
    const node = anchor.current;
    const voice = voiceOf(scene);
    if (node && node.getAttribute("aria-valuetext") !== voice) {
      node.setAttribute("aria-valuenow", String(Math.round(motion.current.at * 100)));
      node.setAttribute("aria-valuetext", voice);
    }
  };

  const kick = useLoop((dt, calm) => {
    const now = motion.current;
    const idle = !now.held && performance.now() - now.touched > REST_MS;
    if (idle && !calm) {
      now.clock += dt;
      const next = tourUnit(now.clock);
      if (next + 0.45 < now.target) now.at = next;
      now.target = next;
    }
    now.at = follow(now.at, now.target, dt, 0.28, calm);
    paint(sceneAt(now.at));
    return Math.abs(now.at - now.target) > 1e-3 || (idle && !calm);
  }, visible);

  const go = (unit: number, hold: boolean) => {
    const now = motion.current;
    now.held = hold;
    now.touched = performance.now();
    now.target = Math.min(1, Math.max(0, unit));
    kick();
  };

  const fromPointer = (event: React.PointerEvent<HTMLDivElement>, hold: boolean) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const width = rect.width || 1;
    go((event.clientX - rect.left) / width, hold);
  };

  return (
    <div
      ref={anchor}
      className="check-email"
      tabIndex={0}
      role="slider"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
      aria-valuetext={waitingVoice}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        fromPointer(event, true);
      }}
      onPointerMove={(event) => {
        fromPointer(event, true);
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        motion.current.held = false;
        motion.current.touched = performance.now();
        kick();
      }}
      onPointerCancel={() => {
        motion.current.held = false;
        motion.current.touched = performance.now();
        kick();
      }}
      onPointerEnter={() => {
        motion.current.held = true;
      }}
      onPointerLeave={() => {
        motion.current.held = false;
        motion.current.touched = performance.now();
        kick();
      }}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 0.15 : 0.05;
        const at = motion.current.target;
        if (event.key === "ArrowRight" || event.key === "ArrowUp") go(at + step, false);
        else if (event.key === "ArrowLeft" || event.key === "ArrowDown") go(at - step, false);
        else if (event.key === "Home") go(0, false);
        else if (event.key === "End") go(1, false);
        else return;
        event.preventDefault();
      }}
    >
      <IsoFigure width={FIGURE_WIDTH} height={FIGURE_HEIGHT} label={svgLabel}>
        {base}
        {post}
        {box}
        <g
          className="iso-solid flag"
          ref={flag}
        >
          <path className="iso-fill" d={flagRest.fill} />
          <path className="iso-shade" data-shade="0" d={flagRest.shades[0] ?? ""} />
          <path className="iso-top" d={flagRest.top} />
          <path className="iso-line iso-edge" data-tone="red" d={flagRest.outline} />
        </g>
        <g className="iso-solid" ref={door}>
          <path className="iso-fill" d={doorRest.fill} />
          <path className="iso-shade" data-shade="0" d={doorRest.shades[0] ?? ""} />
          <path className="iso-shade" data-shade="1" d={doorRest.shades[1] ?? ""} />
          <path className="iso-shade" data-shade="2" d={doorRest.shades[2] ?? ""} />
          <path className="iso-shade" data-shade="3" d={doorRest.shades[3] ?? ""} />
          <path className="iso-top" d={doorRest.top} />
          <path className="iso-line iso-crease" data-tone="faint" d={doorRest.crease} />
          <path className="iso-line iso-bevel" data-tone="faint" d={doorRest.bevel ?? ""} />
          <path className="iso-line iso-edge" data-tone="hi" d={doorRest.outline} />
        </g>
        <g ref={letterNode} style={{ opacity: 0 }}>
          {letter}
        </g>
        {dial}
        <path ref={needle} className="iso-line" data-tone="lit" d={needleRest.d} />
        <circle className="iso-wire-end" cx={needleHubAt[0]} cy={needleHubAt[1]} r={1.1} />
        <circle ref={needleTip} className="iso-wire-end" cx={needleRest.tip[0]} cy={needleRest.tip[1]} r={0.9} />
        <g ref={lampNode}>{lamp}</g>
      </IsoFigure>
    </div>
  );
}

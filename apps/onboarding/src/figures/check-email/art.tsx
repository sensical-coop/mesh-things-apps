import { Dots, FaceText, Line, Solid } from "@/iso/react/draw";
import {
  archBands,
  box,
  boxSeam,
  bracketArt,
  bracketStrap,
  crownKnob,
  crownKnurl,
  crownStem,
  dialBezel,
  dialBody,
  dialClamp,
  dialFace,
  dialFootArt,
  dialHub,
  dialKnurl,
  dialStem,
  dialTicks,
  envelope,
  envelopeDots,
  envelopeFlap,
  envelopeLines,
  flagBolt,
  flagStop,
  flange,
  flangeBolts,
  footArt,
  hingeBarrels,
  labelDots,
  labelPlate,
  labelRules,
  lampArm,
  lampHouse,
  lampLens,
  numeralAt,
  plate,
  plateGroove,
  plateScrews,
  post,
  postBands,
  ruler,
  rulerTicks,
  screwRings,
  slotMouth,
} from "./geometry";
import { CheckEmailLive } from "./live";
import { COOLDOWN_SECONDS } from "./model";

const BASE = (
  <g key="base">
    {footArt.map((paths, index) => (
      <Solid key={index} paths={paths} tone={index % 2 === 0 ? "lo" : "mid"} />
    ))}
    <Solid paths={plate} tone="mid" />
    <Line d={plateGroove} tone="lo" />
    <Line d={screwRings} tone="lo" />
    <Dots points={plateScrews} size={0.55} />
    <Solid paths={ruler} tone="lo" crease="none" />
    <Line d={rulerTicks.minor} tone="lo" />
    <Line d={rulerTicks.major} tone="mid" />
    <Solid paths={labelPlate} tone="lo" crease="none" />
    <Line d={labelRules} tone="faint" />
    <Dots points={labelDots} size={0.4} />
  </g>
);

const POST = (
  <g key="post">
    <Solid paths={flange} tone="mid" />
    {flangeBolts.map((paths, index) => (
      <Solid key={index} paths={paths} tone="lo" />
    ))}
    <Solid paths={post} tone="mid" crease="none" />
    <Line d={postBands} tone="faint" />
    <Solid paths={bracketArt} tone="mid" />
    <Solid paths={bracketStrap} tone="lo" crease="none" />
    <Solid paths={lampArm} tone="mid" crease="none" />
    <Solid paths={lampHouse} tone="mid" />
  </g>
);

const BOX = (
  <g key="box">
    <Solid paths={box} tone="hi" />
    <Line d={boxSeam} tone="lo" />
    {archBands.map((paths, index) => (
      <Solid key={index} paths={paths} tone={index % 2 === 0 ? "mid" : "hi"} />
    ))}
    <Solid paths={slotMouth} tone="lo" flat />
    {hingeBarrels.map((paths, index) => (
      <Solid key={index} paths={paths} tone="mid" />
    ))}
    <Solid paths={flagBolt} tone="hi" />
    <Solid paths={flagStop} tone="lo" />
  </g>
);

const DIAL = (
  <g key="dial">
    <Solid paths={dialFootArt} tone="mid" />
    <Solid paths={dialStem} tone="mid" crease="none" />
    <Solid paths={dialClamp} tone="mid" />
    <Solid paths={dialBody} tone="hi" />
    <Line d={dialKnurl} tone="lo" />
    <Line d={dialBezel} tone="mid" />
    <Line d={dialFace} tone="lo" />
    <Line d={dialTicks.minor} tone="lo" />
    <Line d={dialTicks.major} tone="mid" />
    <FaceText transform={numeralAt} size={3.2}>
      {COOLDOWN_SECONDS}
    </FaceText>
    <Solid paths={dialHub} tone="hi" />
    <Solid paths={crownStem} tone="mid" crease="none" />
    <Solid paths={crownKnob} tone="mid" />
    <Line d={crownKnurl} tone="lo" />
  </g>
);

const LETTER = (
  <g key="letter">
    <Solid paths={envelope} tone="hi" />
    <Line d={envelopeFlap} tone="mid" />
    <Line d={envelopeLines} tone="faint" />
    <Dots points={envelopeDots} size={0.35} />
  </g>
);

const LAMP = (
  <g key="lamp">
    <Solid paths={lampLens} tone="lo" />
  </g>
);

export function CheckEmailArt() {
  return <CheckEmailLive base={BASE} post={POST} box={BOX} dial={DIAL} letter={LETTER} lamp={LAMP} />;
}

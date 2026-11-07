import { Dots, Line, Solid, Wire } from "@/iso/react/draw";
import { AirWaves } from "../parts/air-waves-art";
import { LoraRadio } from "../parts/lora-radio-art";
import {
  bezelDisk,
  bellBody,
  bellCrown,
  bellFlare,
  bellLip,
  bellNeck,
  bellPost,
  bellSeam,
  bellShoulder,
  bellTerminal,
  brace,
  caseBand,
  caseBody,
  caseSeam,
  cheekA,
  cheekB,
  chuteHigh,
  chuteLow,
  chuteMid,
  clapper,
  cursorBar,
  derivedEdge,
  derivedMajor,
  derivedMinor,
  derivedTip,
  envelope,
  feet,
  flap,
  footBody,
  footFlange,
  gaugeTerminal,
  glass,
  inputEdge,
  inputMajor,
  inputMinor,
  inputTip,
  leadFrom,
  leadTo,
  leadVia,
  plate,
  plateGroove,
  plinth,
  postL,
  postR,
  ruleBed,
  ruleKnob,
  ruleKnurl,
  rulePostL,
  rulePostR,
  screwDots,
  screwRing,
  slide,
  sensorBoard,
  sensorCan,
  sensorHop,
  sensorNode,
  sensorPins,
  sensorRings,
  stamp,
  stator,
  strikerArm,
  tray,
  wallL,
  wallR,
  wireFrom,
  wireTo,
  wireVia,
  yoke,
  type Part,
} from "./geometry";
import { NextStepsLive } from "./live";

function Body({ part }: { part: Part }) {
  return <Solid paths={part.paths} tone={part.tone} crease={part.crease} />;
}

export function NextStepsArt({ label }: { label: string }) {
  const base = (
    <g key="base">
      {feet.map((foot) => (
        <g key={`${foot.at[0]},${foot.at[1]}`}>
          <Solid paths={footFlange(foot.at)} tone="lo" />
          <Solid paths={footBody(foot.at)} tone="mid" />
        </g>
      ))}
      <Body part={plate} />
      <Line d={plateGroove} tone="lo" />
      <Line d={screwRing} tone="lo" />
      <Dots points={screwDots} size={0.4} />
    </g>
  );

  const sensor = (
    <g key="sensor">
      <LoraRadio parts={sensorNode} />
      <Body part={sensorBoard} />
      <Body part={sensorCan} />
      {sensorPins.map((paths, index) => (
        <Solid key={index} paths={paths} tone="mid" crease="none" />
      ))}
      <Wire from={leadFrom} to={leadTo} via={leadVia} tone="mid" size={1.15} />
    </g>
  );

  const bell = (
    <g key="bell">
      <Body part={bellTerminal} />
      <Body part={bellPost} />
      <Body part={yoke} />
      <Body part={bellNeck} />
      <Body part={bellFlare} />
      <Body part={bellLip} />
      <Body part={bellBody} />
      <Line d={bellSeam} tone="faint" />
      <Body part={bellShoulder} />
      <Body part={bellCrown} />
    </g>
  );

  const gauge = (
    <g key="gauge">
      <Body part={gaugeTerminal} />
      <Body part={plinth} />
      <Body part={postL} />
      <Body part={postR} />
      <Body part={brace} />
      <Solid paths={caseBody.paths} tone={caseBody.tone} inner={<Line d={caseSeam} tone="faint" />} />
      <Line d={caseBand} tone="faint" />
      <Body part={bezelDisk} />
      <Body part={glass} />
    </g>
  );

  const chute = (
    <g key="chute">
      <Body part={chuteHigh} />
      <Body part={chuteMid} />
      <Body part={chuteLow} />
      <Body part={wallL} />
      <Body part={wallR} />
      <Body part={tray} />
    </g>
  );

  const rule = (
    <g key="rule">
      <Body part={rulePostL} />
      <Body part={rulePostR} />
      <Body part={ruleBed} />
      <Body part={stator} />
      <Line d={inputEdge} tone="lo" />
      <Line d={inputTip} tone="faint" />
      <Line d={derivedEdge} tone="lo" />
      <Line d={derivedTip} tone="faint" />
      <Line d={inputMinor} tone="lo" />
      <Line d={inputMajor} tone="mid" />
      <Line d={derivedMinor} tone="lo" />
      <Line d={derivedMajor} tone="mid" />
      <Body part={cheekA} />
      <Body part={cheekB} />
      <Body part={cursorBar} />
    </g>
  );

  const striker = (
    <g key="striker">
      <Body part={strikerArm} />
      <Body part={clapper} />
    </g>
  );

  const letter = (
    <g key="letter">
      <Body part={envelope} />
      <Body part={flap} />
      <Body part={stamp} />
    </g>
  );

  const slideArt = (
    <g key="slide">
      <Body part={slide} />
      <Body part={ruleKnob} />
      <Line d={ruleKnurl} tone="lo" />
    </g>
  );

  const wire = <Wire key="wire" from={wireFrom} to={wireTo} via={wireVia} tone="lo" />;
  const air = <AirWaves key="air" rings={sensorRings} links={[{ d: sensorHop.d }]} />;

  return (
    <NextStepsLive
      label={label}
      base={base}
      sensor={sensor}
      air={air}
      bell={bell}
      gauge={gauge}
      chute={chute}
      rule={rule}
      striker={striker}
      letter={letter}
      slide={slideArt}
      wire={wire}
    />
  );
}

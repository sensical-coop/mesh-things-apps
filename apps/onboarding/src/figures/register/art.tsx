import { Solid } from "@/iso/react/draw";
import { scene } from "./geometry";

export function RegisterArt() {
  return (
    <>
      {scene.still.map((part, index) => (
        <Solid key={index} paths={part.paths} tone={part.tone} flat={part.flat} />
      ))}
    </>
  );
}

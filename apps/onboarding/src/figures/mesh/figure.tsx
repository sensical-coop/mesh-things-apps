import type { ReactElement } from "react";
import { MeshScene } from "../parts/mesh-scene-art";
import "./mesh.css";

export function MeshFigure(): ReactElement {
  return (
    <figure className="iso-figure mesh-figure" aria-hidden>
      <MeshScene />
    </figure>
  );
}

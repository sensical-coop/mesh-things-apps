import assert from "node:assert/strict";
import test from "node:test";
import { remarkDiagrams, renderDiagram } from "../src/lib/remark-diagrams.ts";

test("renderDiagram drops the embedded stylesheet and keeps the colour variables", () => {
  const svg = renderDiagram("flowchart LR\n  a[\"Gateway\"] --> b[\"Decoder\"]");
  assert.match(svg, /^<svg /);
  assert.doesNotMatch(svg, /<style>|@import/);
  assert.match(svg, /--fg:var\(--diagram-fg\)/);
  assert.match(svg, />Gateway</);
});

test("remarkDiagrams replaces mermaid code blocks and leaves other code alone", () => {
  const tree = {
    type: "root",
    children: [
      { type: "code", lang: "mermaid", value: "flowchart TD\n  a --> b" },
      { type: "code", lang: "bash", value: "docker compose up" },
      { type: "image", url: "../assets/mesh-grid.svg", alt: "Mesh" },
    ],
  };
  remarkDiagrams()(tree);
  const [diagram, shell, image] = tree.children;
  assert.equal(diagram?.type, "mdxJsxFlowElement");
  assert.equal(shell?.type, "code");
  assert.equal(image !== undefined && "children" in image, false);
});

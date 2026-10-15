import { renderMermaidSVG } from "beautiful-mermaid";

type JsxAttribute = { type: "mdxJsxAttribute"; name: string; value: string };

type MarkdownNode = {
  type: string;
  lang?: string | null;
  value?: string;
  name?: string;
  attributes?: JsxAttribute[];
  children?: MarkdownNode[];
};

// The SVG ships a <style> that imports a web font and styles every `svg` and `text` on the
// page. Its variables are defined in pages/docs/styles.css instead, under `.docs-diagram`.
const embeddedStyle = /<style>[\s\S]*?<\/style>/;

// The SVG colours point at CSS variables, so one render serves light and dark.
const colours = {
  bg: "var(--diagram-bg)",
  fg: "var(--diagram-fg)",
  line: "var(--diagram-line)",
  accent: "var(--diagram-accent)",
  muted: "var(--diagram-muted)",
  surface: "var(--diagram-surface)",
  border: "var(--diagram-border)",
  transparent: true,
  padding: 8,
};

export function renderDiagram(chart: string): string {
  return renderMermaidSVG(chart, colours).replace(embeddedStyle, "");
}

function toDiagram(chart: string): MarkdownNode {
  return {
    type: "mdxJsxFlowElement",
    name: "Diagram",
    attributes: [{ type: "mdxJsxAttribute", name: "svg", value: renderDiagram(chart) }],
    children: [],
  };
}

function replaceDiagrams(node: MarkdownNode): void {
  node.children = node.children?.map((child) => {
    if (child.type === "code" && child.lang === "mermaid" && child.value) return toDiagram(child.value);
    replaceDiagrams(child);
    return child;
  });
}

/** Renders ```mermaid blocks to SVG at build time, as `<Diagram svg="…" />`. */
export function remarkDiagrams() {
  return replaceDiagrams;
}

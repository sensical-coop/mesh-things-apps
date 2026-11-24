export type DocsDiagramProps = {
  /** SVG rendered at build time by `remarkDiagrams` from the page's own MDX. */
  svg: string;
};

export function DocsDiagram({ svg }: DocsDiagramProps) {
  return (
    <div
      className="docs-diagram not-prose my-6 overflow-x-auto oa-squircle bg-background-secondary-default p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

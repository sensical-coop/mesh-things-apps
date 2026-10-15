import { getTheme } from "@mtt/ui/theme";
import { cx } from "@mtt/ui/utils";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { useLocale } from "@/hooks/use-locale";

export type DocsMermaidProps = { chart: string };

function subscribeTheme(onChange: () => void) {
  globalThis.addEventListener("boardui-theme", onChange);
  return () => globalThis.removeEventListener("boardui-theme", onChange);
}

export function DocsMermaid({ chart }: DocsMermaidProps) {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, getTheme);
  const [locale] = useLocale();
  const [svg, setSvg] = useState("");
  const [failed, setFailed] = useState(false);
  const reactId = useId();

  useEffect(() => {
    let cancelled = false;
    const id = `mmd${reactId.replaceAll(":", "")}`;
    setFailed(false);
    void import("mermaid").then(async ({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: theme === "dark" ? "dark" : "neutral",
        fontFamily: "inherit",
      });
      try {
        const rendered = await mermaid.render(id, chart);
        if (!cancelled) setSvg(rendered.svg);
      } catch {
        if (!cancelled) setFailed(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [chart, reactId, theme]);

  if (failed) {
    return (
      <p className="text-body-regular text-text-secondary">
        {locale === "es" ? "El diagrama no se ha podido dibujar." : "The diagram could not be drawn."}
      </p>
    );
  }

  return (
    <div
      aria-busy={svg === ""}
      className={cx(
        "oa-squircle my-6 min-h-24 overflow-x-auto border border-separator-border bg-background-secondary-default p-4",
        "[&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full",
      )}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

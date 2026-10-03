import { type ReactElement } from "react";
import { useIntl } from "react-intl";

/** Fills a map's frame when the browser can't start WebGL2. */
export function MapUnsupported(): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-4 text-center">
      <p className="text-body-medium text-text-primary">
        {formatMessage({ id: "components.mapUnsupported.title", defaultMessage: "This map needs WebGL2." })}
      </p>
      <p className="text-caption-1-regular text-text-tertiary">
        {formatMessage({
          id: "components.mapUnsupported.hint",
          defaultMessage: "Turn on hardware acceleration or try another browser.",
        })}
      </p>
    </div>
  );
}

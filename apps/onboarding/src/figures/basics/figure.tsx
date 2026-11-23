import type { ReactElement } from "react";
import { useIntl } from "react-intl";
import { BasicsArt } from "./art";
import "./basics.css";
import type { BasicsConcept } from "./model";

export function BasicsFigure({ selected }: { selected: BasicsConcept }): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <figure className="iso-figure basics-figure">
      <div className="iso-plate">
        <BasicsArt
          selected={selected}
          label={formatMessage({ id: "figure.basics.aria", defaultMessage: "Relay bench, from the radios to the database" })}
        />
      </div>
    </figure>
  );
}

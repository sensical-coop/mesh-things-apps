import { readApiError } from "@mtt/contracts/errors";

export type BrokerDialogCopy = {
  termsChanged: string;
  /** 502 while editing; `detail` is the API's reason, or empty. */
  failedEdit: string;
  /** 502 while creating. */
  failedCreate: string;
  forbidden: string;
  notFound: string;
  generic: string;
};

/** Terms version, broker 502, permission, missing row, then field errors — shared by sink and source dialogs. */
export function brokerDialogError(
  error: unknown,
  editing: boolean,
  copy: BrokerDialogCopy,
): { fields: Record<string, string>; formError: string | null } {
  const { status, detail, fields } = readApiError(error);
  const { non_field_errors: nonField, terms_version: termsError, ...byField } = fields;
  if (termsError) return { fields: byField, formError: copy.termsChanged };
  if (status === 502) return { fields: byField, formError: editing ? copy.failedEdit : copy.failedCreate };
  if (status === 403) return { fields: byField, formError: copy.forbidden };
  if (status === 404) return { fields: byField, formError: copy.notFound };
  if (Object.keys(byField).length > 0) return { fields: byField, formError: null };
  return { fields: byField, formError: nonField ?? detail ?? copy.generic };
}

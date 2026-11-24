import { issueErrors } from "./api-errors";
import { MeshCreateRequest } from "./generated/model.zod";
import { type TermsAcceptance, termsFields } from "./terms";

/** The create body, or the field errors of what failed to parse. `terms` is sent only when there is one. */
export function meshCreateBody(
  values: { label: string | null; channel_id: string; psk_b64: string },
  extra: { discover_gateways: boolean; source_id?: string; terms?: TermsAcceptance | null },
): { data: MeshCreateRequest } | { errors: Record<string, string> } {
  const { terms, ...rest } = extra;
  const parsed = MeshCreateRequest.safeParse({
    ...values,
    ...rest,
    ...(terms ? termsFields(terms) : {}),
  });
  return parsed.success ? { data: parsed.data } : { errors: issueErrors(parsed.error.issues) };
}

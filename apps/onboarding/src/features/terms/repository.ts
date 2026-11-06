import { readApiError } from "@mtt/contracts/errors";
import { getMeshesTermsRetrieveQueryOptions, getTermsRetrieveQueryOptions } from "@mtt/contracts/api";
import type { TermsLocale } from "@/features/terms/model";

export const termsRepository = {
  account: getTermsRetrieveQueryOptions,
  mesh: getMeshesTermsRetrieveQueryOptions,
};

/** Account terms, and whether this instance asks for terms (`GET /terms` 404 means no). */
export function accountTermsQuery(locale: TermsLocale) {
  return {
    ...getTermsRetrieveQueryOptions({ locale }),
    retry: (failures: number, error: unknown) => readApiError(error).status !== 404 && failures < 3,
    staleTime: 5 * 60_000,
  };
}

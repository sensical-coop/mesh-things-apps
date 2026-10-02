import {
  meshesTermsAcceptanceCreateMutation,
  meshesTermsRetrieveOptions,
  ownersMeTermsAcceptanceCreateMutation,
  sourcesTermsAcceptanceCreateMutation,
  sourcesTermsRetrieveOptions,
  termsRetrieveOptions,
} from "@mtt/contracts/query";
import { readApiError } from "@/lib/api-errors";
import type { TermsLocale } from "@/features/terms/model";

/** The API owns the terms: their text and version come from these routes. */
export const termsRepository = {
  /** Account terms, accepted at signup; readable without an account. They don't lapse. */
  account: termsRetrieveOptions,
  /** Mesh terms, accepted per mesh on the default broker. */
  mesh: meshesTermsRetrieveOptions,
  /** Source terms, accepted per source; operators only. */
  source: sourcesTermsRetrieveOptions,
  acceptAccount: ownersMeTermsAcceptanceCreateMutation,
  renewMesh: meshesTermsAcceptanceCreateMutation,
  renewSource: sourcesTermsAcceptanceCreateMutation,
};

/**
 * The account terms, which also tell whether this instance asks for terms at all
 * (`GET /terms` answers 404 when it doesn't). One shared, long-lived query; a 404 is
 * an answer, not a failure, so it isn't retried.
 */
export function accountTermsQuery(locale: TermsLocale) {
  return {
    ...termsRetrieveOptions({ query: { locale } }),
    retry: (failures: number, error: unknown) => readApiError(error).status !== 404 && failures < 3,
    staleTime: 5 * 60_000,
  };
}

import {
  getMeshesTermsAcceptanceCreateMutationOptions,
  getMeshesTermsRetrieveQueryOptions,
  getOwnersMeTermsAcceptanceCreateMutationOptions,
  getSinksTermsAcceptanceCreateMutationOptions,
  getSinksTermsRetrieveQueryOptions,
  getSourcesTermsAcceptanceCreateMutationOptions,
  getSourcesTermsRetrieveQueryOptions,
  getTermsRetrieveQueryOptions,
} from "@mtt/contracts/api";

export const termsRepository = {
  /** Account terms, accepted at signup; readable without an account. They don't lapse. */
  account: getTermsRetrieveQueryOptions,
  /** Mesh terms, accepted per mesh on the default broker. */
  mesh: getMeshesTermsRetrieveQueryOptions,
  /** Source terms, accepted per source; operators only. */
  source: getSourcesTermsRetrieveQueryOptions,
  /** Sink terms, accepted per sink; operators only. */
  sink: getSinksTermsRetrieveQueryOptions,
  acceptAccount: getOwnersMeTermsAcceptanceCreateMutationOptions,
  renewMesh: getMeshesTermsAcceptanceCreateMutationOptions,
  renewSource: getSourcesTermsAcceptanceCreateMutationOptions,
  renewSink: getSinksTermsAcceptanceCreateMutationOptions,
};

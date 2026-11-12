import {
  getMeshesTermsRetrieveQueryOptions,
  getOwnersMeTermsAcceptanceCreateMutationOptions,
  getSinksTermsRetrieveQueryOptions,
  getSourcesTermsRetrieveQueryOptions,
  meshesTermsAcceptanceCreate,
  sinksTermsAcceptanceCreate,
  sourcesTermsAcceptanceCreate,
} from "@mtt/contracts/api";
import { accountTermsQuery, type termsFields } from "@mtt/contracts/terms";

export type Renewal = { id: string; data: ReturnType<typeof termsFields> };

const renew = {
  mesh: { mutationFn: ({ id, data }: Renewal) => meshesTermsAcceptanceCreate(id, data) },
  source: { mutationFn: ({ id, data }: Renewal) => sourcesTermsAcceptanceCreate(id, data) },
  sink: { mutationFn: ({ id, data }: Renewal) => sinksTermsAcceptanceCreate(id, data) },
};

/** The mesh, source or sink a renewal answers with. */
export type TermsRenewed<K extends keyof typeof renew> = Awaited<ReturnType<(typeof renew)[K]["mutationFn"]>>;

export const termsRepository = {
  /** Account terms, accepted at signup; readable without an account. They don't lapse. */
  account: (params: { locale: Parameters<typeof accountTermsQuery>[0] }) => accountTermsQuery(params.locale),
  /** Mesh terms, accepted per mesh on the default broker. */
  mesh: getMeshesTermsRetrieveQueryOptions,
  /** Source terms, accepted per source; operators only. */
  source: getSourcesTermsRetrieveQueryOptions,
  /** Sink terms, accepted per sink; operators only. */
  sink: getSinksTermsRetrieveQueryOptions,
  acceptAccount: getOwnersMeTermsAcceptanceCreateMutationOptions,
  /** Accepting the current terms again, by entity id. */
  renew,
};

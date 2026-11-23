import { nullOn404 } from "@mtt/contracts/errors";
import {
  getOwnersMeGatewayBrokerRetrieveQueryKey,
  getOwnersMeRetrieveQueryOptions,
  ownersMeGatewayBrokerRetrieve,
} from "@mtt/contracts/api";

export const authRepository = {
  me: getOwnersMeRetrieveQueryOptions,
  /** 404 is "not configured" (`null`), not a failure. Values stay in the query cache only. */
  broker: () => ({
    queryKey: getOwnersMeGatewayBrokerRetrieveQueryKey(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }: { signal: AbortSignal }) => nullOn404(() => ownersMeGatewayBrokerRetrieve({ signal })),
  }),
};

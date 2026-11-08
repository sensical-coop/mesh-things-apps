import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useIntl } from "react-intl";
import { classifySignupFailure, type SignupFailure } from "./api-errors";
import { getOwnersCreateMutationOptions, getOwnersMeRetrieveQueryKey } from "./generated/api";
import { accountTermsQuery, signupCreateBody, signupTermsStale, termsLocale, useTermsEnforced } from "./terms";

/** Account terms, the create call, and a refetch when the accepted terms version is stale. */
export function useSignup({
  next,
  onSignedUp,
}: {
  /** Allow-listed return path. Omitted when the caller has none. */
  next?: string;
  /** Runs after the new session is invalidated. Web navigates to verify here. */
  onSignedUp?: () => Promise<void> | void;
} = {}) {
  const { locale } = useIntl();
  const termsQuery = useQuery(accountTermsQuery(termsLocale(locale)));
  const termsOff = useTermsEnforced() === false;
  const [termsResetKey, setTermsResetKey] = useState(0);
  const queryClient = useQueryClient();
  const [failure, setFailure] = useState<SignupFailure | null>(null);
  const signup = useMutation({
    ...getOwnersCreateMutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: getOwnersMeRetrieveQueryKey() });
      await onSignedUp?.();
    },
  });

  async function submit(values: { name: string; email: string; password: string; accepted: string[] }) {
    setFailure(null);
    const data = signupCreateBody(values, { off: termsOff, current: termsQuery.data }, next);
    if (!data) return;
    try {
      await signup.mutateAsync({ data });
    } catch (caught) {
      setFailure(classifySignupFailure(caught));
      if (signupTermsStale(caught)) {
        setTermsResetKey((key) => key + 1);
        void termsQuery.refetch();
      }
    }
  }

  return {
    failure,
    pending: signup.isPending,
    termsOff,
    terms: termsQuery.data,
    termsLoading: !termsOff && termsQuery.isPending,
    termsLoadFailed: !termsOff && termsQuery.isError,
    termsResetKey,
    submit,
  };
}

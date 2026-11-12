import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useIntl } from "react-intl";
import { termsLocale, useTermsAsked, useTermsConfirmed, type TermsAcceptance } from "@mtt/contracts/terms";
import type { TermsKind } from "@/features/terms/model";
import { termsRepository } from "@/features/terms/repository";

/**
 * What a sources or sinks list needs for terms: whether to ask for them at all (unknown counts as asked),
 * the current version (to tell an entity accepted under older terms), and the create flow:
 * terms first, then the form, with the acceptance accepted anew for every entity and dropped on close.
 */
export function useEntityTerms(kind: Extract<TermsKind, "source" | "sink">) {
  const params = { locale: termsLocale(useIntl().locale) };
  const asked = useTermsAsked();
  const current = useQuery({ ...termsRepository[kind](params), enabled: useTermsConfirmed() });
  const [termsOpen, setTermsOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [acceptance, setAcceptance] = useState<TermsAcceptance | null>(null);
  return {
    asked,
    currentVersion: current.data?.version,
    termsOpen,
    formOpen,
    acceptance,
    startCreate: () => (asked ? setTermsOpen(true) : setFormOpen(true)),
    closeTerms: () => setTermsOpen(false),
    accepted: (accepted: TermsAcceptance | null) => {
      setTermsOpen(false);
      setAcceptance(accepted);
      setFormOpen(true);
    },
    closeForm: () => {
      setFormOpen(false);
      setAcceptance(null);
    },
  };
}

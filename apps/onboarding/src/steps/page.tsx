import type { DeviceRead, Mesh, OwnerRead } from "@mtt/contracts";
import { readApiError } from "@mtt/contracts/errors";
import { MeasuredSteps } from "@mtt/ui/components/measured-steps";
import { cx } from "@mtt/ui/utils";
import { useQuery } from "@tanstack/react-query";
import { type ReactElement, useEffect, useRef } from "react";
import { useIntl } from "react-intl";
import { authRepository } from "@/features/auth/repository";
import { meshRepository } from "@/features/mesh/repository";
import { useStartSearch, writeStartSearch } from "@/start-search";
import { previousStartStep, resolveStartStep, START_STEPS, type StartFacts, type StartStep } from "@/start-step";
import { AccountStep } from "./account-step";
import { BasicsStep } from "./basics-step";
import { CheckEmailStep } from "./check-email-step";
import { ConnectStep } from "./connect-step";
import { DoneStep } from "./done-step";
import { MeshStep } from "./mesh-step";
import { NextStepsStep } from "./next-steps-step";
import { RegisterGatewayStep } from "./register-gateway-step";
import { StartHeader } from "./start-header";
import { StepHeading } from "./step-heading";
import { WelcomeStep } from "./welcome-step";

function sessionOf(me: { isPending: boolean; isError: boolean; error: unknown; data?: OwnerRead }): StartFacts["session"] | "pending" {
  if (me.isPending) return "pending";
  if (me.isError) {
    const status = readApiError(me.error).status;
    if (status === 401 || status === 403) return "none";
    return "pending";
  }
  return me.data?.is_active ? "verified" : "unverified";
}

export function StartPage(): ReactElement {
  const { formatMessage } = useIntl();
  const search = useStartSearch();
  const me = useQuery({ ...authRepository.me(), retry: false });
  const session = sessionOf(me);
  const meshId = search.mesh;
  const meshQuery = useQuery({
    ...meshRepository.retrieve(meshId ?? ""),
    enabled: session === "verified" && Boolean(meshId),
    retry: false,
  });
  const devicesQuery = useQuery({
    ...meshRepository.devices(meshId ?? ""),
    enabled: session === "verified" && meshQuery.isSuccess,
    retry: false,
    refetchInterval: search.step === "connect" ? 5000 : false,
    refetchIntervalInBackground: false,
  });

  const meshMissing = Boolean(meshId) && meshQuery.isError && (readApiError(meshQuery.error).status === 404 || readApiError(meshQuery.error).status === 403);
  const mesh: Mesh | undefined = meshQuery.isSuccess ? meshQuery.data : undefined;
  const devices: DeviceRead[] = devicesQuery.data ?? [];
  const gateway = devices.find((device) => device.is_gateway);
  const facts: StartFacts | undefined =
    session === "none" || session === "unverified"
      ? { session, mesh: "none", gateway: "none" }
      : session === "verified" && (!meshId || meshMissing || (meshQuery.isSuccess && devicesQuery.isSuccess))
        ? { session, mesh: mesh ? "owned" : "none", gateway: !gateway ? "none" : gateway.last_seen ? "seen" : "unseen" }
        : undefined;
  const step: StartStep | undefined = facts && !meshMissing ? resolveStartStep(search.step, facts) : undefined;

  const previous = useRef<StartStep | undefined>(undefined);
  const direction: 1 | -1 =
    step && previous.current ? (START_STEPS.indexOf(step) >= START_STEPS.indexOf(previous.current) ? 1 : -1) : 1;

  useEffect(() => {
    if (meshMissing || !step || step === search.step) return;
    writeStartSearch({ mesh: mesh?.id ?? search.mesh, step }, "replace");
  }, [meshMissing, step, search.step, search.mesh, mesh?.id]);

  useEffect(() => {
    if (!step) return;
    previous.current = step;
  }, [step]);

  function go(next: StartStep, nextMesh = mesh?.id ?? search.mesh) {
    writeStartSearch({ mesh: nextMesh, step: next }, "push");
  }

  const signedInLabel = me.data ? me.data.name.trim() || me.data.email : undefined;
  const nodeCount = devices.filter((device) => !device.is_gateway).length;

  const back = step && facts ? previousStartStep(step, facts) : undefined;

  return (
    <main className="min-h-svh bg-background-secondary-default px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <StartHeader
          step={step ?? "welcome"}
          meshId={mesh?.id}
          signedInLabel={session === "none" ? undefined : signedInLabel}
          onBack={back ? () => go(back) : undefined}
        />
        <section
          className={cx(
            "iso oa-squircle bg-background-primary-default p-5 shadow-card sm:p-6",
            step === "account" && "mx-auto w-full max-w-md sm:p-8",
          )}
        >
          {!step ? (
            <div aria-busy="true" aria-label={formatMessage({ id: "page.start.loading", defaultMessage: "Checking your account" })}>
              <div className="flex flex-col gap-3" aria-hidden>
                <div className="h-4 w-2/3 rounded bg-separator-border" />
                <div className="h-4 w-full rounded bg-separator-border" />
                <div className="h-4 w-full rounded bg-separator-border" />
                <div className="h-4 w-1/2 rounded bg-separator-border" />
              </div>
            </div>
          ) : meshMissing ? (
            <div className="flex flex-col gap-3">
              <StepHeading>
                {formatMessage({ id: "page.start.meshMissing.title", defaultMessage: "That mesh was not found" })}
              </StepHeading>
              <p className="text-body-medium text-text-secondary">
                {formatMessage({
                  id: "page.start.meshMissing.body",
                  defaultMessage: "It does not exist, or it belongs to another account. You can start a new mesh.",
                })}
              </p>
              <button type="button" className="text-body-medium text-text-primary underline" onClick={() => writeStartSearch({ step: "basics" }, "push")}>
                {formatMessage({ id: "page.start.meshMissing.action", defaultMessage: "Start a new mesh" })}
              </button>
            </div>
          ) : (
            <MeasuredSteps stepKey={step} direction={direction}>
              {step === "welcome" ? <WelcomeStep onContinue={() => go("account")} /> : null}
              {step === "account" ? <AccountStep /> : null}
              {step === "check-email" && me.data ? <CheckEmailStep email={me.data.email} sentAt={me.data.email_verification_sent_at} /> : null}
              {step === "basics" ? <BasicsStep onContinue={() => go("mesh")} /> : null}
              {step === "mesh" ? <MeshStep onCreated={(created) => writeStartSearch({ mesh: created.id, step: "register" }, "push")} /> : null}
              {step === "register" && mesh ? <RegisterGatewayStep meshId={mesh.id} onRegistered={() => go("connect", mesh.id)} /> : null}
              {step === "connect" && mesh && gateway ? (
                <ConnectStep mesh={mesh} gateway={gateway} onContinue={() => go("next-steps")} onSkip={() => go("next-steps")} />
              ) : null}
              {step === "next-steps" && gateway ? <NextStepsStep gateway={gateway} onDone={() => go("done")} /> : null}
              {step === "done" && mesh && gateway ? (
                <DoneStep mesh={mesh} gateway={gateway} nodeCount={nodeCount} absenceOn={gateway.absence_detection_enabled} seen={gateway.last_seen !== null} />
              ) : null}
            </MeasuredSteps>
          )}
        </section>
      </div>
    </main>
  );
}

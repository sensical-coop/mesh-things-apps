import { Tabs, TabsContent, TabsList, TabsTrigger } from "@mtt/ui/components/ui/tabs";
import type { ReactElement } from "react";
import { useIntl } from "react-intl";
import { LoginForm } from "@/features/auth/login-form";
import { SignupForm } from "@/features/auth/signup-form";
import { StepHeading } from "./step-heading";

export function AccountStep(): ReactElement {
  const { formatMessage } = useIntl();
  return (
    <div className="flex flex-col gap-5 text-pretty">
      <StepHeading>
        {formatMessage({ id: "page.start.account.title", defaultMessage: "Create your account or sign in" })}
      </StepHeading>
      <Tabs defaultValue="signup" className="gap-5">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signup" className="py-1.5 text-body-medium">
            {formatMessage({ id: "page.start.account.tabSignup", defaultMessage: "Create account" })}
          </TabsTrigger>
          <TabsTrigger value="login" className="py-1.5 text-body-medium">
            {formatMessage({ id: "page.start.account.tabLogin", defaultMessage: "Sign in" })}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="signup">
          <SignupForm />
        </TabsContent>
        <TabsContent value="login">
          <LoginForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}

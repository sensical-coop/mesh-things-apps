import { OwnerUpdate } from "@mtt/contracts";

/** The profile form's name and email, trimmed and validated. */
export function parseProfileForm(form: FormData) {
  return OwnerUpdate.safeParse({
    name: String(form.get("name") ?? "").trim(),
    email: String(form.get("email") ?? "").trim(),
  });
}

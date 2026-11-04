// Keep in sync with RESEND_COOLDOWN_SECONDS in apps/api-mock/src/app.ts.
export const RESEND_COOLDOWN_SECONDS = 60;

export function secondsUntilResendAllowed(sentAt: string | null, now: number): number {
  if (!sentAt) return 0;
  const elapsed = (now - Date.parse(sentAt)) / 1000;
  return Math.max(0, Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed));
}

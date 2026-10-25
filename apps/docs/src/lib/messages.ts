import type { Locale } from "@/lib/locale";
import en from "@/locales/en.json";
import es from "@/locales/es.json";

export const MESSAGES: Record<Locale, Record<string, string>> = { en, es };

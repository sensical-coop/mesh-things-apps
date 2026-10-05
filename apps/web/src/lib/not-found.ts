import { notFound } from "@tanstack/react-router";
import { z } from "zod";
import { readApiError } from "./api-errors.ts";

const uuid = z.uuid();

/** Same check the generated request validator runs on `{…_id}` path params. */
export function isUuid(value: string): boolean {
  return uuid.safeParse(value).success;
}

/** A detail route's `beforeLoad`: a param that can't be an id never reaches the API. */
export function requireUuid(value: string): void {
  if (!isUuid(value)) throw notFound();
}

export function isNotFoundError(error: unknown): boolean {
  return readApiError(error).status === 404;
}

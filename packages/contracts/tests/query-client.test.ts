import { afterEach, describe, expect, it, vi } from "vitest";
import { createQueryClient } from "../src/query-client";

describe("createQueryClient", () => {
  afterEach(() => vi.restoreAllMocks());

  async function fail(status: number) {
    const client = createQueryClient();
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    await client
      .fetchQuery({ queryKey: ["owners", "me"], queryFn: () => Promise.reject({ detail: "No", status }), retry: false })
      .catch(() => {});
    return logged;
  }

  it("does not log a signed-out session check", async () => {
    expect(await fail(401)).not.toHaveBeenCalled();
  });

  it("logs other failures", async () => {
    expect(await fail(500)).toHaveBeenCalledOnce();
  });
});

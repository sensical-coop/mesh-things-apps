import { describe, expect, it } from "vitest";
import { Mesh } from "../../src/mesh/Mesh";

const base = {
  id: "11111111-1111-4111-8111-111111111111",
  channelId: "LongFast",
  pskB64: "c2VjcmV0",
  label: "Hill",
  ownerId: "22222222-2222-4222-8222-222222222222",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("Mesh", () => {
  it("creates with a psk", () => {
    const mesh = new Mesh(base);
    expect(mesh.pskB64).toBe("c2VjcmV0");
  });

  it("list item omits psk", () => {
    const item = new Mesh(base).toListItem();
    expect(item).not.toHaveProperty("pskB64");
    expect("pskB64" in item).toBe(false);
  });
});

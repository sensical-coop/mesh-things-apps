import { describe, expect, it } from "vitest";
import { isHostPort, normalizeRoot, rootError, validateSource } from "../../src/source/Source";

describe("source", () => {
  it("accepts host:port and refuses anything else", () => {
    expect(isHostPort("mqtt.meshtastic.org:1883")).toBe(true);
    expect(isHostPort("[::1]:8883")).toBe(true);
    expect(isHostPort("mqtt.meshtastic.org")).toBe(false);
    expect(isHostPort(":1883")).toBe(false);
    expect(isHostPort("host:0")).toBe(false);
    expect(isHostPort("host:65536")).toBe(false);
    expect(isHostPort("host:88a")).toBe(false);
  });

  it("accepts a literal root of two or more levels", () => {
    expect(rootError("msh/EU_868")).toBeUndefined();
    expect(rootError(" msh/EU_868/ES/ ")).toBeUndefined();
    expect(normalizeRoot(" msh/EU_868/ES/ ")).toBe("msh/EU_868/ES");
  });

  it("refuses wildcards, $ topics, empty levels and a single level", () => {
    for (const root of ["msh/#", "msh/+", "$SYS/x", "msh//EU", ""]) {
      expect(rootError(root)).toBe("Must be a literal topic prefix, without wildcards or empty levels.");
    }
    expect(rootError("msh")).toBe("Must have at least two levels, such as msh/EU_868.");
  });

  it("refuses a root that reaches the channel levels", () => {
    expect(rootError("msh/EU_868/2/e")).toBe("Give only the part before /2/e, such as msh/EU_868.");
  });

  it("reports each bad field with the API's message", () => {
    expect(validateSource({ server: "nope", root: "msh/#", qos: 2 })).toEqual({
      server: "Must be host:port.",
      root: "Must be a literal topic prefix, without wildcards or empty levels.",
      qos: "Must be 0 or 1.",
    });
    expect(validateSource({ server: "broker:1883", root: "msh/EU_868", qos: 1 })).toEqual({});
  });
});

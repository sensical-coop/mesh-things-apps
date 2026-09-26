import { describe, expect, it } from "vitest";
import { isHostPort, isPlainTopic, validateSource } from "../../src/source/Source";

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

  it("refuses $share and $SYS topics", () => {
    expect(isPlainTopic("msh/EU_868/2/e/MyChannel/#")).toBe(true);
    expect(isPlainTopic("$SYS/#")).toBe(false);
    expect(isPlainTopic("$share/g/msh/#")).toBe(false);
    expect(isPlainTopic("")).toBe(false);
  });

  it("reports each bad field with the API's message", () => {
    expect(validateSource({ server: "nope", topic: "$SYS/#", qos: 2 })).toEqual({
      server: "Must be host:port.",
      topic: "Must be a plain topic filter; $share and $SYS topics are not accepted.",
      qos: "Must be 0 or 1.",
    });
    expect(validateSource({ server: "broker:1883", topic: "msh/#", qos: 1 })).toEqual({});
  });
});

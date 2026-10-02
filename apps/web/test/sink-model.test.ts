import assert from "node:assert/strict";
import test from "node:test";
import {
  brokerHostPort,
  consumerCommand,
  orderStreams,
  devicesByMesh,
  singleDeviceIds,
  sinkStreamsError,
  sinkTitle,
} from "../src/features/sink/model.ts";

test("sinkTitle falls back to the start of the id", () => {
  assert.equal(sinkTitle({ id: "30303030-3030-4303-8303-303030303030", label: "Partner" }), "Partner");
  assert.equal(sinkTitle({ id: "30303030-3030-4303-8303-303030303030", label: "  " }), "Sink 30303030");
  assert.equal(sinkTitle({ id: "30303030-3030-4303-8303-303030303030", label: null }), "Sink 30303030");
});

test("orderStreams keeps known streams in the API's order, once each", () => {
  assert.deepEqual(orderStreams(["alarms", "decoded", "alarms", "bogus"]), ["decoded", "alarms"]);
  assert.deepEqual(orderStreams(new Set(["derived"])), ["derived"]);
  assert.deepEqual(orderStreams([]), []);
});

test("sinkStreamsError asks for at least one stream", () => {
  assert.equal(sinkStreamsError([]), "Choose at least one stream.");
  assert.equal(sinkStreamsError(["decoded"]), undefined);
});

test("devicesByMesh groups devices under their mesh, meshes in order", () => {
  const groups = devicesByMesh(
    [{ id: "m2" }, { id: "m1" }, { id: "m3" }],
    [
      { uuid: "a", mesh_id: "m1" },
      { uuid: "b", mesh_id: "m2" },
      { uuid: "c", mesh_id: "m1" },
      { uuid: "x", mesh_id: "other" },
    ],
  );
  assert.deepEqual(
    groups.map((group) => [group.mesh.id, group.devices.map((device) => device.uuid)]),
    [["m2", ["b"]], ["m1", ["a", "c"]], ["m3", []]],
  );
});

test("singleDeviceIds drops devices whose whole mesh is sent, keeps unknown ones", () => {
  const meshOf = (id: string) => ({ a: "m1", b: "m2" })[id];
  assert.deepEqual(singleDeviceIds(["a", "b", "gone"], new Set(["m1"]), meshOf), ["b", "gone"]);
  assert.deepEqual(singleDeviceIds(new Set(["a"]), new Set(), meshOf), ["a"]);
});

test("brokerHostPort splits host:port and defaults to 8883", () => {
  assert.deepEqual(brokerHostPort("mqtt.example.org:8883"), { host: "mqtt.example.org", port: "8883" });
  assert.deepEqual(brokerHostPort("mqtt.example.org"), { host: "mqtt.example.org", port: "8883" });
});

test("consumerCommand quotes credentials for the shell and keeps a persistent session", () => {
  const command = consumerCommand({
    broker: "mqtt.example.org:8883",
    username: "mt-sink-1",
    password: "it's$ecret",
    topic_filter: "mt-sinks/1/#",
  });
  assert.match(command, /^mosquitto_sub -h mqtt\.example\.org -p 8883 --capath \/etc\/ssl\/certs/);
  assert.match(command, /-P 'it'\\''s\$ecret'/);
  assert.match(command, /-i 'mt-sink-1' -c -q 1/);
  assert.match(command, /-t 'mt-sinks\/1\/#' -v$/);
});

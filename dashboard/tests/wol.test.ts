import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createMagicPacket, deriveBroadcastAddress, parseWolTargets } from "@/lib/wol";

describe("Wake-on-LAN helpers", () => {
  it("derives broadcast addresses from optional IPs", () => {
    assert.equal(deriveBroadcastAddress("192.168.1.12"), "192.168.1.255");
    assert.equal(deriveBroadcastAddress(null), "255.255.255.255");
  });

  it("parses named WOL targets from env text", () => {
    const parsed = parseWolTargets({
      WOL_TARGETS: "LAN_SERVER,NAS",
      WOL_TARGET_LAN_SERVER_LABEL: "External Server",
      WOL_TARGET_LAN_SERVER_MAC: "aa-bb-cc-dd-ee-ff",
      WOL_TARGET_LAN_SERVER_IP: "192.168.1.50",
      WOL_TARGET_NAS_MAC: "11:22:33:44:55:66",
    });

    assert.equal(parsed.errors.length, 0);
    assert.equal(parsed.targets.length, 2);
    assert.deepEqual(parsed.targets[0], {
      id: "lan_server",
      label: "External Server",
      mac: "AA:BB:CC:DD:EE:FF",
      ip: "192.168.1.50",
      broadcast: "192.168.1.255",
      port: 9,
    });
  });

  it("creates a valid magic packet", () => {
    const packet = createMagicPacket("AA:BB:CC:DD:EE:FF");

    assert.equal(packet.length, 102);
    assert.ok(packet.subarray(0, 6).every((value) => value === 0xff));
    assert.deepEqual([...packet.subarray(6, 12)], [0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff]);
  });
});

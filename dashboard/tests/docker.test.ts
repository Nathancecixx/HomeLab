import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseDockerPsOutput } from "@/lib/docker";

describe("parseDockerPsOutput", () => {
  it("parses docker ps lines into container snapshots", () => {
    const output = [
      "nextcloud||nextcloud:apache||Up 5 minutes||0.0.0.0:8081->80/tcp",
      "kiwix||ghcr.io/kiwix/kiwix-serve:3.7.0||Exited (0) 1 day ago||",
    ].join("\n");

    assert.deepEqual(parseDockerPsOutput(output), [
      {
        name: "nextcloud",
        image: "nextcloud:apache",
        status: "Up 5 minutes",
        ports: "0.0.0.0:8081->80/tcp",
        up: true,
      },
      {
        name: "kiwix",
        image: "ghcr.io/kiwix/kiwix-serve:3.7.0",
        status: "Exited (0) 1 day ago",
        ports: "",
        up: false,
      },
    ]);
  });
});

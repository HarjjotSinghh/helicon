import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { handle } from "../src/server.js";

async function get(path) {
  const server = createServer(handle).listen(0);
  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`);
    return { status: res.status, body: await res.json() };
  } finally {
    server.close();
  }
}

test("GET /users returns users", async () => {
  const { status, body } = await get("/users");
  assert.equal(status, 200);
  assert.ok(body.users.length > 0);
});

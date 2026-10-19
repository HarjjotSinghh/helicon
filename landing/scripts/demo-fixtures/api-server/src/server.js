import { createServer } from "node:http";
import { users } from "./users.js";

export function handle(req, res) {
  const url = new URL(req.url, "http://localhost");
  if (req.method === "GET" && url.pathname === "/users") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ users }));
    return;
  }
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createServer(handle).listen(3000, () => console.log("listening on http://localhost:3000"));
}

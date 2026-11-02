// Recall Wallet Agent — zero-dependency static server for the chat demo.
// Usage: node app/server.js   then open http://localhost:8000
//
// SECURITY: this server serves ONLY index.html from its own directory.
// It never serves arbitrary paths, and it rejects any request that
// tries to escape the app directory (e.g. /../.testnet-key.json).
// Previously it joined req.url straight into a file path — that
// directory-traversal hole is fixed here and covered by
// scripts/security-check.mjs.
const http = require("http");
const fs = require("fs");
const path = require("path");

const APP_DIR = __dirname;
const ALLOWED = new Set(["index.html"]);

const server = http.createServer((req, res) => {
  let requested;
  try {
    requested = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }
  const name = requested === "/" ? "index.html" : path.basename(requested);
  if (!ALLOWED.has(name)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  const file = path.join(APP_DIR, name);
  if (!file.startsWith(APP_DIR + path.sep)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(data);
  });
});
server.listen(8000, () =>
  console.log("Recall Wallet Agent demo at http://localhost:8000")
);

// Harness only: serves a build + stand-in API in one process and runs the shipped e2e suite against it.
const http = require("http"), fs = require("fs"), path = require("path");
require("./demo-server.cjs");
const BUILD = process.argv[2];
const srv = http.createServer((req, res) => {
  let f = path.join(BUILD, req.url.split("?")[0]);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(BUILD, "index.html");
  res.writeHead(200, { "Content-Type": { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" }[path.extname(f)] || "text/html" });
  fs.createReadStream(f).pipe(res);
});
srv.listen(8795, async () => {
  const failed = await require("/home/claude/w5/e2e/full-flow.e2e.cjs").run("http://localhost:8795");
  process.exit(failed ? 1 : 0);
});

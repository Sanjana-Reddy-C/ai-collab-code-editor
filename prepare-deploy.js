// prepare-deploy.js
// Run once from your project root:   node prepare-deploy.js
// It rewrites hard-coded localhost URLs in the client so the SAME code works
// in development (via the Vite proxy) and in production (via Caddy).
// Safe to run more than once.

const fs = require("fs");
const path = require("path");

const CLIENT = path.join(__dirname, "client");

const files = [
  "editor.js",
  "index.html",
  "reset-password.html",
  ...fs.readdirSync(path.join(CLIENT, "dashboard"))
    .filter((f) => f.endsWith(".html"))
    .map((f) => path.join("dashboard", f)),
];

// [ exact text to find , replacement ]  (order matters)
const rules = [
  // Socket.IO client: io('http://localhost:3000', {...}) -> io({...})
  ["io('http://localhost:3000', {", "io({"],
  // Yjs websocket: ws://localhost:1234  ->  wss://<this-site>/yjs
  [
    "'ws://localhost:1234'",
    "(location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/yjs'",
  ],
  // Dashboard button used a separate server on port 8080
  ["http://127.0.0.1:8080/dashboard.html", "/dashboard/dashboard.html"],
  // Every other API / script URL becomes same-site (relative)
  ["http://localhost:3000", ""],
];

let changed = 0;
for (const rel of files) {
  const file = path.join(CLIENT, rel);
  if (!fs.existsSync(file)) continue;

  const before = fs.readFileSync(file, "utf8");
  let after = before;
  for (const [from, to] of rules) after = after.split(from).join(to);

  if (after !== before) {
    fs.writeFileSync(file, after);
    console.log("updated  client/" + rel.replace(/\\/g, "/"));
    changed++;
  }
}

console.log(changed ? `\nDone: ${changed} file(s) updated.` : "\nNothing to change (already prepared).");

// Report anything still pointing at localhost
const left = [];
for (const rel of files) {
  const file = path.join(CLIENT, rel);
  if (!fs.existsSync(file)) continue;
  fs.readFileSync(file, "utf8").split("\n").forEach((line, i) => {
    if (/localhost|127\.0\.0\.1/.test(line)) left.push(`client/${rel}:${i + 1}  ${line.trim()}`);
  });
}
if (left.length) {
  console.log("\nStill mentions localhost (check these):\n" + left.join("\n"));
} else {
  console.log("No localhost URLs left in the client pages.");
}
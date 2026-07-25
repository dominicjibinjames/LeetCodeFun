const fs = require("fs");
const p = ".env";
if (!fs.existsSync(p)) {
  console.log("NO_ENV");
  process.exit(0);
}
const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);
const keys = {};
for (const l of lines) {
  const m = l.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  keys[m[1]] = v.length > 0 ? "SET" : "EMPTY";
}
const needed = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "ENCRYPTION_KEY",
  "AUTH_GITHUB_ID",
  "AUTH_GITHUB_SECRET",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "GEMINI_API_KEY",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
  "CRON_SECRET",
  "APP_PASSPHRASE",
];
for (const k of needed) {
  console.log(k + ": " + (keys[k] || "MISSING"));
}

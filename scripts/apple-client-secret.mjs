// Builds the "client secret" Supabase needs for Sign in with Apple.
//
// Supabase does not take the .p8 key file. Apple's web sign-in wants a
// short-lived JWT signed by that key, and Supabase's Apple provider has a
// single "Secret Key" field for it. This makes that token locally, so the
// private key never leaves your machine and you don't have to paste it
// into a third-party generator website.
//
// Usage:
//   node scripts/apple-client-secret.mjs \
//     --team=YOURTEAMID \
//     --key-id=YOURKEYID \
//     --services-id=com.sorza.app.signin \
//     --p8=C:/path/to/AuthKey_YOURKEYID.p8
//
// The output is a secret. Paste it into Supabase (Authentication ->
// Providers -> Apple -> Secret Key) and nowhere else: not a chat, not a
// commit, not a screenshot.
//
// It EXPIRES. Apple caps a client secret at 6 months, and when it lapses
// Sign in with Apple fails for every user at once with no error in the
// app. This uses 180 days and prints the date, so put that in a calendar.
// Re-run this script and paste the new value to renew it.

import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

const APPLE_AUDIENCE = "https://appleid.apple.com";
// Apple's hard ceiling is 15777000 seconds (about 6 months). 180 days is
// under it with margin, so clock skew can't push the token over the limit.
const LIFETIME_SECONDS = 180 * 24 * 60 * 60;

function arg(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

const teamId = arg("team");
const keyId = arg("key-id");
const servicesId = arg("services-id");
const p8Path = arg("p8");

if (!teamId || !keyId || !servicesId || !p8Path) {
  fail(
    "Missing an argument. Usage:\n" +
      "  node scripts/apple-client-secret.mjs --team=TEAMID --key-id=KEYID \\\n" +
      "    --services-id=com.sorza.app.signin --p8=path/to/AuthKey_KEYID.p8",
  );
}

// The Services ID is what Apple calls the OAuth client id. Passing the
// app's bundle ID here instead is the most common mistake, and it
// produces a secret that looks fine and is rejected at sign-in.
if (servicesId === "com.sorza.app") {
  fail(
    "--services-id must be your Services ID (for example com.sorza.app.signin), not the app's bundle ID com.sorza.app.",
  );
}

let privateKey;
try {
  privateKey = readFileSync(p8Path, "utf8");
} catch {
  fail(`Couldn't read the key file at: ${p8Path}`);
}
if (!privateKey.includes("BEGIN PRIVATE KEY")) {
  fail("That file doesn't look like an Apple .p8 private key.");
}

const base64url = (value) => Buffer.from(value).toString("base64url");

const issuedAt = Math.floor(Date.now() / 1000);
const expiresAt = issuedAt + LIFETIME_SECONDS;

const header = base64url(JSON.stringify({ alg: "ES256", kid: keyId }));
const claims = base64url(
  JSON.stringify({
    iss: teamId,
    iat: issuedAt,
    exp: expiresAt,
    aud: APPLE_AUDIENCE,
    sub: servicesId,
  }),
);
const signingInput = `${header}.${claims}`;

const signer = createSign("sha256");
signer.update(signingInput);
// Raw r||s, not Node's default DER. JWT requires the raw form, and a DER
// signature is well-formed and rejected anyway.
const signature = signer.sign({ key: privateKey, dsaEncoding: "ieee-p1363" });

const secret = `${signingInput}.${base64url(signature)}`;
const expiryDate = new Date(expiresAt * 1000).toDateString();
const remindDate = new Date((expiresAt - 30 * 24 * 60 * 60) * 1000).toDateString();

console.error(`\nClient secret generated. It expires on ${expiryDate}.`);
console.error(`Put a reminder in your calendar for ${remindDate} to renew it.\n`);
console.error("Paste the line below into Supabase. It is a secret; keep it out of chat and git.\n");
// Only the secret goes to stdout, so it can be piped to a clipboard tool
// without the surrounding explanation.
console.log(secret);

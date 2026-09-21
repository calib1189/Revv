// Builds the "client secret" Supabase needs for Sign in with Apple.
//
// Supabase does not take the .p8 key file. Apple's web sign-in wants a
// short-lived JWT signed by that key, and Supabase's Apple provider has a
// single "Secret Key" field for it. This makes that token locally, so the
// private key never leaves your machine and you don't have to paste it
// into a third-party generator website.
//
// Easiest way: run it with no arguments and answer the questions.
//
//   node scripts/apple-client-secret.mjs
//
// It asks for your Team ID, the Key ID, the Services ID, and where the
// .p8 file is (you can drag the file into the terminal window to fill in
// the path). The result goes onto your CLIPBOARD, not the screen, so
// there is no long secret to select and no copy of it left in the
// terminal's scrollback. Then paste it into Supabase (Authentication ->
// Providers -> Apple -> Secret Key).
//
// Or pass everything up front:
//
//   node scripts/apple-client-secret.mjs --team=TEAMID --key-id=KEYID \
//     --services-id=com.sorza.app.signin --p8=C:/path/to/AuthKey_KEYID.p8
//
// Add --print to write the token to the terminal instead of copying it.
//
// The output is a secret. Paste it into Supabase and nowhere else: not a
// chat, not a commit, not a screenshot.
//
// It EXPIRES. Apple caps a client secret at 6 months, and when it lapses
// Sign in with Apple fails for every user at once with no error in the
// app. This uses 180 days and prints the date, so put that in a calendar.
// Re-run this script and paste the new value to renew it.

import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";

const APPLE_AUDIENCE = "https://appleid.apple.com";
const DEFAULT_SERVICES_ID = "com.sorza.app.signin";
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

/** A path dragged into a terminal arrives wrapped in quotes and often
 * with stray whitespace. Both are stripped rather than left to produce a
 * "couldn't read the file" error for a path that is actually right. */
function cleanPath(raw) {
  return raw.trim().replace(/^["']|["']$/g, "").trim();
}

async function collectInputs() {
  let teamId = arg("team");
  let keyId = arg("key-id");
  let servicesId = arg("services-id");
  let p8Path = arg("p8");
  if (p8Path) p8Path = cleanPath(p8Path);

  const missing = !teamId || !keyId || !servicesId || !p8Path;
  if (!missing) return { teamId, keyId, servicesId, p8Path };

  // Nobody is there to answer (a pipe, a script). Fail with the usage
  // rather than hang forever waiting on input that will never come.
  // --answers-from-stdin opts into piped answers, one per line in the
  // order asked; it exists so the prompt path can be tested at all.
  if (!process.stdin.isTTY && !process.argv.includes("--answers-from-stdin")) {
    fail(
      "Missing an argument. Usage:\n" +
        "  node scripts/apple-client-secret.mjs --team=TEAMID --key-id=KEYID \\\n" +
        "    --services-id=com.sorza.app.signin --p8=path/to/AuthKey_KEYID.p8\n" +
        "Or run it with no arguments in a terminal and answer the questions.",
    );
  }

  // Lines are pulled from an async iterator rather than with
  // rl.question(). question() only sees a line if it is already waiting
  // when the line arrives, so when several lines land at once (pasted
  // text, piped input) every answer after the first is silently dropped
  // and the script dies on an unsettled await. The iterator buffers.
  const rl = createInterface({ input: process.stdin, terminal: false });
  const lines = rl[Symbol.asyncIterator]();
  const ask = async (question) => {
    process.stderr.write(question);
    const { value, done } = await lines.next();
    return done ? "" : String(value);
  };

  console.error("\nSign in with Apple: client secret generator");
  console.error("Nothing you type here leaves this computer.\n");
  try {
    if (!teamId) {
      teamId = (await ask("Team ID (10 letters/numbers, from developer.apple.com > Membership): ")).trim();
    }
    if (!keyId) {
      keyId = (await ask("Key ID (10 characters, shown next to the key you created): ")).trim();
    }
    if (!servicesId) {
      const answer = (await ask(`Services ID [${DEFAULT_SERVICES_ID}]: `)).trim();
      servicesId = answer || DEFAULT_SERVICES_ID;
    }
    if (!p8Path) {
      p8Path = cleanPath(await ask("Path to the .p8 file (drag the file into this window, then press Enter): "));
    }
  } finally {
    rl.close();
  }
  return { teamId, keyId, servicesId, p8Path };
}

/** Puts text on the system clipboard. Returns false where there's no
 * built-in tool for it, and the caller falls back to printing. */
function copyToClipboard(text) {
  const command =
    process.platform === "win32" ? "clip" : process.platform === "darwin" ? "pbcopy" : null;
  if (!command) return false;
  const result = spawnSync(command, { input: text });
  return result.status === 0;
}

const { teamId, keyId, servicesId, p8Path } = await collectInputs();

if (!teamId || !keyId || !servicesId || !p8Path) {
  fail("Every answer is required. Run the script again.");
}

// The Services ID is what Apple calls the OAuth client id. Passing the
// app's bundle ID here instead is the most common mistake, and it
// produces a secret that looks fine and is rejected at sign-in.
if (servicesId === "com.sorza.app") {
  fail(
    "The Services ID must be your Services ID (for example com.sorza.app.signin), not the app's bundle ID com.sorza.app.",
  );
}

let privateKey;
try {
  privateKey = readFileSync(p8Path, "utf8");
} catch {
  fail(
    `Couldn't read the key file at: ${p8Path}\n` +
      "Check the path. Dragging the file into the terminal window fills it in correctly.",
  );
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
let signature;
try {
  signature = signer.sign({ key: privateKey, dsaEncoding: "ieee-p1363" });
} catch {
  fail("Couldn't sign with that key. Make sure it is the .p8 file downloaded from Apple, unmodified.");
}

const secret = `${signingInput}.${base64url(signature)}`;
const expiryDate = new Date(expiresAt * 1000).toDateString();
const remindDate = new Date((expiresAt - 30 * 24 * 60 * 60) * 1000).toDateString();

const wantsPrint = process.argv.includes("--print");
const copied = !wantsPrint && copyToClipboard(secret);

console.error(`\nClient secret generated. It expires on ${expiryDate}.`);
console.error(`Put a reminder in your calendar for ${remindDate} to renew it.\n`);

if (copied) {
  console.error("It is on your clipboard now. Paste it into Supabase:");
  console.error("  Authentication > Providers > Apple > Secret Key\n");
  console.error("Then copy something else so it doesn't sit on your clipboard.\n");
} else {
  if (!wantsPrint) console.error("Couldn't reach the clipboard, so it is printed below instead.");
  console.error("Paste the line below into Supabase. It is a secret; keep it out of chat and git.\n");
  // Only the secret goes to stdout, so it can be piped without the
  // surrounding explanation.
  console.log(secret);
}

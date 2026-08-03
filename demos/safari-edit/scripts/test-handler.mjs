// ============================================================
// The Safari Edit — handler confidence test
// ------------------------------------------------------------
// Exercises the REAL handler code (imported from api/enquiry.js) against the
// REAL Google Sheet + Mailchimp, without needing Resend's domain verified.
//
//   1. Pure mapping — name split, Message composition, column mapping
//   2. Google Sheet — append a synthetic row, read it back, assert every
//      column landed correctly, then delete the row (self-cleaning)
//   3. Mailchimp — confirm the FNAME merge field exists (read-only, no writes)
//   4. Handler control flow — honeypot / validation / capture branches,
//      driven through a real HTTP server (also tests raw-body parsing)
//
// Run: npm run test:handler
// ============================================================

import http from "node:http";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { google } from "googleapis";
import mailchimp from "@mailchimp/mailchimp_marketing";
import handler, {
  firstNameOf, composeMessage, buildRowValues, appendToSheet,
} from "../api/enquiry.js";

const envPath = join(import.meta.dirname, "..", ".env.local");
if (existsSync(envPath)) process.loadEnvFile(envPath);

let pass = 0, fail = 0;
function ok(name, cond, detail = "") {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${detail}`); }
}
const header = (t) => console.log(`\n── ${t} ──`);

// ------------------------------------------------------------
// 1. Pure mapping (no network)
// ------------------------------------------------------------
header("1. Pure mapping");
ok("firstNameOf('Jane & Sam') → 'Jane'", firstNameOf("Jane & Sam") === "Jane");
ok("firstNameOf('  Amara ') → 'Amara'", firstNameOf("  Amara ") === "Amara");
ok("composeMessage(partner, fbclid)", composeMessage("sam@x.com", "fb1") === "Fiancé's email: sam@x.com; fbclid: fb1");
ok("composeMessage(partner only)", composeMessage("sam@x.com", "") === "Fiancé's email: sam@x.com");
ok("composeMessage(none) → ''", composeMessage("", "") === "");
const rv = buildRowValues({
  id: "SE-X", date: "28/07/2026", time: "14:00", names: "Jane & Sam",
  email: "jane@x.com", messageCell: "m", consent: true,
  utm: { source: "meta", medium: "", campaign: "c", content: "" },
});
ok("first name = whole name", rv["first name"] === "Jane & Sam");
ok("last name empty", rv["last name"] === "");
ok("consent → 'Yes'", rv["marketing consent"] === "Yes");
ok("absent utm medium is '' not undefined", rv["utm medium"] === "");

// ------------------------------------------------------------
// 2. Google Sheet — real append / read-back / delete
// ------------------------------------------------------------
header("2. Google Sheet (real append → read back → delete)");
try {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.JWT({
    email: creds.client_email, key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const stamp = Math.random().toString(36).slice(2, 8).toUpperCase();

  const synthetic = buildRowValues({
    id: `TEST-${stamp}`, date: "28/07/2026", time: "14:00",
    names: `Jane & Sam ${stamp}`, email: `test-${stamp}@example.com`,
    messageCell: composeMessage(`partner-${stamp}@example.com`, `fb-${stamp}`),
    consent: true,
    utm: { source: "meta", medium: "paid", campaign: `camp-${stamp}`, content: "" },
  });

  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties(sheetId,title)" });
  const tabProps = meta.data.sheets[0].properties;
  const tab = tabProps.title;

  await appendToSheet(synthetic); // <-- the real shipping function

  const read = await sheets.spreadsheets.values.get({ spreadsheetId, range: tab });
  const rows = read.data.values || [];
  const cols = rows[0].map((h) => String(h).trim().toLowerCase());
  const idCol = cols.indexOf("enquiry id");
  let idx = -1, row = null;
  for (let i = rows.length - 1; i >= 1; i--) {
    if ((rows[i][idCol] || "") === `TEST-${stamp}`) { idx = i; row = rows[i]; break; }
  }
  ok("appended row found by Enquiry ID", idx !== -1);
  if (row) {
    const cell = (n) => row[cols.indexOf(n)] ?? "";
    ok("First name = whole name", cell("first name") === `Jane & Sam ${stamp}`);
    ok("Last name column empty", cell("last name") === "");
    ok("Email in Email column", cell("email") === `test-${stamp}@example.com`);
    ok("Message has fiancé email + fbclid",
      cell("message").includes(`partner-${stamp}@example.com`) && cell("message").includes(`fb-${stamp}`));
    ok("Marketing consent = Yes", cell("marketing consent") === "Yes");
    ok("UTM campaign in right column", cell("utm campaign") === `camp-${stamp}`);
    ok("Empty UTM content is blank, not 'undefined'", cell("utm content") === "");

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ deleteDimension: {
        range: { sheetId: tabProps.sheetId, dimension: "ROWS", startIndex: idx, endIndex: idx + 1 },
      } }] },
    });
    console.log(`     🧹 cleaned up test row ${idx + 1}`);
  }
} catch (err) {
  ok("Google Sheet integration", false, `— ${err.message}`);
}

// ------------------------------------------------------------
// 3. Mailchimp — confirm FNAME merge field exists (read-only)
// ------------------------------------------------------------
header("3. Mailchimp (read-only: FNAME merge field)");
try {
  mailchimp.setConfig({ apiKey: process.env.MAILCHIMP_API_KEY, server: process.env.MAILCHIMP_SERVER_PREFIX });
  const mf = await mailchimp.lists.getListMergeFields(process.env.MAILCHIMP_AUDIENCE_ID, { count: 50 });
  const tags = (mf.merge_fields || []).map((f) => f.tag);
  ok("audience has FNAME merge field (so addToMailchimp will be accepted)", tags.includes("FNAME"), `— found: ${tags.join(", ")}`);
} catch (err) {
  ok("Mailchimp merge-field check", false, `— ${err.message}`);
}

// ------------------------------------------------------------
// 4. Handler control flow over a real HTTP server
// ------------------------------------------------------------
header("4. Handler control flow (real HTTP server)");
function vercelRes(res) {
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(o)); return res; };
  return res;
}
const server = http.createServer((req, res) => { vercelRes(res); handler(req, res); });
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;
const post = (b) => fetch(base + "/api/enquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });

// The valid submission below writes a REAL row, because the Sheet is now the
// first step and runs before the email that fails. Tag it so we can find and
// delete it again — a test must not leave rows in the live Sheet.
const flowStamp = Math.random().toString(36).slice(2, 8).toUpperCase();

try {
  const hp = await post({ name: "Bot", email: "bot@x.com", company: "spam-co" });
  ok("honeypot filled → 200, no processing", hp.status === 200);

  const bad = await post({ name: "", email: "notanemail" });
  ok("missing name / bad email → 400", bad.status === 400);

  // Resend is unverified, so the notification fails — but the Sheet write
  // succeeded first, so the enquiry IS captured and the enquirer must not be
  // shown an error. This is the whole point of putting the Sheet first.
  const good = await post({
    name: `Jane & Sam ${flowStamp}`,
    email: `flow-${flowStamp}@example.com`,
    marketing_consent: false,
  });
  ok("valid → 200 even though the notification email fails (Sheet captured it)",
    good.status === 200, `— got ${good.status}`);

  const payload = await good.json().catch(() => ({}));
  ok("response carries an enquiry id", Boolean(payload.id), `— got ${JSON.stringify(payload)}`);
} catch (err) {
  ok("handler HTTP control flow", false, `— ${err.message}`);
} finally {
  server.close();
}

// --- Clean up the row the control-flow test just wrote ---
try {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.JWT({
    email: creds.client_email, key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties(sheetId,title)" });
  const tabProps = meta.data.sheets[0].properties;
  const read = await sheets.spreadsheets.values.get({ spreadsheetId, range: tabProps.title });
  const rows = read.data.values || [];
  const cols = rows[0].map((h) => String(h).trim().toLowerCase());
  const nameCol = cols.indexOf("first name");
  let idx = -1;
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][nameCol] || "").includes(flowStamp)) { idx = i; break; }
  }
  if (idx !== -1) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ deleteDimension: {
        range: { sheetId: tabProps.sheetId, dimension: "ROWS", startIndex: idx, endIndex: idx + 1 },
      } }] },
    });
    console.log(`     🧹 cleaned up control-flow row ${idx + 1}`);
  } else {
    ok("control-flow test row found for cleanup", false,
      `— row tagged ${flowStamp} not found; check the Sheet by hand`);
  }
} catch (err) {
  ok("control-flow row cleanup", false, `— ${err.message}`);
}

console.log(`\n${fail ? "❌" : "✅"}  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);

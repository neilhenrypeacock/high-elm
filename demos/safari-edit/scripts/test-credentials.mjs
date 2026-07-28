// ============================================================
// The Safari Edit — credential smoke test
// ------------------------------------------------------------
// Proves each of the three services works IN ISOLATION, before
// any form exists. Run it, read the summary, and you'll know
// exactly which credential is good and which needs fixing.
//
//   Resend        -> sends one real test email
//   Google Sheets -> reads the header row, appends a test row,
//                     then deletes that test row again
//   Mailchimp     -> connects and reports the audience name +
//                     member count (adds nobody)
//
// Run from the demos/safari-edit folder:
//   npm install
//   npm run test:credentials
//
// Nothing here writes to production data except the one Resend
// test email and a Sheet row that is deleted immediately after.
// ============================================================

import { existsSync } from "node:fs";
import { join } from "node:path";
import { Resend } from "resend";
import { google } from "googleapis";
import mailchimp from "@mailchimp/mailchimp_marketing";

// --- Load .env.local (sitting one level up, in demos/safari-edit) ---
const envPath = join(import.meta.dirname, "..", ".env.local");
if (existsSync(envPath)) {
  try {
    process.loadEnvFile(envPath);
  } catch (err) {
    console.error(`Could not read .env.local: ${err.message}`);
  }
} else {
  console.error(
    "No .env.local found next to package.json.\n" +
      "Copy .env.local.example to .env.local and fill it in first.\n"
  );
}

// --- Small helpers for tidy, readable output ---
const line = "─".repeat(52);
function header(title) {
  console.log(`\n${line}\n  ${title}\n${line}`);
}
function requireEnv(names) {
  const missing = names.filter((n) => !process.env[n] || !process.env[n].trim());
  if (missing.length) {
    throw new Error(`Missing environment variable(s): ${missing.join(", ")}`);
  }
}

// ------------------------------------------------------------
// 1. Resend — send a test email
// ------------------------------------------------------------
async function testResend() {
  requireEnv(["RESEND_API_KEY", "TEST_EMAIL_TO"]);
  const from =
    process.env.RESEND_FROM || "The Safari Edit <enquiries@thesafariedit.com>";
  const to = process.env.TEST_EMAIL_TO;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject: "The Safari Edit — credential test",
    text:
      "This is an automated test confirming Resend is configured correctly.\n" +
      "You can safely ignore or delete this email.",
  });

  if (error) {
    throw new Error(error.message || JSON.stringify(error));
  }
  return `Sent from ${from}\n     to ${to} (message id ${data.id}).\n     Check that inbox to confirm it arrived.`;
}

// ------------------------------------------------------------
// 2. Google Sheets — read header, append a row, delete it again
// ------------------------------------------------------------
async function testGoogleSheets() {
  requireEnv(["GOOGLE_SERVICE_ACCOUNT_JSON", "GOOGLE_SHEET_ID"]);

  let creds;
  try {
    creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } catch {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON. Paste the whole .json file " +
        "contents on one line, wrapped in single quotes."
    );
  }
  if (!creds.client_email || !creds.private_key) {
    throw new Error(
      "The service-account JSON is missing client_email or private_key."
    );
  }

  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // Identify the first tab (its title + numeric id, needed to delete a row).
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "properties.title,sheets.properties(sheetId,title)",
  });
  const firstSheet = meta.data.sheets?.[0]?.properties;
  if (!firstSheet) throw new Error("The spreadsheet has no sheets/tabs.");
  const tab = firstSheet.title;

  // Read the header row.
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!1:1`,
  });
  const headerRow = headerRes.data.values?.[0] || [];

  // Append a clearly-marked test row.
  const marker = "CREDENTIAL-TEST — safe to ignore, deleted automatically";
  const appendRes = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: tab,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [[marker]] },
  });

  // Work out which row it landed on (e.g. "Sheet1!A7:A7" -> 7).
  const updatedRange = appendRes.data.updates?.updatedRange || "";
  const cellRef = updatedRange.split("!").pop() || "";
  const rowMatch = cellRef.match(/\d+/);
  if (!rowMatch) {
    throw new Error(
      `Appended a row but could not read its position back ("${updatedRange}"). ` +
        "The test row may need removing by hand."
    );
  }
  const rowNumber = parseInt(rowMatch[0], 10); // 1-based

  // Delete that exact row so nothing is left behind.
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: firstSheet.sheetId,
              dimension: "ROWS",
              startIndex: rowNumber - 1, // 0-based, inclusive
              endIndex: rowNumber, // exclusive
            },
          },
        },
      ],
    },
  });

  const headerPreview = headerRow.length
    ? headerRow.join(" | ")
    : "(the header row is empty)";
  return (
    `Sheet "${meta.data.properties?.title}", tab "${tab}".\n` +
    `     Header row: ${headerPreview}\n` +
    `     Appended a test row (row ${rowNumber}) and deleted it again — all clean.`
  );
}

// ------------------------------------------------------------
// 3. Mailchimp — connect and report audience name + size
// ------------------------------------------------------------
async function testMailchimp() {
  requireEnv([
    "MAILCHIMP_API_KEY",
    "MAILCHIMP_SERVER_PREFIX",
    "MAILCHIMP_AUDIENCE_ID",
  ]);

  mailchimp.setConfig({
    apiKey: process.env.MAILCHIMP_API_KEY,
    server: process.env.MAILCHIMP_SERVER_PREFIX,
  });

  // Ping confirms the key + server prefix are valid.
  await mailchimp.ping.get();

  // Fetch the audience so we know we're pointed at the right list.
  const list = await mailchimp.lists.getList(process.env.MAILCHIMP_AUDIENCE_ID);
  const count =
    list?.stats?.member_count ?? "unknown number of";
  return `Connected. Audience "${list.name}" — ${count} members. (Added nobody.)`;
}

// ------------------------------------------------------------
// Runner
// ------------------------------------------------------------
function describeError(err) {
  // Mailchimp SDK errors hide the useful bit in .response.
  const body = err?.response?.body || err?.response?.text;
  if (body) {
    const detail = typeof body === "string" ? body : JSON.stringify(body);
    return `${err.message || "Error"} — ${detail}`;
  }
  return err?.message || String(err);
}

async function run(name, fn) {
  header(name);
  try {
    const detail = await fn();
    console.log(`  ✅ PASS — ${detail}`);
    return true;
  } catch (err) {
    console.log(`  ❌ FAIL — ${describeError(err)}`);
    return false;
  }
}

const results = {
  Resend: await run("1. Resend (test email)", testResend),
  "Google Sheets": await run("2. Google Sheets (read / append / delete)", testGoogleSheets),
  Mailchimp: await run("3. Mailchimp (connect + audience)", testMailchimp),
};

header("Summary");
for (const [service, ok] of Object.entries(results)) {
  console.log(`  ${ok ? "✅ PASS" : "❌ FAIL"}  ${service}`);
}

const allPassed = Object.values(results).every(Boolean);
console.log(
  allPassed
    ? "\nAll three services are working. Safe to build the form on top.\n"
    : "\nOne or more services failed above. Fix those before building the form.\n"
);
process.exit(allPassed ? 0 : 1);

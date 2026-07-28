// ============================================================
// The Safari Edit — enquiry submission handler (Vercel function)
// ------------------------------------------------------------
// Sequence (per the brief):
//   1. Accept POST. If the honeypot is filled -> succeed and stop.
//   2. Email Alex (notification). MUST succeed or the whole thing fails.
//   3. Email the enquirer (auto-reply).            } these three "fail soft":
//   4. Append a row to the Google Sheet.           } if any fails after step 2
//   5. If consent given, add to Mailchimp.         } succeeded, we still return
//                                                    success and log the error.
//
// All secrets come from environment variables — never the client.
// ============================================================

import { Resend } from "resend";
import { google } from "googleapis";
import mailchimp from "@mailchimp/mailchimp_marketing";

// --- Fixed brand addresses (copy, not secrets) ---
const NOTIFY_FROM = "The Safari Edit <enquiries@thesafariedit.com>";
const NOTIFY_TO = "alex@thesafariedit.com";
const NOTIFY_CC = "neil@highelmstudio.com";
const REPLY_FROM = "Alex, The Safari Edit <alex@thesafariedit.com>";
const REPLY_TO = "alex@thesafariedit.com";

// --- Read and normalise the incoming submission ---
async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  // Fallback: read the raw stream (e.g. some local runtimes)
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return {}; }
}

const clean = (v) => (typeof v === "string" ? v.trim() : v ? String(v) : "");
const isEmail = (v) => /.+@.+\..+/.test(v);
const isTrue = (v) => v === true || v === "true" || v === "yes" || v === "on" || v === "1";

// --- UK date/time strings ---
function ukParts() {
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", day: "2-digit", month: "2-digit", year: "numeric",
  }).format(now);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(now);
  const long = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(now);
  return { date, time, long };
}

function enquiryId(dateGB) {
  // dateGB is dd/mm/yyyy -> yyyymmdd
  const [d, m, y] = dateGB.split("/");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SE-${y}${m}${d}-${rand}`;
}

// ============================================================
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const body = await readBody(req);

  // 1) Honeypot — a real person never fills "company". Silently succeed.
  if (clean(body.company)) {
    return res.status(200).json({ ok: true });
  }

  // Basic server-side validation (client validates too).
  const names = clean(body.name);
  const email = clean(body.email);
  if (!names || !isEmail(email)) {
    return res.status(400).json({ ok: false, error: "Name and a valid email are required." });
  }

  const partner = clean(body.partner);
  const fbclid = clean(body.fbclid);
  const consent = isTrue(body.marketing_consent);
  const utm = {
    source: clean(body.utm_source),
    medium: clean(body.utm_medium),
    campaign: clean(body.utm_campaign),
    content: clean(body.utm_content),
  };
  const firstName = firstNameOf(names);
  const { date, time, long } = ukParts();
  const id = enquiryId(date);

  // Orphan fields (no Sheet column) go into the Message column, labelled.
  const messageCell = composeMessage(partner, fbclid);

  // ---------- 2) Notification to Alex (the gate) ----------
  const resend = new Resend(process.env.RESEND_API_KEY);
  const notifyLines = [
    `Names: ${names}`,
    `Email: ${email}`,
    partner ? `Fiancé's email: ${partner}` : null,
    `Marketing consent: ${consent ? "Yes" : "No"}`,
    utm.source ? `UTM source: ${utm.source}` : null,
    utm.medium ? `UTM medium: ${utm.medium}` : null,
    utm.campaign ? `UTM campaign: ${utm.campaign}` : null,
    utm.content ? `UTM content: ${utm.content}` : null,
    fbclid ? `fbclid: ${fbclid}` : null,
    `Enquiry ID: ${id}`,
    "",
    `Received: ${long} (UK)`,
  ].filter((l) => l !== null);
  const notifyText = notifyLines.join("\n");

  try {
    const { error } = await resend.emails.send({
      from: NOTIFY_FROM,
      to: [NOTIFY_TO],
      cc: [NOTIFY_CC],
      subject: `New enquiry — ${names}`,
      text: notifyText,
      html: `<pre style="font:14px/1.6 -apple-system,Segoe UI,Arial,sans-serif;white-space:pre-wrap;margin:0;">${escapeHtml(notifyText)}</pre>`,
    });
    if (error) throw new Error(error.message || JSON.stringify(error));
  } catch (err) {
    console.error("[enquiry] Notification email FAILED — submission rejected:", err);
    return res.status(502).json({ ok: false, error: "notification_failed" });
  }

  // Everything below is best-effort. A failure here still returns success.
  const softFailures = [];

  // ---------- 3) Auto-reply to the enquirer ----------
  try {
    await resend.emails.send({
      from: REPLY_FROM,
      to: [email],
      replyTo: REPLY_TO,
      subject: "Thanks — I've got your enquiry",
      text: AUTO_REPLY_TEXT,
      html: autoReplyHtml(),
    });
  } catch (err) {
    console.error("[enquiry] Auto-reply email failed:", err);
    softFailures.push("auto-reply");
  }

  // ---------- 4) Append to the Google Sheet ----------
  try {
    await appendToSheet(buildRowValues({ id, date, time, names, email, messageCell, consent, utm }));
  } catch (err) {
    console.error("[enquiry] Google Sheet append failed:", err);
    softFailures.push("sheet");
  }

  // ---------- 5) Mailchimp (only if consent) ----------
  if (consent) {
    try {
      await addToMailchimp(email, firstName);
    } catch (err) {
      console.error("[enquiry] Mailchimp add failed:", err);
      softFailures.push("mailchimp");
    }
  }

  if (softFailures.length) {
    console.warn(`[enquiry] ${id} succeeded with soft failures:`, softFailures.join(", "));
  }
  return res.status(200).json({ ok: true, id });
}

// ============================================================
// Helpers
// ============================================================
function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

// --- Pure mapping helpers (exported so they can be tested with real data) ---
export function firstNameOf(names) {
  const n = String(names || "").trim();
  return n.split(/\s+/)[0] || n;
}

// Orphan fields (no Sheet column) go into the Message column, labelled.
export function composeMessage(partner, fbclid) {
  const parts = [];
  if (partner) parts.push(`Fiancé's email: ${partner}`);
  if (fbclid) parts.push(`fbclid: ${fbclid}`);
  return parts.join("; ");
}

// Map an enquiry to Sheet columns, keyed by (lowercased) header name.
export function buildRowValues({ id, date, time, names, email, messageCell, consent, utm }) {
  return {
    "enquiry id": id,
    "date received": date,
    "time received": time,
    "first name": names, // whole name in First name (per decision)
    "last name": "",
    email,
    phone: "",
    message: messageCell,
    "marketing consent": consent ? "Yes" : "No",
    "utm source": utm.source,
    "utm medium": utm.medium,
    "utm campaign": utm.campaign,
    "utm content": utm.content,
  };
}

// --- Google Sheets: map values to the LIVE header row, by name ---
export async function appendToSheet(valuesByHeader) {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties(title)",
  });
  const tab = meta.data.sheets?.[0]?.properties?.title;
  if (!tab) throw new Error("No sheet/tab found");

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!1:1`,
  });
  const header = headerRes.data.values?.[0] || [];

  // Build the row in the exact order of the live header, matched by name.
  const row = header.map((h) => {
    const key = String(h).trim().toLowerCase();
    return key in valuesByHeader ? valuesByHeader[key] : "";
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: tab,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
}

// --- Mailchimp: email + first name only, tagged, "already a member" is fine ---
export async function addToMailchimp(email, firstName) {
  mailchimp.setConfig({
    apiKey: process.env.MAILCHIMP_API_KEY,
    server: process.env.MAILCHIMP_SERVER_PREFIX,
  });
  try {
    await mailchimp.lists.addListMember(process.env.MAILCHIMP_AUDIENCE_ID, {
      email_address: email,
      status: "subscribed",
      merge_fields: { FNAME: firstName },
      tags: ["source-paid-landing-page", "the-safari-edit"],
    });
  } catch (err) {
    const title = err?.response?.body?.title || "";
    if (title === "Member Exists") return; // treat as success
    throw err;
  }
}

// ============================================================
// Auto-reply content (copy.md section 1, verbatim)
// ============================================================
const AUTO_REPLY_TEXT = `Thanks for getting in touch — good to hear from you.

I'm Alex, Senior Travel Specialist here. I pick up every enquiry myself, so I'll be the one planning your trip and on the end of the phone while you're away. No handovers, no call centre.

I'll come back to you within a working day. When we speak, I'll ask roughly when you're thinking of going, who's coming, and what you'd like to get out of it. Don't worry about having answers ready — most people don't at this stage, and that conversation is where it all starts to take shape anyway.

If anything changes before then, or you'd rather just talk it through sooner, hit reply and it comes straight to me.

Alex
Senior Travel Specialist, The Safari Edit`;

function autoReplyHtml() {
  const paras = [
    "Thanks for getting in touch &mdash; good to hear from you.",
    "I'm Alex, Senior Travel Specialist here. I pick up every enquiry myself, so I'll be the one planning your trip and on the end of the phone while you're away. No handovers, no call centre.",
    "I'll come back to you within a working day. When we speak, I'll ask roughly when you're thinking of going, who's coming, and what you'd like to get out of it. Don't worry about having answers ready &mdash; most people don't at this stage, and that conversation is where it all starts to take shape anyway.",
    "If anything changes before then, or you'd rather just talk it through sooner, hit reply and it comes straight to me.",
  ].map((p) => `<p style="margin:0 0 18px;">${p}</p>`).join("");

  return `<!doctype html><html><body style="margin:0;background:#FFF7EC;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">I'll be in touch tomorrow&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>
  <div style="max-width:560px;margin:0 auto;padding:40px 28px;font:16px/1.6 Georgia,'Times New Roman',serif;color:#4A433C;">
    <div style="width:44px;height:2px;background:#FCA520;margin:0 0 28px;"></div>
    ${paras}
    <p style="margin:26px 0 0;font-weight:bold;color:#1A1714;">Alex</p>
    <p style="margin:0;font:12px/1.5 Arial,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#7A7066;">Senior Travel Specialist, The Safari Edit</p>
  </div>
</body></html>`;
}

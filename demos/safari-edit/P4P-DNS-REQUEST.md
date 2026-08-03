# DNS request for P4P — email sending for go.thesafariedit.com

Draft below, ready to send. Three records, all on the `mail` subdomain.
Nothing here touches the existing website or the current email setup.

---

**Subject:** thesafariedit.com — three DNS records for the landing page email

Hi [name],

Thanks for sorting the `go` CNAME and the Meta verification TXT — both are
confirmed live at our end, and the landing page is now resolving.

One last DNS request, and then we're done. The landing page needs to send two
transactional emails when someone enquires: a notification to Alex, and an
automatic acknowledgement to the person enquiring. We're sending those through
Resend, which needs three records added to prove we're allowed to send.

**Important:** all three sit on the `mail.thesafariedit.com` subdomain, not the
root. That's deliberate — it keeps this entirely separate from the existing
Microsoft 365 email on the root domain. **Please don't modify or replace the
existing root-domain SPF record** (`v=spf1 include:spf.protection.outlook.com
include:spf.stackmail.com -all`). It should be left exactly as it is.

The three records to add:

**1. DKIM — signs our outgoing mail**
- Type: `TXT`
- Host/Name: `resend._domainkey.mail`
- Value: `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC2sfD9FE32U0cO7CfjnyCk0KpxSY7+WdAf1VeuhiA/od9sZ7kvkRcKrBZHQTT2SXh15dX/SDXQKC75msGhR8oT+BPWb2mx85j0Co9Od29nQONaZz7QOOP3/fh3doC4qJp+UB0m0K/tv5Fli8+xy8WMx0zZ8ifOC7bMGigeGApa8wIDAQAB`
- TTL: default / automatic

**2. SPF for the subdomain**
- Type: `TXT`
- Host/Name: `send.mail`
- Value: `v=spf1 include:amazonses.com ~all`
- TTL: default / automatic

**3. MX for bounce handling**
- Type: `MX`
- Host/Name: `send.mail`
- Value: `feedback-smtp.eu-west-1.amazonses.com`
- Priority: `10`
- TTL: default / automatic

Three notes in case your DNS panel behaves differently:

- There's a wildcard A record on the domain (any subdomain currently resolves to
  the StackCP server on 185.151.30.209). **Please leave that as it is** — I'm
  only flagging it so nothing above looks like it conflicts. It doesn't: a
  wildcard only answers address lookups, and all three records above are TXT and
  MX, which are looked up separately. There is no TXT or MX on `mail` or
  `send.mail` today, so nothing is being replaced.

- If the panel wants fully-qualified names rather than relative ones, they are
  `resend._domainkey.mail.thesafariedit.com`, `send.mail.thesafariedit.com` and
  `send.mail.thesafariedit.com` respectively. Some panels append the domain
  automatically, so please check you don't end up with the domain twice.
- The DKIM value is one long unbroken string. If the panel splits it or adds
  quotes, that's usually fine, but please paste it in whole rather than
  retyping it.

Could you let me know once they're in? I can confirm verification at my end
within a few minutes of them propagating.

Thanks again,
Neil

---

## For Neil, not for the email

**Why the subdomain.** The root domain runs the live Microsoft 365 / Stackmail
email. Adding a sending service to the root would mean editing the existing SPF
record — the record that decides whether Alex's normal email gets delivered.
Get it wrong and you break real email. The subdomain is a separate namespace, so
the worst case is that the landing page emails fail while everything else is
untouched.

**What I did in Resend.** The account's free plan allows one domain, and the slot
held an unverified `thesafariedit.com` entry from 28 July that had never been
used to send anything and had no DNS records placed for it. I removed it and
added `mail.thesafariedit.com` in its place (region eu-west-1, matching the
original). If you ever want the root back, re-adding it is a few seconds' work —
but it would need the paid plan to hold both.

**Confirming it worked.** Once P4P reply, tell me and I'll re-check the status
via the Resend API. It flips from `not_started` to `verified` on its own once the
records resolve — usually minutes, occasionally a few hours.

**The DKIM key is not a secret.** It's the public half of the signing pair; it is
published in DNS by design. Safe to email.

**Checked so there isn't a third request.** Before sending this I went through
everything else that could conceivably need a DNS record:

| Thing | State | Action |
|---|---|---|
| `go` CNAME → Vercel | live | none — done by P4P |
| Meta domain verification TXT | live on root | none — covers `go.` as a subdomain |
| Resend DKIM / SPF / MX | missing | **this request** |
| DMARC | root has `p=none; sp=none; adkim=r; aspf=r` | none needed — `sp=none` means the subdomain inherits a no-action policy, and relaxed alignment means our subdomain DKIM and SPF align correctly |
| Existing root email (Microsoft 365) | live, MX → outlook | none — must not be touched |
| Wildcard A record → StackCP | live, answers every subdomain | none — wildcards answer address lookups only, so they don't shadow our TXT/MX |

So this should be the last DNS ask for this project.

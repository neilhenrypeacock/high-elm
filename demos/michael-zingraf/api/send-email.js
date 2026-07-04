export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, name, conversationHistory = [], propertiesShown = [] } = req.body || {};
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email required' });

  const PROPERTIES = [
    { id: 1, name: "Villa Les Pins",        location: "La Californie, Cannes",    price: "€6,800,000",  desc: "A mature pine-framed villa in Cannes' most prestigious residential quarter. Panoramic sea views and a pool terrace that catches the afternoon light until dusk.", url: "https://www.michaelzingraf.com" },
    { id: 2, name: "Penthouse La Croisette", location: "Central Cannes",           price: "€4,200,000",  desc: "Top-floor penthouse on the Croisette's most coveted address. Terrace overlooking the Bay of Cannes. Exceptional rental yield potential.",                     url: "https://www.michaelzingraf.com" },
    { id: 3, name: "Villa Cap Soleil",       location: "Cap d'Antibes",            price: "€12,500,000", desc: "A Belle Époque residence on the western slope of the Cap, 80 metres from the sea. Renovated to the highest standard, with direct Mediterranean access.",       url: "https://www.michaelzingraf.com" },
    { id: 4, name: "Bastide des Oliviers",   location: "Mougins",                  price: "€2,900,000",  desc: "A restored Provençal bastide set in 5,000m² of mature olive groves, fifteen minutes from Cannes. Pool, guest house, complete privacy.",                      url: "https://www.michaelzingraf.com" },
    { id: 5, name: "Villa San Remo",         location: "Villefranche-sur-Mer",     price: "€8,400,000",  desc: "Commanding position above the Bay of Villefranche. Ten minutes from Nice, twelve from Monaco.",                                                               url: "https://www.michaelzingraf.com" },
  ];

  let profile = {
    buyerName: name || null,
    buyerSummary: 'A prospective buyer exploring luxury property opportunities on the French Riviera with Michaël Zingraf Real Estate.',
    topPropertyIds: propertiesShown.length ? propertiesShown : [1, 3, 5],
    marketInsight: 'The Côte d\'Azur has attracted the world\'s most discerning buyers for over 150 years — a market structurally protected by mountains and sea, with finite supply and consistent international demand. Property values increased 15–20% between 2019 and 2023, and transactions exceeded €9 billion in 2024.\n\nMichaël Zingraf Real Estate has been the leading luxury agency on the Riviera since 1977, and the exclusive Christie\'s International Real Estate affiliate for Provence-Alpes-Côte d\'Azur. Nearly five decades of market knowledge, relationships, and discretion.',
    recommendedLocation: 'the Côte d\'Azur',
  };

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 700,
        system: `You are a Michaël Zingraf Real Estate property expert. Analyze a buyer conversation and return ONLY a valid JSON object — no markdown, no explanation, just JSON — with these exact fields:
{
  "buyerName": string or null,
  "buyerSummary": "2-3 warm, specific sentences describing this buyer's situation, needs, and what they're looking for on the Côte d'Azur",
  "topPropertyIds": [array of 1-3 integers from 1-5, most relevant to this buyer],
  "marketInsight": "Two paragraphs of expert insight about their preferred location and what makes it right for them. Authoritative, warm, specific. Separate paragraphs with \\n\\n.",
  "recommendedLocation": "the main location area recommended in conversation",
  "buyerMotivation": "their primary motivation — or null if not stated",
  "concerns": "any concerns or questions the buyer raised — or null",
  "specialContext": "any personal context, nationality, timeline, or additional notes — or null"
}`,
        messages: [{
          role: 'user',
          content: `Conversation (last 10 messages): ${JSON.stringify(conversationHistory.slice(-10))}\n\nAvailable properties: ${JSON.stringify(PROPERTIES.map(p => ({ id: p.id, name: p.name, location: p.location })))}\n\nProperties shown in conversation: ${JSON.stringify(propertiesShown)}`,
        }],
      }),
    });

    const aiData = await aiRes.json();
    const raw = (aiData.content?.[0]?.text || '{}').replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(raw);
    profile = { ...profile, ...parsed };
  } catch (_) {
    // Fall through with defaults
  }

  const matchedProperties = (profile.topPropertyIds || [1, 3, 5])
    .slice(0, 3)
    .map(id => PROPERTIES.find(p => p.id === id))
    .filter(Boolean);

  const propCardsHtml = matchedProperties.map(p => `
    <tr><td style="background:#ffffff; padding:0 40px 16px 40px;">
      <table width="100%" cellpadding="0" cellspacing="0"
        style="border:1px solid rgba(27,58,92,0.10); border-top:2px solid #C9A96E;">
        <tr><td style="padding:20px 22px 18px 22px;">
          <p style="font-family:'Montserrat',Arial,sans-serif; font-size:8px; font-weight:500;
            letter-spacing:0.18em; text-transform:uppercase; color:#C9A96E; margin:0 0 6px 0;">
            ${p.location}
          </p>
          <p style="font-family:'Cormorant Garamond',Georgia,serif; font-size:20px; font-weight:400;
            color:#1B3A5C; margin:0 0 10px 0;">${p.name}</p>
          <p style="font-family:'Montserrat',Arial,sans-serif; font-size:13px; line-height:1.65;
            color:#7a7068; margin:0 0 16px 0;">${p.desc}</p>
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="font-family:'Montserrat',Arial,sans-serif; font-size:15px;
              font-weight:600; color:#1B3A5C;">${p.price}</td>
            <td align="right"><a href="${p.url}"
              style="font-family:'Montserrat',Arial,sans-serif; font-size:9px; font-weight:600;
              letter-spacing:0.12em; text-transform:uppercase; color:#1B3A5C; text-decoration:none;">
              View on michaelzingraf.com →</a></td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your Zingraf property summary</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0; padding:0; background:#F8F5F0; font-family:'Montserrat',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F5F0; padding:40px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background:#ffffff; border-radius:2px; overflow:hidden; box-shadow:0 2px 24px rgba(27,58,92,0.08);">

  <!-- HEADER -->
  <tr><td style="background:#1B3A5C; padding:32px 40px; text-align:center;">
    <p style="font-family:'Cormorant Garamond',Georgia,serif; font-size:24px; font-weight:400;
      color:#ffffff; margin:0 0 4px 0;">Michaël Zingraf</p>
    <p style="font-family:'Montserrat',Arial,sans-serif; font-size:9px; font-weight:500;
      letter-spacing:0.18em; text-transform:uppercase; color:rgba(255,255,255,0.45); margin:0;">
      French Riviera · Est. 1977
    </p>
  </td></tr>

  <!-- OPENING NOTE -->
  <tr><td style="background:#ffffff; padding:36px 40px 28px 40px;">
    <p style="font-family:'Montserrat',Arial,sans-serif; font-size:8px; font-weight:600;
      letter-spacing:0.2em; text-transform:uppercase; color:#C9A96E; margin:0 0 16px 0;">
      A note from Michaël Zingraf Real Estate
    </p>
    <p style="font-family:'Cormorant Garamond',Georgia,serif; font-size:17px; line-height:1.75;
      color:#1B3A5C; margin:0 0 14px 0;">
      Thank you for taking the time to explore what's possible on the Côte d'Azur.
      The right property here is not just a home — it is a way of life that people
      return to, generation after generation.
    </p>
    <p style="font-family:'Cormorant Garamond',Georgia,serif; font-size:17px; line-height:1.75;
      color:#7a7068; margin:0;">
      A member of our team will be in touch to continue the conversation. Here is
      everything we covered — the properties that stood out for you and our perspective
      on the market.
    </p>
  </td></tr>

  <!-- BUYER PROFILE -->
  <tr><td style="background:#ffffff; padding:0 40px 32px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="background:#F8F5F0; border-left:3px solid #C9A96E; padding:18px 22px;">
      <p style="font-family:'Montserrat',Arial,sans-serif; font-size:8px; font-weight:600;
        letter-spacing:0.2em; text-transform:uppercase; color:#C9A96E; margin:0 0 10px 0;">
        What we understood
      </p>
      <p style="font-family:'Cormorant Garamond',Georgia,serif; font-size:16px; line-height:1.7;
        color:#1B3A5C; margin:0 0 12px 0;">
        ${profile.buyerSummary}
      </p>
      ${profile.buyerMotivation ? `<p style="font-family:'Montserrat',Arial,sans-serif; font-size:11px; color:#7a7068; margin:0 0 4px 0;"><strong style="color:#1B3A5C;">Motivation:</strong> ${profile.buyerMotivation}</p>` : ''}
      ${profile.concerns ? `<p style="font-family:'Montserrat',Arial,sans-serif; font-size:11px; color:#7a7068; margin:0 0 4px 0;"><strong style="color:#1B3A5C;">Questions raised:</strong> ${profile.concerns}</p>` : ''}
      ${profile.specialContext ? `<p style="font-family:'Montserrat',Arial,sans-serif; font-size:11px; color:#7a7068; margin:0;"><strong style="color:#1B3A5C;">Notes:</strong> ${profile.specialContext}</p>` : ''}
    </td></tr>
    </table>
  </td></tr>

  <!-- Divider -->
  <tr><td style="background:#ffffff; padding:0 40px;">
    <div style="border-top:1px solid rgba(27,58,92,0.10);">&nbsp;</div>
  </td></tr>

  <!-- PROPERTIES HEADER -->
  <tr><td style="background:#ffffff; padding:32px 40px 8px 40px;">
    <p style="font-family:'Montserrat',Arial,sans-serif; font-size:8px; font-weight:600;
      letter-spacing:0.2em; text-transform:uppercase; color:#C9A96E; margin:0 0 6px 0;">
      Selected for you
    </p>
    <p style="font-family:'Cormorant Garamond',Georgia,serif; font-size:24px; font-weight:300;
      color:#1B3A5C; margin:0 0 24px 0; font-style:italic;">
      Properties worth your attention
    </p>
  </td></tr>

  <!-- PROPERTY CARDS -->
  <table width="100%" cellpadding="0" cellspacing="0">${propCardsHtml}</table>

  <!-- WHY THIS LOCATION -->
  <tr><td style="background:#1B3A5C; padding:40px 40px 36px 40px;">
    <p style="font-family:'Montserrat',Arial,sans-serif; font-size:8px; font-weight:600;
      letter-spacing:0.2em; text-transform:uppercase; color:rgba(201,169,110,0.9);
      margin:0 0 16px 0;">Why ${profile.recommendedLocation}</p>
    <p style="font-family:'Cormorant Garamond',Georgia,serif; font-size:24px; font-weight:300;
      line-height:1.4; color:#ffffff; margin:0 0 22px 0; font-style:italic;
      border-left:2px solid #C9A96E; padding-left:22px;">
      "Over 150 years of continuous demand from the world's
      highest-net-worth individuals. That is not a trend.
      It is a structural fact."
    </p>
    <p style="font-family:'Cormorant Garamond',Georgia,serif; font-size:16px; line-height:1.8;
      color:rgba(255,255,255,0.82); margin:0 0 16px 0;">
      ${(profile.marketInsight || '').split('\n\n')[0] || ''}
    </p>
    <p style="font-family:'Cormorant Garamond',Georgia,serif; font-size:16px; line-height:1.8;
      color:rgba(255,255,255,0.82); margin:0;">
      ${(profile.marketInsight || '').split('\n\n')[1] || ''}
    </p>
  </td></tr>

  <!-- WHAT HAPPENS NEXT -->
  <tr><td style="background:#ffffff; padding:36px 40px 36px 40px;">
    <p style="font-family:'Montserrat',Arial,sans-serif; font-size:8px; font-weight:600;
      letter-spacing:0.2em; text-transform:uppercase; color:#C9A96E; margin:0 0 6px 0;">
      What happens next
    </p>
    <p style="font-family:'Cormorant Garamond',Georgia,serif; font-size:24px; font-weight:300;
      color:#1B3A5C; margin:0 0 8px 0; font-style:italic;">
      Your Zingraf adviser
    </p>
    <p style="font-family:'Cormorant Garamond',Georgia,serif; font-size:15px; line-height:1.7;
      color:#7a7068; margin:0 0 24px 0;">
      One of our advisers will be in touch shortly — not a pitch, just a proper conversation
      about the properties and locations that interest you. We can arrange viewings, introduce
      you to the right legal and tax specialists, and guide you through every step of the
      buying process.
    </p>
  </td></tr>

  <!-- ADVISER CARD -->
  <tr><td style="background:#ffffff; padding:0 40px 36px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="width:52px; vertical-align:top;">
        <div style="width:44px; height:44px; border-radius:50%; background:#1B3A5C;
          font-family:'Cormorant Garamond',Georgia,serif; font-size:20px; font-style:italic;
          color:#ffffff; text-align:center; line-height:44px;">Z</div>
      </td>
      <td style="padding-left:16px; vertical-align:top;">
        <p style="font-family:'Cormorant Garamond',Georgia,serif; font-size:19px;
          color:#1B3A5C; margin:0 0 3px 0;">Michaël Zingraf Real Estate</p>
        <p style="font-family:'Montserrat',Arial,sans-serif; font-size:9px; font-weight:500;
          letter-spacing:0.12em; text-transform:uppercase; color:#7a7068;
          margin:0 0 12px 0;">Christie's International Real Estate · Côte d'Azur</p>
        <p style="font-family:'Cormorant Garamond',Georgia,serif; font-size:15px;
          line-height:1.7; color:#7a7068; margin:0 0 14px 0;">
          Since 1977, Michaël Zingraf Real Estate has been the most trusted name in luxury
          property on the French Riviera. As exclusive Christie's International Real Estate
          affiliate for Provence-Alpes-Côte d'Azur, we bring nearly five decades of market
          knowledge, discretion, and an international network of the most discerning buyers
          and sellers.
        </p>
        <p style="font-family:'Montserrat',Arial,sans-serif; font-size:10px; margin:0;">
          <a href="https://www.michaelzingraf.com"
            style="color:#1B3A5C; text-decoration:none;">michaelzingraf.com</a>
        </p>
      </td>
    </tr>
    </table>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#F8F5F0; padding:24px 40px; text-align:center;
    border-top:1px solid rgba(27,58,92,0.10);">
    <p style="font-family:'Cormorant Garamond',Georgia,serif; font-size:16px;
      color:#1B3A5C; margin:0 0 6px 0;">Michaël Zingraf</p>
    <p style="font-family:'Montserrat',Arial,sans-serif; font-size:10px; color:#7a7068;
      margin:0 0 5px 0;">
      <a href="https://www.michaelzingraf.com"
        style="color:#7a7068; text-decoration:none;">michaelzingraf.com</a>
    </p>
    <p style="font-family:'Montserrat',Arial,sans-serif; font-size:9px; font-weight:300;
      color:#7a7068; margin:0;">
      You're receiving this because you used the Michaël Zingraf AI Concierge
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Michaël Zingraf Real Estate <onboarding@resend.dev>',
      to: [email],
      subject: 'Your Zingraf property summary',
      html,
    }),
  });

  if (!resendRes.ok) {
    const err = await resendRes.text();
    return res.status(502).json({ error: 'Email send failed', detail: err });
  }

  // Notify team with buyer briefing
  const notifyHtml = `<div style="font-family:Montserrat,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1B3A5C;">
    <p style="font-size:13px;color:#7a7068;margin-bottom:16px;">New lead from the Michaël Zingraf AI Concierge</p>
    <h2 style="font-size:18px;margin:0 0 16px;">${profile.buyerName ? profile.buyerName : 'New buyer enquiry'}</h2>
    <p style="font-size:13px;margin:0 0 8px;"><strong>Email:</strong> ${email}</p>
    <p style="font-size:13px;margin:0 0 8px;"><strong>Recommended location:</strong> ${profile.recommendedLocation || 'See summary'}</p>
    <p style="font-size:13px;margin:0 0 8px;"><strong>Matched properties:</strong> ${matchedProperties.map(p => p.name).join(', ') || 'See summary'}</p>
    ${profile.buyerMotivation ? `<p style="font-size:13px;margin:0 0 8px;"><strong>Motivation:</strong> ${profile.buyerMotivation}</p>` : ''}
    ${profile.concerns ? `<p style="font-size:13px;margin:0 0 8px;"><strong>Concerns:</strong> ${profile.concerns}</p>` : ''}
    ${profile.specialContext ? `<p style="font-size:13px;margin:0 0 16px;"><strong>Special notes:</strong> ${profile.specialContext}</p>` : '<p style="margin:0 0 16px;"></p>'}
    <div style="background:#F8F5F0;border-radius:8px;padding:16px;font-size:13px;line-height:1.6;margin-bottom:16px;">
      <strong>Buyer summary:</strong><br>${profile.buyerSummary}
    </div>
    <div style="font-size:13px;line-height:1.6;">
      <strong>Market insight from conversation:</strong><br>${profile.marketInsight}
    </div>
    <p style="font-size:12px;color:#7a7068;margin-top:24px;">Buyer's full summary has been sent to ${email}</p>
  </div>`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Zingraf AI Concierge <onboarding@resend.dev>',
      to: ['concierge@michaelzingraf.com'],
      subject: `New buyer lead — ${profile.buyerName || email}`,
      html: notifyHtml,
    }),
  });

  return res.status(200).json({ ok: true });
}

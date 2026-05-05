export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, name, conversationHistory = [], propertiesShown = [], profile: chatProfile = null } = req.body || {};
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email required' });

  // TEMPLATE: paste the same property/listing objects here as in chat.html's const L
  const PROPERTIES = [

  ];

  // AI-extracted profile (populated below)
  let profile = {
    buyerName: name || null,
    buyerSummary: 'A prospective [customer type] exploring [product/service] with [BRAND_NAME].',
    topPropertyIds: propertiesShown.length ? propertiesShown : [1, 2, 3],
    marketInsight: '[Default market insight paragraph one.]\n\n[Default market insight paragraph two.]',
    recommendedLocation: '[recommended area or category]',
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
        // TEMPLATE: update this system prompt to match the brand and conversation context
        system: `You are an expert adviser for [BRAND_NAME]. Analyze a buyer conversation and return ONLY a valid JSON object — no markdown, no explanation, just JSON — with these exact fields:
{
  "buyerName": string or null,
  "buyerSummary": "2-3 warm, specific sentences describing this person's situation and what they're looking for",
  "topPropertyIds": [array of 1-3 integers matching ids in the inventory, most relevant to this buyer],
  "marketInsight": "Two paragraphs of expert insight about their preferred area/category. Authoritative, warm, specific. Separate paragraphs with \\n\\n.",
  "recommendedLocation": "the main area or category recommended in conversation",
  "buyerMotivation": "their primary motivation — or null if not stated",
  "concerns": "any concerns or questions raised — or null",
  "specialContext": "any personal context, timeline, or additional notes — or null"
}`,
        messages: [{
          role: 'user',
          content: `Conversation (last 10 messages): ${JSON.stringify(conversationHistory.slice(-10))}\n\nAvailable inventory: ${JSON.stringify(PROPERTIES.map(p => ({ id: p.id, name: p.name, location: p.location })))}\n\nItems shown in conversation: ${JSON.stringify(propertiesShown)}\n\nConversation profile (structured): ${JSON.stringify(chatProfile)}`,
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

  const matchedItems = (profile.topPropertyIds || [1, 2, 3])
    .slice(0, 3)
    .map(id => PROPERTIES.find(p => p.id === id))
    .filter(Boolean);

  // TEMPLATE: update card HTML — property fields, link text, colours — to match your inventory structure
  const itemCardsHtml = matchedItems.map(p => `
    <tr><td style="background:#ffffff; padding:0 40px 16px 40px;">
      <table width="100%" cellpadding="0" cellspacing="0"
        style="border:1px solid rgba(27,58,92,0.10); border-top:2px solid var(--accent, #C9A96E);">
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
              View listing →</a></td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>
  `).join('');

  // Format the structured chatProfile for the notification email
  function formatChatProfile(cp) {
    if (!cp) return '';
    const lines = [];
    if (cp.who?.type) {
      const whoLabels = { solo: 'Solo', couple: 'Couple', friends: 'Friends', family: 'Family', family_dog: 'Family + Dog' };
      let whoStr = whoLabels[cp.who.type] || cp.who.type;
      const adults = cp.who.adults || 0;
      const kids = Array.isArray(cp.who.kids) ? cp.who.kids.length : (cp.who.kids || 0);
      if (adults || kids) whoStr += ` (${[adults && adults + ' adults', kids && kids + ' kids', cp.who.dogs && cp.who.dogs + ' dogs'].filter(Boolean).join(', ')})`;
      lines.push(`<p style="font-size:13px;margin:0 0 6px;"><strong>Who:</strong> ${whoStr}</p>`);
    }
    if (cp.when?.mode) {
      let whenStr = cp.when.mode;
      if (cp.when.mode === 'exact' && cp.when.exactStart) whenStr = cp.when.exactStart + (cp.when.exactEnd ? ' – ' + cp.when.exactEnd : '');
      else if (cp.when.mode === 'approximate' && cp.when.month) whenStr = cp.when.month + (cp.when.duration ? ', ' + cp.when.duration + ' nights' : '');
      else if (cp.when.mode === 'flexible' && cp.when.season) whenStr = cp.when.season + (cp.when.duration ? ', ~' + cp.when.duration + ' nights' : '');
      lines.push(`<p style="font-size:13px;margin:0 0 6px;"><strong>When:</strong> ${whenStr}</p>`);
    }
    if (cp.where?.destinations?.length || cp.where?.openToSuggestions) {
      const dests = cp.where.destinations || [];
      let whereStr = dests.join(', ');
      if (cp.where.openToSuggestions) whereStr += (whereStr ? ' + ' : '') + 'open to suggestions';
      lines.push(`<p style="font-size:13px;margin:0 0 6px;"><strong>Where:</strong> ${whereStr}</p>`);
    }
    if (cp.priorities?.length) {
      lines.push(`<p style="font-size:13px;margin:0 0 6px;"><strong>Priorities:</strong> ${cp.priorities.join(', ')}</p>`);
    }
    if (cp.budget?.range || cp.budget?.exact) {
      const budgetStr = cp.budget.exact ? '£' + (cp.budget.exact / 1000).toFixed(0) + 'k' : cp.budget.range;
      lines.push(`<p style="font-size:13px;margin:0 0 6px;"><strong>Budget:</strong> ${budgetStr}</p>`);
    }
    if (cp.notes) {
      lines.push(`<p style="font-size:13px;margin:0 0 6px;"><strong>Notes:</strong> ${cp.notes}</p>`);
    }
    return lines.join('');
  }

  // TEMPLATE: update all [BRAND_NAME], [BRAND_TAGLINE], [BRAND_URL] references in the email HTML below
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your [BRAND_NAME] summary</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0; padding:0; background:#F8F5F0; font-family:'Montserrat',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F5F0; padding:40px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background:#ffffff; border-radius:2px; overflow:hidden; box-shadow:0 2px 24px rgba(27,58,92,0.08);">

  <!-- HEADER -->
  <tr><td style="background:#1B3A5C; padding:32px 40px; text-align:center;">
    <p style="font-family:'Cormorant Garamond',Georgia,serif; font-size:24px; font-weight:400;
      color:#ffffff; margin:0 0 4px 0;">[BRAND_NAME]</p>
    <p style="font-family:'Montserrat',Arial,sans-serif; font-size:9px; font-weight:500;
      letter-spacing:0.18em; text-transform:uppercase; color:rgba(255,255,255,0.45); margin:0;">
      [BRAND_TAGLINE]
    </p>
  </td></tr>

  <!-- OPENING NOTE -->
  <tr><td style="background:#ffffff; padding:36px 40px 28px 40px;">
    <p style="font-family:'Montserrat',Arial,sans-serif; font-size:8px; font-weight:600;
      letter-spacing:0.2em; text-transform:uppercase; color:#C9A96E; margin:0 0 16px 0;">
      A note from [BRAND_NAME]
    </p>
    <p style="font-family:'Cormorant Garamond',Georgia,serif; font-size:17px; line-height:1.75;
      color:#1B3A5C; margin:0 0 14px 0;">
      Thank you for taking the time to explore what's possible.
    </p>
    <p style="font-family:'Cormorant Garamond',Georgia,serif; font-size:17px; line-height:1.75;
      color:#7a7068; margin:0;">
      A member of our team will be in touch to continue the conversation. Here is
      everything we covered — the options that stood out for you and our perspective.
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

  <!-- ITEMS HEADER -->
  <tr><td style="background:#ffffff; padding:32px 40px 8px 40px;">
    <p style="font-family:'Montserrat',Arial,sans-serif; font-size:8px; font-weight:600;
      letter-spacing:0.2em; text-transform:uppercase; color:#C9A96E; margin:0 0 6px 0;">
      Selected for you
    </p>
    <p style="font-family:'Cormorant Garamond',Georgia,serif; font-size:24px; font-weight:300;
      color:#1B3A5C; margin:0 0 24px 0; font-style:italic;">
      Options worth your attention
    </p>
  </td></tr>

  <!-- ITEM CARDS -->
  <table width="100%" cellpadding="0" cellspacing="0">${itemCardsHtml}</table>

  <!-- MARKET INSIGHT -->
  <tr><td style="background:#1B3A5C; padding:40px 40px 36px 40px;">
    <p style="font-family:'Montserrat',Arial,sans-serif; font-size:8px; font-weight:600;
      letter-spacing:0.2em; text-transform:uppercase; color:rgba(201,169,110,0.9);
      margin:0 0 16px 0;">Why ${profile.recommendedLocation}</p>
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
      Your [BRAND_NAME] adviser
    </p>
    <p style="font-family:'Cormorant Garamond',Georgia,serif; font-size:15px; line-height:1.7;
      color:#7a7068; margin:0 0 24px 0;">
      One of our team will be in touch shortly — not a pitch, just a proper conversation
      about what interests you. We can guide you through every step of the process.
    </p>
  </td></tr>

  <!-- ADVISER CARD -->
  <tr><td style="background:#ffffff; padding:0 40px 36px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="width:52px; vertical-align:top;">
        <!-- TEMPLATE: replace [X] with adviser/brand initial -->
        <div style="width:44px; height:44px; border-radius:50%; background:#1B3A5C;
          font-family:'Cormorant Garamond',Georgia,serif; font-size:20px; font-style:italic;
          color:#ffffff; text-align:center; line-height:44px;">[X]</div>
      </td>
      <td style="padding-left:16px; vertical-align:top;">
        <p style="font-family:'Cormorant Garamond',Georgia,serif; font-size:19px;
          color:#1B3A5C; margin:0 0 3px 0;">[BRAND_NAME]</p>
        <p style="font-family:'Montserrat',Arial,sans-serif; font-size:9px; font-weight:500;
          letter-spacing:0.12em; text-transform:uppercase; color:#7a7068;
          margin:0 0 12px 0;">[BRAND_TAGLINE]</p>
        <!-- TEMPLATE: update brand bio below -->
        <p style="font-family:'Cormorant Garamond',Georgia,serif; font-size:15px;
          line-height:1.7; color:#7a7068; margin:0 0 14px 0;">
          [One or two sentences about the brand — credentials, years in business, what makes them the right choice.]
        </p>
        <p style="font-family:'Montserrat',Arial,sans-serif; font-size:10px; margin:0;">
          <a href="[BRAND_URL]"
            style="color:#1B3A5C; text-decoration:none;">[BRAND_URL]</a>
        </p>
      </td>
    </tr>
    </table>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#F8F5F0; padding:24px 40px; text-align:center;
    border-top:1px solid rgba(27,58,92,0.10);">
    <p style="font-family:'Cormorant Garamond',Georgia,serif; font-size:16px;
      color:#1B3A5C; margin:0 0 6px 0;">[BRAND_NAME]</p>
    <p style="font-family:'Montserrat',Arial,sans-serif; font-size:10px; color:#7a7068;
      margin:0 0 5px 0;">
      <a href="[BRAND_URL]"
        style="color:#7a7068; text-decoration:none;">[BRAND_URL]</a>
    </p>
    <p style="font-family:'Montserrat',Arial,sans-serif; font-size:9px; font-weight:300;
      color:#7a7068; margin:0;">
      You're receiving this because you used the [BRAND_NAME] AI Concierge
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  // TEMPLATE: update from address (must be verified in Resend) and subject line
  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: '[BRAND_NAME] <onboarding@resend.dev>', // TEMPLATE: replace with verified sender e.g. 'Brand AI <hello@brand.com>'
      to: [email],
      subject: 'Your [BRAND_NAME] summary',
      html,
    }),
  });

  if (!resendRes.ok) {
    const err = await resendRes.text();
    return res.status(502).json({ error: 'Email send failed', detail: err });
  }

  // Notify team — TEMPLATE: replace [NOTIFY_EMAIL] with the client's team inbox
  const chatProfileHtml = formatChatProfile(chatProfile);
  const notifyHtml = `<div style="font-family:Montserrat,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1B3A5C;">
    <p style="font-size:13px;color:#7a7068;margin-bottom:16px;">New lead from the [BRAND_NAME] AI Concierge</p>
    <h2 style="font-size:18px;margin:0 0 16px;">${profile.buyerName ? profile.buyerName : 'New enquiry'}</h2>
    <p style="font-size:13px;margin:0 0 8px;"><strong>Email:</strong> ${email}</p>
    <p style="font-size:13px;margin:0 0 8px;"><strong>Recommended:</strong> ${profile.recommendedLocation || 'See summary'}</p>
    <p style="font-size:13px;margin:0 0 8px;"><strong>Matched items:</strong> ${matchedItems.map(p => p.name).join(', ') || 'See summary'}</p>
    ${profile.buyerMotivation ? `<p style="font-size:13px;margin:0 0 8px;"><strong>Motivation:</strong> ${profile.buyerMotivation}</p>` : ''}
    ${profile.concerns ? `<p style="font-size:13px;margin:0 0 8px;"><strong>Concerns:</strong> ${profile.concerns}</p>` : ''}
    ${profile.specialContext ? `<p style="font-size:13px;margin:0 0 16px;"><strong>Notes:</strong> ${profile.specialContext}</p>` : '<p style="margin:0 0 16px;"></p>'}
    ${chatProfileHtml ? `
    <div style="background:#F8F5F0;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#C9A96E;margin:0 0 10px;">Structured profile</p>
      ${chatProfileHtml}
    </div>` : ''}
    <div style="background:#F8F5F0;border-radius:8px;padding:16px;font-size:13px;line-height:1.6;margin-bottom:16px;">
      <strong>AI summary:</strong><br>${profile.buyerSummary}
    </div>
    <div style="font-size:13px;line-height:1.6;">
      <strong>Market insight:</strong><br>${profile.marketInsight}
    </div>
    <p style="font-size:12px;color:#7a7068;margin-top:24px;">Full summary sent to ${email}</p>
  </div>`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: '[BRAND_NAME] AI Concierge <onboarding@resend.dev>', // TEMPLATE: update sender
      to: ['[NOTIFY_EMAIL]'], // TEMPLATE: replace with client's team email
      subject: `New lead — ${profile.buyerName || email}`,
      html: notifyHtml,
    }),
  });

  return res.status(200).json({ ok: true });
}

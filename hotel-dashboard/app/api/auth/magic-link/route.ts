import { NextRequest, NextResponse } from 'next/server';
import { sendMagicLink } from '@/lib/magic-link';
import { allowRequest, clientIp } from '@/lib/rate-limit';

// Public endpoint that triggers an email send → rate-limited per IP AND per
// target address, so neither a bot burst nor repeated sends to one victim
// mailbox get through. (Supabase Auth has its own send limits behind this.)
export async function POST(request: NextRequest) {
  if (!allowRequest(`magic-ip:${clientIp(request)}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many attempts — try again in a minute.' }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  if (!allowRequest(`magic-email:${email}`, 3, 10 * 60_000)) {
    return NextResponse.json({ error: 'Too many links requested for this address — try again later.' }, { status: 429 });
  }

  const origin = new URL(request.url).origin;

  try {
    await sendMagicLink(email, origin);
  } catch {
    return NextResponse.json({ error: 'Could not send the link. Try again.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

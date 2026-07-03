import { NextRequest, NextResponse } from 'next/server';
import { sendMagicLink } from '@/lib/magic-link';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  const origin = new URL(request.url).origin;

  try {
    await sendMagicLink(email, origin);
  } catch {
    return NextResponse.json({ error: 'Could not send the link. Try again.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

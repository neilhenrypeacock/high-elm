import { describe, it, expect, afterEach } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { isAdmin, isAdminEmail } from '../lib/admin';
import { allowRequest } from '../lib/rate-limit';

// The other two gate-touching functions the 4 Aug review found untested
// (finding 6): the admin allowlist that guards every editorial write path, and
// the limiter that stands in front of the public POST endpoints.

const ORIGINAL_ADMIN_EMAILS = process.env.ADMIN_EMAILS;

afterEach(() => {
  if (ORIGINAL_ADMIN_EMAILS === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = ORIGINAL_ADMIN_EMAILS;
});

describe('isAdminEmail — the founder allowlist', () => {
  it('rejects an empty, null or undefined email', () => {
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail('')).toBe(false);
  });

  it('rejects an ordinary member', () => {
    delete process.env.ADMIN_EMAILS;
    expect(isAdminEmail('member@example.com')).toBe(false);
  });

  it('accepts a listed address regardless of case or padding', () => {
    process.env.ADMIN_EMAILS = 'founder@example.com, second@example.com';
    expect(isAdminEmail('founder@example.com')).toBe(true);
    expect(isAdminEmail('FOUNDER@Example.com')).toBe(true);
    expect(isAdminEmail('second@example.com')).toBe(true);
  });

  it('does not match on a substring or a lookalike domain', () => {
    process.env.ADMIN_EMAILS = 'founder@example.com';
    expect(isAdminEmail('founder@example.com.evil.net')).toBe(false);
    expect(isAdminEmail('notfounder@example.com')).toBe(false);
    expect(isAdminEmail('founder@example.co')).toBe(false);
  });

  it('falls back to the built-in founder list when the env var is unset', () => {
    delete process.env.ADMIN_EMAILS;
    expect(isAdminEmail('neil@highelmstudio.com')).toBe(true);
  });

  it('reads the email off a session user', () => {
    process.env.ADMIN_EMAILS = 'founder@example.com';
    expect(isAdmin({ email: 'founder@example.com' } as User)).toBe(true);
    expect(isAdmin({ email: 'member@example.com' } as User)).toBe(false);
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin({} as User)).toBe(false);
  });
});

describe('allowRequest — the public-endpoint limiter', () => {
  // Keys are unique per test: the window map is module-level state shared by
  // every test in the file, exactly as it is shared by every request hitting
  // one warm lambda.
  it('allows exactly `limit` requests inside the window, then refuses', () => {
    const key = `test:allow:${Math.random()}`;
    expect(allowRequest(key, 3, 60_000)).toBe(true);
    expect(allowRequest(key, 3, 60_000)).toBe(true);
    expect(allowRequest(key, 3, 60_000)).toBe(true);
    expect(allowRequest(key, 3, 60_000)).toBe(false);
  });

  it('counts each key separately, so one client cannot lock out another', () => {
    const a = `test:a:${Math.random()}`;
    const b = `test:b:${Math.random()}`;
    expect(allowRequest(a, 1, 60_000)).toBe(true);
    expect(allowRequest(a, 1, 60_000)).toBe(false);
    expect(allowRequest(b, 1, 60_000)).toBe(true);
  });

  it('starts a fresh window once the old one has expired', async () => {
    const key = `test:window:${Math.random()}`;
    expect(allowRequest(key, 1, 10)).toBe(true);
    expect(allowRequest(key, 1, 10)).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(allowRequest(key, 1, 10)).toBe(true);
  });
});

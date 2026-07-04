// Verification-only: proves /auth/callback establishes a session via the
// token-hash flow. Generates a real magic-link token (no email), hits the local
// callback, and checks it redirects to /dashboard AND sets an sb-* auth cookie.
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
}

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data, error } = await admin.auth.admin.generateLink({
  type: 'magiclink',
  email: 'nhpeacock@gmail.com',
});
if (error) throw error;

const tokenHash = data.properties.hashed_token;
const target = `http://localhost:3200/auth/callback?token_hash=${tokenHash}&type=magiclink`;

const res = await fetch(target, { redirect: 'manual' });
const location = res.headers.get('location');
const setCookie = res.headers.get('set-cookie') || '';
const hasAuthCookie = /sb-[a-z0-9]+-auth-token/.test(setCookie);

console.log(`status:        ${res.status}`);
console.log(`redirect ->    ${location}`);
console.log(`auth cookie:   ${hasAuthCookie ? 'SET (session established)' : 'MISSING'}`);
console.log(hasAuthCookie && location && location.includes('/dashboard')
  ? 'RESULT: PASS — token-hash flow logs the user in'
  : 'RESULT: FAIL');

import { createClient } from '@supabase/supabase-js';

// Sends a Supabase Auth magic link. Shared by the Stripe webhook (auto-send
// right after checkout) and the /login page (manual resend). Uses the anon
// key deliberately — signInWithOtp is the public GoTrue auth endpoint, not a
// data write, so it doesn't need the service-role key.
export async function sendMagicLink(email: string, origin: string) {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) throw error;
}

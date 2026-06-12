/**
 * Mint a real Supabase auth session for a member email and emit the
 * `Cookie:` header string the SSR app expects (sb-<ref>-auth-token...).
 *
 * Proof harness ONLY (not shipped/imported by the app). Uses the service
 * role to generate a magic-link OTP, verifies it to obtain a genuine
 * access+refresh token pair, then drives @supabase/ssr's createServerClient
 * so the cookie is serialized in EXACTLY the chunked base64 format the
 * middleware reads back. Prints the Cookie header to stdout.
 *
 * Usage: node scripts/mint-session.mjs <email>
 */
import { createClient } from '@supabase/supabase-js';
import { createServerClient, serializeCookieHeader } from '@supabase/ssr';

const email = process.argv[2];
if (!email) { console.error('usage: mint-session.mjs <email>'); process.exit(1); }

const URL = process.env.PUBLIC_SUPABASE_URL;
const ANON = process.env.PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !ANON || !SERVICE) {
  console.error('missing PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

// 1. Generate a magic-link OTP for the email (service-role).
const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
  type: 'magiclink',
  email,
});
if (linkErr) { console.error('generateLink failed:', linkErr.message); process.exit(1); }
const otp = linkData?.properties?.email_otp;
if (!otp) { console.error('no email_otp in generateLink response'); process.exit(1); }

// 2. Verify the OTP to get a genuine session (access + refresh token).
const anonClient = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: verifyData, error: verifyErr } = await anonClient.auth.verifyOtp({
  email, token: otp, type: 'email',
});
if (verifyErr) { console.error('verifyOtp failed:', verifyErr.message); process.exit(1); }
const session = verifyData?.session;
if (!session) { console.error('no session from verifyOtp'); process.exit(1); }

// 3. Drive @supabase/ssr to serialize the session into cookies in the exact
//    chunked base64 format the app reads. Capture what it would Set-Cookie.
const captured = [];
const ssr = createServerClient(URL, ANON, {
  cookies: {
    getAll() { return []; },
    setAll(toSet) {
      for (const { name, value, options } of toSet) {
        captured.push(serializeCookieHeader(name, value, options ?? {}));
      }
    },
  },
});
await ssr.auth.setSession({
  access_token: session.access_token,
  refresh_token: session.refresh_token,
});

// 4. Emit a Cookie: header (name=value pairs) from the captured Set-Cookie.
const pairs = captured.map((sc) => sc.split(';')[0]).filter(Boolean);
if (pairs.length === 0) { console.error('no cookies captured'); process.exit(1); }
process.stdout.write(pairs.join('; '));

/**
 * POST /api/admin/crew/invite   (admin/staff — requireAdmin)
 *
 * Create (or re-confirm) a LIMITED "crew" account and email them a magic-link
 * sign-in invite. Crew (migration 0068) can log in on their own phone and use
 * ONLY the pack-house ops tools (handoff + cooler) — never member PII,
 * financials, pricing, or campaigns. The whole gate is customers.role='crew'
 * (middleware CREW_ALLOWED_PREFIXES + is_ops_caller RLS on the ops tables).
 *
 * Body (application/json): { name: string, email: string }
 *
 * Upsert semantics (NEVER clobber a real account):
 *   - email exists with role IN ('admin','staff','member') → REFUSE (409). We
 *     do not silently downgrade a real customer/admin into crew.
 *   - email exists with role='crew'                        → update contact_name.
 *   - email is new                                         → INSERT a fresh
 *     customers row: customer_type='employee', role='crew'.
 *
 * Email: best-effort via Resend (mirrors weekly-email/send). If Resend isn't
 * configured (keys absent) we STILL create the row and return ok with a note
 * that the email wasn't sent (the admin can share the login URL by hand).
 *
 * Returns JSON:
 *   { ok: true,  note, crew: { id, name, email } }
 *   { ok: false, error }
 *
 * Authorization: isSameOriginPost() (CSRF) + requireAdmin() (admin/staff only —
 * crew can't reach /admin/crew at all). The customers write runs through the
 * cookie-aware RLS client; the admin_all_customers policy (0017) lets it insert.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { RESEND_API_KEY, RESEND_FROM_EMAIL } from 'astro:env/server';

export const prerender = false;

const PORTAL_BASE_URL = 'https://csa.tinyseedfarm.com';
// Crew land on the login page; after auth, middleware routes crew to their home
// (/admin/handoff). Passing next keeps the intent explicit through the round-trip.
const CREW_LOGIN_URL = `${PORTAL_BASE_URL}/login?next=${encodeURIComponent('/admin/handoff')}`;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

const InviteSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name.').max(120, 'Name is too long.'),
  email: z.email('Enter a valid email.').max(254, 'Email is too long.'),
});

/** Minimal HTML-escape for the name interpolated into the invite email. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Send the bilingual (EN/ES) crew invite via Resend. Never throws. */
async function sendInvite(to: string, name: string): Promise<boolean> {
  const safeName = esc(name);
  const subject = 'Tiny Seed Farm — pack crew login / acceso al equipo';
  const html = `
    <div style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:0 auto;color:#1a2e22;line-height:1.5">
      <h1 style="font-size:20px;margin:0 0 12px">Welcome to the Tiny Seed pack crew</h1>
      <p>Hi ${safeName}, you've been given access to the Tiny Seed pack-house tools
        (shift handoff + cooler board) on your phone.</p>
      <p style="margin:20px 0">
        <a href="${CREW_LOGIN_URL}"
           style="display:inline-block;background:#166534;color:#fff;text-decoration:none;
                  padding:12px 20px;border-radius:8px;font-weight:600">
          Sign in / Iniciar sesión
        </a>
      </p>
      <p>Use this email address to sign in — we'll send you a one-time code. No password needed.</p>
      <hr style="border:none;border-top:1px solid #e2e8e0;margin:24px 0" />
      <h2 style="font-size:18px;margin:0 0 12px">Bienvenido al equipo de Tiny Seed</h2>
      <p>Hola ${safeName}, tienes acceso a las herramientas del packing (entrega de turno
        y refrigerador) desde tu teléfono.</p>
      <p>Inicia sesión con este correo — te enviaremos un código de un solo uso. Sin contraseña.</p>
      <p style="color:#64766c;font-size:13px;margin-top:24px">
        Tiny Seed Farm · 257 Zeigler Rd, Rochester, PA
      </p>
    </div>`;
  const text = [
    `Welcome to the Tiny Seed pack crew, ${name}.`,
    `Sign in on your phone: ${CREW_LOGIN_URL}`,
    `Use this email address — we'll send a one-time code (no password).`,
    ``,
    `Bienvenido al equipo de Tiny Seed, ${name}.`,
    `Inicia sesión: ${CREW_LOGIN_URL}`,
    `Usa este correo — te enviaremos un código de un solo uso (sin contraseña).`,
  ].join('\n');

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: RESEND_FROM_EMAIL, to: [to], subject, html, text }),
    });
    return resp.ok;
  } catch (e) {
    console.error('[api/admin/crew/invite] Resend send failed:', e instanceof Error ? e.message : 'network');
    return false;
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return json({ ok: false, error: 'forbidden' }, 403);
  }
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid request body.' }, 400);
  }

  const parsed = InviteSchema.safeParse(body);
  if (!parsed.success) {
    return json({ ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' }, 400);
  }
  const name = parsed.data.name;
  const email = parsed.data.email.toLowerCase();

  // Look up an existing row by email (CITEXT column → case-insensitive).
  const { data: existing, error: lookupErr } = await locals.supabase
    .from('customers')
    .select('id, role')
    .eq('email', email)
    .maybeSingle()
    .overrideTypes<{ id: string; role: 'member' | 'admin' | 'staff' | 'crew' }, { merge: false }>();

  if (lookupErr) {
    console.error('[api/admin/crew/invite] lookup failed:', lookupErr.message);
    return json({ ok: false, error: 'Could not check that email. Try again.' }, 500);
  }

  let crewId: string;

  if (existing) {
    if (existing.role !== 'crew') {
      // NEVER convert a real member/admin/staff account into crew.
      return json(
        {
          ok: false,
          error: `That email already belongs to a ${existing.role} account, so it can't be added as crew. Use a different email.`,
        },
        409,
      );
    }
    // Already crew → refresh their display name.
    const { error: updErr } = await locals.supabase
      .from('customers')
      .update({ contact_name: name, is_active: true })
      .eq('id', existing.id);
    if (updErr) {
      console.error('[api/admin/crew/invite] update failed:', updErr.message);
      return json({ ok: false, error: 'Could not update that crew member.' }, 500);
    }
    crewId = existing.id;
  } else {
    const { data: inserted, error: insErr } = await locals.supabase
      .from('customers')
      .insert({
        contact_name: name,
        email,
        customer_type: 'employee',
        role: 'crew',
        is_active: true,
      })
      .select('id')
      .single();
    if (insErr || !inserted) {
      console.error('[api/admin/crew/invite] insert failed:', insErr?.message);
      return json({ ok: false, error: 'Could not create that crew member.' }, 500);
    }
    crewId = inserted.id;
  }

  // Best-effort invite email. A missing Resend config never blocks the row.
  let note: string;
  if (RESEND_API_KEY && RESEND_FROM_EMAIL) {
    const sent = await sendInvite(email, name);
    note = sent
      ? 'Crew member added and invite email sent.'
      : 'Crew member added, but the invite email failed to send. Share the login link manually.';
  } else {
    note = 'Crew member added. Email isn’t configured, so no invite was sent — ask them to open the portal and sign in with this email.';
  }

  return json({ ok: true, note, crew: { id: crewId, name, email } });
};

/**
 * Unit tests for the campaign webhook + team-copy logic (Features 1 & 3).
 *
 * No Vitest in this repo, so we run as a plain Node script:
 *   npx tsx src/lib/campaign.test.ts
 *
 * Exits 0 if all assertions pass, 1 otherwise.
 *
 * The load-bearing pieces here:
 *   - applyResendEvent: must advance a recipient's status monotonically
 *     (delivered → opened → clicked), bump the parent campaign's counter
 *     exactly once per advance, and NEVER double-count a duplicate or
 *     out-of-order event.
 *   - CAMPAIGN_TEAM_COPY: the two internal addresses are pinned so a
 *     future edit is a deliberate, reviewed change.
 *
 * We drive applyResendEvent against a tiny in-memory fake that mimics the
 * subset of the supabase-js builder it touches (.from().select()/.update()
 * .eq().maybeSingle()). This keeps the test hermetic — no network, no DB.
 */
import {
  applyResendEvent,
  CAMPAIGN_TEAM_COPY,
  type ResendWebhookEvent,
} from './campaign.ts';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types.ts';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed += 1;
      console.log(`  ok  ${name}`);
    })
    .catch((err) => {
      failed += 1;
      console.log(`  FAIL ${name}`);
      console.log(`       ${err instanceof Error ? err.message : String(err)}`);
    });
}

function assertEqual<T>(actual: T, expected: T, msg?: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${msg ?? 'assertEqual failed'}\n       expected: ${JSON.stringify(expected)}\n       actual:   ${JSON.stringify(actual)}`
    );
  }
}

// ─── In-memory fake supabase client ─────────────────────────────────
//
// Tables modeled: campaign_recipients (keyed by id, queried by
// resend_email_id) + campaigns (keyed by id). Implements exactly the
// builder chain applyResendEvent uses.

interface RecipientRow {
  id: string;
  campaign_id: string;
  customer_id: string;
  email: string;
  status: string;
  resend_email_id: string | null;
  last_event_at: string | null;
}
interface CampaignRow {
  id: string;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  total_complained: number;
}

function makeFake(seed: {
  recipients: RecipientRow[];
  campaigns: CampaignRow[];
}) {
  const recipients = seed.recipients;
  const campaigns = seed.campaigns;

  function table(name: string) {
    // Each builder call starts fresh with its own filter/selection state.
    const state: {
      op: 'select' | 'update';
      columns: string;
      patch: Record<string, unknown>;
      filters: Array<{ col: string; val: unknown }>;
    } = { op: 'select', columns: '*', patch: {}, filters: [] };

    function rowsFor(): Array<Record<string, unknown>> {
      const all =
        name === 'campaign_recipients'
          ? (recipients as unknown as Array<Record<string, unknown>>)
          : (campaigns as unknown as Array<Record<string, unknown>>);
      return all.filter((r) => state.filters.every((f) => r[f.col] === f.val));
    }

    const builder: Record<string, unknown> = {
      select(cols: string) {
        state.op = 'select';
        state.columns = cols;
        return builder;
      },
      update(patch: Record<string, unknown>) {
        state.op = 'update';
        state.patch = patch;
        return builder;
      },
      eq(col: string, val: unknown) {
        state.filters.push({ col, val });
        return builder;
      },
      maybeSingle() {
        // Real code chains `.maybeSingle().overrideTypes()` AND also
        // `await .maybeSingle()` directly — so return a thenable that
        // carries overrideTypes.
        const compute = () => {
          if (state.op === 'update') {
            for (const r of rowsFor()) Object.assign(r, state.patch);
            return { data: null, error: null };
          }
          const hit = rowsFor()[0] ?? null;
          return { data: hit, error: null };
        };
        const result: Record<string, unknown> = {
          overrideTypes() {
            return result;
          },
          then(resolve: (v: { data: unknown; error: null }) => void) {
            resolve(compute());
          },
        };
        return result;
      },
      // applyResendEvent calls .update().eq() WITHOUT maybeSingle() for
      // the counter bump + ignored-event stamp — make the chain awaitable
      // (thenable) so `await supabase.from().update().eq()` resolves and
      // applies the patch.
      then(resolve: (v: { data: null; error: null }) => void) {
        if (state.op === 'update') {
          for (const r of rowsFor()) Object.assign(r, state.patch);
        }
        resolve({ data: null, error: null });
      },
      overrideTypes() {
        return builder;
      },
    };
    return builder;
  }

  return {
    from(name: string) {
      return table(name);
    },
  } as unknown as SupabaseClient<Database>;
}

function ev(type: string, emailId: string): ResendWebhookEvent {
  return { type, created_at: '2026-06-05T12:00:00.000Z', data: { email_id: emailId } };
}

// ─── CAMPAIGN_TEAM_COPY pinned ──────────────────────────────────────

await test('team-copy list is the two internal addresses', () => {
  assertEqual([...CAMPAIGN_TEAM_COPY], [
    'todd@tinyseedfarmpgh.com',
    'tinyseedfleurs@gmail.com',
  ]);
});

// ─── applyResendEvent: happy path ───────────────────────────────────

await test('email.opened flips recipient → opened + bumps total_opened', async () => {
  const fake = makeFake({
    recipients: [
      {
        id: 'r1',
        campaign_id: 'c1',
        customer_id: 'cust1',
        email: 'a@x.com',
        status: 'sent',
        resend_email_id: 'eid-1',
        last_event_at: null,
      },
    ],
    campaigns: [
      {
        id: 'c1',
        total_delivered: 0,
        total_opened: 0,
        total_clicked: 0,
        total_bounced: 0,
        total_complained: 0,
      },
    ],
  });

  const res = await applyResendEvent(fake, ev('email.opened', 'eid-1'));
  assertEqual(res.ok, true, 'ok');
  assertEqual(res.matched, true, 'matched');
  assertEqual(res.applied, true, 'applied');
  assertEqual(res.status, 'opened', 'status');
});

await test('full lifecycle delivered → opened → clicked advances + counts each once', async () => {
  const seed = {
    recipients: [
      {
        id: 'r1',
        campaign_id: 'c1',
        customer_id: 'cust1',
        email: 'a@x.com',
        status: 'sent',
        resend_email_id: 'eid-1',
        last_event_at: null,
      },
    ],
    campaigns: [
      {
        id: 'c1',
        total_delivered: 0,
        total_opened: 0,
        total_clicked: 0,
        total_bounced: 0,
        total_complained: 0,
      },
    ],
  };
  const fake = makeFake(seed);

  await applyResendEvent(fake, ev('email.delivered', 'eid-1'));
  await applyResendEvent(fake, ev('email.opened', 'eid-1'));
  await applyResendEvent(fake, ev('email.clicked', 'eid-1'));

  assertEqual(seed.recipients[0].status, 'clicked', 'final status');
  assertEqual(seed.campaigns[0].total_delivered, 1, 'delivered count');
  assertEqual(seed.campaigns[0].total_opened, 1, 'opened count');
  assertEqual(seed.campaigns[0].total_clicked, 1, 'clicked count');
});

await test('duplicate email.opened does NOT double-count', async () => {
  const seed = {
    recipients: [
      {
        id: 'r1',
        campaign_id: 'c1',
        customer_id: 'cust1',
        email: 'a@x.com',
        status: 'sent',
        resend_email_id: 'eid-1',
        last_event_at: null,
      },
    ],
    campaigns: [
      {
        id: 'c1',
        total_delivered: 0,
        total_opened: 0,
        total_clicked: 0,
        total_bounced: 0,
        total_complained: 0,
      },
    ],
  };
  const fake = makeFake(seed);

  await applyResendEvent(fake, ev('email.opened', 'eid-1'));
  const second = await applyResendEvent(fake, ev('email.opened', 'eid-1'));

  assertEqual(second.applied, false, 'second open is a no-op');
  assertEqual(seed.campaigns[0].total_opened, 1, 'opened counted once');
});

await test('out-of-order delivered AFTER clicked does NOT downgrade or count', async () => {
  const seed = {
    recipients: [
      {
        id: 'r1',
        campaign_id: 'c1',
        customer_id: 'cust1',
        email: 'a@x.com',
        status: 'clicked',
        resend_email_id: 'eid-1',
        last_event_at: '2026-06-05T11:00:00.000Z',
      },
    ],
    campaigns: [
      {
        id: 'c1',
        total_delivered: 0,
        total_opened: 0,
        total_clicked: 0,
        total_bounced: 0,
        total_complained: 0,
      },
    ],
  };
  const fake = makeFake(seed);

  const res = await applyResendEvent(fake, ev('email.delivered', 'eid-1'));
  assertEqual(res.applied, false, 'late delivered is a no-op');
  assertEqual(seed.recipients[0].status, 'clicked', 'status stays clicked');
  assertEqual(seed.campaigns[0].total_delivered, 0, 'no delivered bump');
  // last_event_at IS still stamped (most-recent activity).
  assertEqual(seed.recipients[0].last_event_at, '2026-06-05T12:00:00.000Z', 'timestamp stamped');
});

await test('bounce outranks a prior open (negative wins)', async () => {
  const seed = {
    recipients: [
      {
        id: 'r1',
        campaign_id: 'c1',
        customer_id: 'cust1',
        email: 'a@x.com',
        status: 'opened',
        resend_email_id: 'eid-1',
        last_event_at: null,
      },
    ],
    campaigns: [
      {
        id: 'c1',
        total_delivered: 0,
        total_opened: 0,
        total_clicked: 0,
        total_bounced: 0,
        total_complained: 0,
      },
    ],
  };
  const fake = makeFake(seed);

  const res = await applyResendEvent(fake, ev('email.bounced', 'eid-1'));
  assertEqual(res.applied, true, 'bounce applies');
  assertEqual(seed.recipients[0].status, 'bounced', 'status → bounced');
  assertEqual(seed.campaigns[0].total_bounced, 1, 'bounced counted');
});

await test('unknown email_id → matched:false, no error', async () => {
  const fake = makeFake({ recipients: [], campaigns: [] });
  const res = await applyResendEvent(fake, ev('email.opened', 'nope'));
  assertEqual(res.ok, true, 'still ok');
  assertEqual(res.matched, false, 'not matched');
  assertEqual(res.applied, false, 'not applied');
});

await test('event with no email_id → matched:false', async () => {
  const fake = makeFake({ recipients: [], campaigns: [] });
  const res = await applyResendEvent(fake, { type: 'email.opened', data: {} });
  assertEqual(res.matched, false, 'no email_id → unmatched');
});

await test('ignored event type (email.sent) stamps timestamp, no counter', async () => {
  const seed = {
    recipients: [
      {
        id: 'r1',
        campaign_id: 'c1',
        customer_id: 'cust1',
        email: 'a@x.com',
        status: 'sent',
        resend_email_id: 'eid-1',
        last_event_at: null,
      },
    ],
    campaigns: [
      {
        id: 'c1',
        total_delivered: 0,
        total_opened: 0,
        total_clicked: 0,
        total_bounced: 0,
        total_complained: 0,
      },
    ],
  };
  const fake = makeFake(seed);
  const res = await applyResendEvent(fake, ev('email.sent', 'eid-1'));
  assertEqual(res.matched, true, 'matched');
  assertEqual(res.applied, false, 'no status advance');
  assertEqual(seed.recipients[0].last_event_at, '2026-06-05T12:00:00.000Z', 'stamped');
});

// ─── Summary ────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

/**
 * ═══════════════════════════════════════════════════════════════════════
 * TINY SEED FARM OS — RAILWAY BACKEND (Phase 2)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Phase 2 capabilities:
 *   - GET  /health          → Health check
 *   - POST /api/chat/stream → Streaming AI chat with live Google context
 *
 * Environment variables required:
 *   ANTHROPIC_API_KEY      — Anthropic API key
 *   GOOGLE_CLIENT_ID       — OAuth 2.0 client ID
 *   GOOGLE_CLIENT_SECRET   — OAuth 2.0 client secret
 *   GOOGLE_REFRESH_TOKEN   — OAuth 2.0 refresh token (from OAuth Playground)
 *   PORT                   — Set automatically by Railway
 * ═══════════════════════════════════════════════════════════════════════
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import Anthropic from '@anthropic-ai/sdk';
import { google } from 'googleapis';

// ─── Startup validation ────────────────────────────────────────────────
const required = ['ANTHROPIC_API_KEY', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`FATAL: ${key} environment variable is not set.`);
    process.exit(1);
  }
}

// ─── Fastify instance ─────────────────────────────────────────────────
const fastify = Fastify({ logger: { level: process.env.LOG_LEVEL || 'info' } });

// ─── Clients ──────────────────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
const calendarApi = google.calendar({ version: 'v3', auth: oauth2Client });

// ─── CORS ─────────────────────────────────────────────────────────────
await fastify.register(cors, {
  origin: (origin, cb) => {
    const allowed = [
      'https://toddismyname21.github.io',
      'https://app.tinyseedfarm.com',
      'http://localhost:3000',
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'http://localhost:8080',
    ];
    if (!origin || allowed.includes(origin)) cb(null, true);
    else cb(null, false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Session-Token', 'Authorization'],
  credentials: true,
});

// ─── Live Google context fetcher ──────────────────────────────────────
async function fetchLiveContext() {
  const sections = [];

  // Gmail: unread emails
  try {
    const list = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 8,
      q: 'is:unread -category:promotions -category:social',
    });

    if (list.data.messages && list.data.messages.length > 0) {
      const details = await Promise.all(
        list.data.messages.slice(0, 6).map(async (msg) => {
          try {
            const detail = await gmail.users.messages.get({
              userId: 'me',
              id: msg.id,
              format: 'full',
            });
            const h = detail.data.payload.headers;
            const from = h.find(x => x.name === 'From')?.value || 'Unknown';
            const subject = h.find(x => x.name === 'Subject')?.value || '(no subject)';
            const date = h.find(x => x.name === 'Date')?.value || '';

            // Extract full body text from payload (handles multipart emails)
            const extractBody = (payload) => {
              if (payload.body?.data) {
                return Buffer.from(payload.body.data, 'base64url').toString('utf8');
              }
              if (payload.parts) {
                for (const part of payload.parts) {
                  if (part.mimeType === 'text/plain' && part.body?.data) {
                    return Buffer.from(part.body.data, 'base64url').toString('utf8');
                  }
                }
                for (const part of payload.parts) {
                  if (part.mimeType === 'text/html' && part.body?.data) {
                    return Buffer.from(part.body.data, 'base64url').toString('utf8')
                      .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                  }
                  if (part.parts) {
                    const nested = extractBody(part);
                    if (nested) return nested;
                  }
                }
              }
              return detail.data.snippet || '';
            };

            const body = extractBody(detail.data.payload)
              .replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
              .substring(0, 3000);

            return `- FROM: ${from}\n  DATE: ${date.substring(0, 16)}\n  SUBJECT: ${subject}\n  BODY:\n${body}`;
          } catch (e) {
            return null;
          }
        })
      );
      const valid = details.filter(Boolean);
      sections.push(`UNREAD EMAILS (${valid.length} shown):\n${valid.join('\n\n')}`);
    } else {
      sections.push('UNREAD EMAILS: Inbox is clear');
    }
  } catch (e) {
    sections.push(`GMAIL: Unavailable (${e.message})`);
  }

  // Calendar: next 7 days
  try {
    const now = new Date();
    const weekOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const events = await calendarApi.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: weekOut.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 20,
    });

    if (events.data.items && events.data.items.length > 0) {
      const lines = events.data.items.map(e => {
        const start = e.start.dateTime
          ? new Date(e.start.dateTime).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
          : new Date(e.start.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        return `- ${start}: ${e.summary}`;
      });
      sections.push(`CALENDAR (next 7 days):\n${lines.join('\n')}`);
    } else {
      sections.push('CALENDAR: No events in the next 7 days');
    }
  } catch (e) {
    sections.push(`CALENDAR: Unavailable (${e.message})`);
  }

  return sections.join('\n\n');
}

// ─── System prompt ────────────────────────────────────────────────────
const todayStr = () =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const BASE_SYSTEM = `You are the Chief of Staff for Tiny Seed Farm, a certified organic farm in Rochester, Pennsylvania (Pittsburgh area), run by owner Todd Wilson.

Today is ${todayStr()}.

Your role: Todd's intelligent, decisive assistant. You manage farm operations, email triage, deadlines, tasks, employee coordination, vendor relationships, grants, and financial awareness.

Key context:
- Certified organic (OEFFA, NOP ID 1600003839) — renewal due April 25, 2026
- Products: CSA boxes, vegetables, flowers, seedlings, wholesale to restaurants
- Staff: Todd (owner), Ben Finley (Admin), Loren Kildoo (Admin), seasonal workers
- Key contacts: Horizon Land Trust (Molly Decker — lease), FSA (Allison Pruskowski — loans/grants), OEFFA (cert), DGPerry CPA
- Financial: PNC ~$8K, Chase ~$6K, Amex ~$6K credit cards; lease arrears dispute ~$9-10K actual
- CRITICAL deadline: OEFFA organic renewal April 25, 2026

How to respond:
- Direct and actionable. Todd is often outdoors, time-pressed, on his phone.
- Lead with the answer, explain if needed.
- Flag urgent/time-sensitive items prominently.
- If you don't know something precisely, say so.
- Use markdown sparingly (bold for key terms, bullets for lists).

HARD LIMITS — NEVER violate:
- You CANNOT send emails without explicit confirmation from Todd. Always show the draft and say "Confirm to send."
- You CANNOT delete emails or calendar events without confirmation.
- You CANNOT modify any data without showing Todd what you're about to do first.
- Never pretend to take an action you haven't taken. A false action claim could cause Todd to miss a critical deadline.
- When in doubt, ask.`;

// ─── Routes ───────────────────────────────────────────────────────────
fastify.get('/health', async () => ({
  status: 'ok',
  service: 'tiny-seed-railway-api',
  version: '2.0.0',
  phase: 2,
  googleConnected: true,
  timestamp: new Date().toISOString(),
}));

fastify.post('/api/chat/stream', async (request, reply) => {
  const { message, history = [] } = request.body || {};
  if (!message) {
    reply.status(400).send({ error: 'message is required' });
    return;
  }

  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': request.headers.origin || '*',
    'Access-Control-Allow-Credentials': 'true',
  });

  reply.raw.write(': keepalive\n\n');

  try {
    // Fetch live Google context
    const liveContext = await fetchLiveContext();
    const systemPrompt = BASE_SYSTEM + '\n\n=== LIVE DATA (fetched now) ===\n' + liveContext;

    const messages = [
      ...history.slice(-20),
      { role: 'user', content: message },
    ];

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        reply.raw.write(`data: ${JSON.stringify({ type: 'token', text: chunk.delta.text })}\n\n`);
      }
    }

    const final = await stream.finalMessage();
    reply.raw.write(`data: ${JSON.stringify({ type: 'done', usage: final.usage })}\n\n`);
  } catch (error) {
    fastify.log.error({ err: error }, 'Streaming error');
    reply.raw.write(`data: ${JSON.stringify({ type: 'error', message: 'Service error. Please try again.' })}\n\n`);
  } finally {
    reply.raw.end();
  }
});

// ─── Start ────────────────────────────────────────────────────────────
const port = parseInt(process.env.PORT || '3000', 10);
try {
  await fastify.listen({ port, host: '0.0.0.0' });
  console.log(`Tiny Seed Railway API v2.0 running on port ${port}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}

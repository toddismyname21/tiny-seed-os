/**
 * ═══════════════════════════════════════════════════════════════════════
 * TINY SEED FARM OS — RAILWAY BACKEND (Phase 1)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Phase 1 capabilities:
 *   - GET  /health          → Health check
 *   - POST /api/chat/stream → Streaming AI chat via SSE (Chief of Staff)
 *
 * Environment variables required:
 *   ANTHROPIC_API_KEY  — Set in Railway dashboard
 *   PORT               — Set automatically by Railway (default 3000)
 *
 * Phase 2+ will add: WebSockets, Google Sheets API, MCP server
 * ═══════════════════════════════════════════════════════════════════════
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import Anthropic from '@anthropic-ai/sdk';

// ─── Startup validation ────────────────────────────────────────────────
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('FATAL: ANTHROPIC_API_KEY environment variable is not set.');
  console.error('Set it in Railway: Settings → Variables → ANTHROPIC_API_KEY');
  process.exit(1);
}

// ─── Fastify instance ─────────────────────────────────────────────────
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty' }
      : undefined
  }
});

// ─── Anthropic client ─────────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── CORS ─────────────────────────────────────────────────────────────
// Allow GitHub Pages, local dev, and any other origins you control
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
    // Allow requests with no origin (curl, Postman, etc.)
    if (!origin || allowed.includes(origin)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Session-Token', 'Authorization'],
  credentials: true,
});

// ─── Chief of Staff system prompt (cached in memory, ~1,500 tokens) ───
const todayForPrompt = () =>
  new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

const CHIEF_OF_STAFF_SYSTEM = () => `You are the Chief of Staff for Tiny Seed Farm, a certified organic farm in Rochester, Pennsylvania (Pittsburgh area), run by owner Todd Wilson.

Today is ${todayForPrompt()}.

Your role: You are Todd's intelligent, decisive assistant. You manage farm operations, email triage, deadlines, tasks, employee coordination, vendor relationships, grants, and financial awareness.

Key context about Tiny Seed Farm:
- Certified organic (OEFFA, NOP ID 1600003839) — organic certification renewal due April 25, 2026
- Products: CSA boxes, market vegetables, flowers, seedlings, wholesale to restaurants
- Staff: Todd (owner/operator), Ben Finley (Admin), Loren Kildoo (Admin), seasonal farm workers
- Markets: Pittsburgh-area farmers markets, restaurant wholesale (chefs), CSA members
- Key contacts: Horizon Land Trust (Molly Decker — lease), FSA (Allison Pruskowski — loans/grants), OEFFA (organic cert), PA DGPerry (CPA)
- Active loan/financial concerns: PNC ~$8K, Chase ~$6K, Amex ~$6K credit cards; lease arrears dispute with Don Kretschmann (~$16K claimed, ~$9-10K actual after adjustments)
- Critical deadline: OEFFA organic renewal April 25, 2026

How to respond:
- Be direct and actionable. Todd is often outdoors, time-pressed, on his phone.
- Lead with the answer, then explain if needed.
- Flag anything urgent or time-sensitive prominently.
- If you don't have information to answer precisely, say so — don't guess.
- Use markdown sparingly (bold for key terms, bullets for lists).
- Keep responses concise unless Todd asks for detail.

You have memory of the current conversation. Farm data (emails, tasks, calendar) will be added in a future phase — for now, answer based on your farm knowledge and what Todd tells you.`;

// ─── Routes ────────────────────────────────────────────────────────────

// Health check — Railway uses this for deployment verification
fastify.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    service: 'tiny-seed-railway-api',
    version: '1.0.0',
    phase: 1,
    timestamp: new Date().toISOString(),
  };
});

// ─── Streaming chat (Server-Sent Events) ──────────────────────────────
fastify.post('/api/chat/stream', {
  schema: {
    body: {
      type: 'object',
      required: ['message'],
      properties: {
        message: { type: 'string', minLength: 1, maxLength: 10000 },
        history: {
          type: 'array',
          maxItems: 20,
          items: {
            type: 'object',
            required: ['role', 'content'],
            properties: {
              role: { type: 'string', enum: ['user', 'assistant'] },
              content: { type: 'string', maxLength: 20000 },
            },
          },
        },
      },
    },
  },
}, async (request, reply) => {
  const { message, history = [] } = request.body;

  // Build message array — last 10 exchanges max
  const messages = [
    ...history.slice(-20),
    { role: 'user', content: message },
  ];

  // SSE headers — X-Accel-Buffering: no is critical for Railway/nginx proxies
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': request.headers.origin || '*',
    'Access-Control-Allow-Credentials': 'true',
  });

  // Send keepalive immediately so the browser doesn't time out waiting for first byte
  reply.raw.write(': keepalive\n\n');

  try {
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      system: CHIEF_OF_STAFF_SYSTEM(),
      messages,
    });

    // Stream tokens as they arrive
    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta?.type === 'text_delta'
      ) {
        const payload = JSON.stringify({ type: 'token', text: chunk.delta.text });
        reply.raw.write(`data: ${payload}\n\n`);
      }
    }

    // Final usage stats (helps monitor prompt caching in future)
    const final = await stream.finalMessage();
    reply.raw.write(
      `data: ${JSON.stringify({
        type: 'done',
        usage: {
          input_tokens: final.usage?.input_tokens,
          output_tokens: final.usage?.output_tokens,
        },
      })}\n\n`
    );
  } catch (error) {
    fastify.log.error({ err: error }, 'Streaming error');
    reply.raw.write(
      `data: ${JSON.stringify({ type: 'error', message: 'AI service error. Please try again.' })}\n\n`
    );
  } finally {
    reply.raw.end();
  }
});

// ─── Start server ──────────────────────────────────────────────────────
const port = parseInt(process.env.PORT || '3000', 10);
const host = '0.0.0.0'; // Required for Railway — listens on all interfaces

try {
  await fastify.listen({ port, host });
  console.log(`Tiny Seed Railway API running on port ${port}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}

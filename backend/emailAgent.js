/**
 * Tiny Seed Farm — Proactive Email Agent
 *
 * Runs every 5 minutes via Railway cron.
 * Polls Gmail for new emails, classifies with Claude, stores in Neon.
 *
 * Run: node backend/emailAgent.js
 */

import { google } from 'googleapis';
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';
import { initDatabase, getLastHistoryId, saveHistoryId, isProcessed, saveProcessedEmail } from './db.js';

// ─── Validate env ──────────────────────────────────────────────────────
const required = ['ANTHROPIC_API_KEY', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'DATABASE_URL'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`FATAL: ${key} not set`);
    process.exit(1);
  }
}

// ─── Google OAuth ──────────────────────────────────────────────────────
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// ─── Anthropic ─────────────────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Email body extractor ──────────────────────────────────────────────
function extractBody(payload) {
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
  return '';
}

// ─── Claude classification + draft ────────────────────────────────────
const CLASSIFY_SYSTEM = `You are an email triage assistant for Todd Wilson, owner of Tiny Seed Farm, a certified organic vegetable and flower farm in Rochester, Pennsylvania (Pittsburgh area).

Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

ABOUT TODD:
- Runs a small organic farm solo with 2 admins (Ben Finley, Loren Kildoo) and seasonal workers
- Key contacts: Allison Pruskowski (FSA loans/grants), Molly Decker (Horizon Land Trust/lease), OEFFA (organic cert), DGPerry (CPA)
- CRITICAL: OEFFA organic certification renewal due April 25, 2026
- Active financial concerns: PNC/Chase/Amex credit cards (~$20K), lease arrears dispute with Don Kretschmann

CATEGORIES:
- CUSTOMER: CSA members, market shoppers, restaurant chefs, wholesale buyers, seedling customers
- VENDOR: suppliers, seed companies, equipment, delivery services, invoices
- GOVERNMENT: FSA, USDA, OEFFA, grants, compliance, permits, PDA
- EMPLOYEE: Ben, Loren, seasonal workers, scheduling, payroll, HR
- FINANCIAL: banks, credit cards, loans, CPA, accounting, payments
- LEASE: Don Kretschmann, Horizon Land Trust, Molly Decker, property
- INTERNAL: Todd to himself, farm notes, reminders
- MARKETING: newsletters, social media, promotions, non-urgent
- SPAM: obvious junk, unsubscribes, automated notifications with no action needed

URGENCY:
- CRITICAL: Legal matters, payment failures, certification deadlines <48h, emergencies
- HIGH: Needs reply within 24h — customer issues, grant deadlines, FSA requests, vendor confirmations
- MEDIUM: Reply within 48-72h — general inquiries, routine orders, scheduling
- LOW: FYI only, newsletters, receipts, no reply needed

Respond ONLY with valid JSON matching this exact schema:
{
  "category": "CUSTOMER|VENDOR|GOVERNMENT|EMPLOYEE|FINANCIAL|LEASE|INTERNAL|MARKETING|SPAM",
  "urgency": "CRITICAL|HIGH|MEDIUM|LOW",
  "summary": "One sentence: who sent it and what they want or said",
  "action_required": true|false,
  "suggested_reply": "Full draft reply text, or null if no reply needed. Write as Todd, professional but warm farm owner voice.",
  "follow_up_days": null or integer (days until follow-up if no reply),
  "deadline_iso": null or "ISO-8601 date string if a deadline is mentioned",
  "deadline_description": null or "plain English description of the deadline"
}`;

async function classifyAndDraft(emailData) {
  const userPrompt = `Classify and draft a reply for this email:

FROM: ${emailData.from}
DATE: ${emailData.date}
SUBJECT: ${emailData.subject}
BODY:
${emailData.body.substring(0, 4000)}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: CLASSIFY_SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content[0].text;
    // Strip markdown fences if present
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error(`[Agent] Classification error for "${emailData.subject}":`, err.message);
    return {
      category: 'UNSURE',
      urgency: 'MEDIUM',
      summary: emailData.subject,
      action_required: true,
      suggested_reply: null,
      follow_up_days: 2,
      deadline_iso: null,
      deadline_description: null,
    };
  }
}

// ─── Apply Gmail label ─────────────────────────────────────────────────
async function applyLabel(messageId, labelName = 'AI-Reviewed') {
  try {
    // Get or create label
    const labels = await gmail.users.labels.list({ userId: 'me' });
    let label = labels.data.labels.find(l => l.name === labelName);
    if (!label) {
      const created = await gmail.users.labels.create({
        userId: 'me',
        requestBody: { name: labelName, labelListVisibility: 'labelShow', messageListVisibility: 'show' },
      });
      label = created.data;
    }
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: { addLabelIds: [label.id] },
    });
  } catch (err) {
    console.warn(`[Agent] Could not apply label to ${messageId}:`, err.message);
  }
}

// ─── Main processing loop ──────────────────────────────────────────────
async function processInbox() {
  console.log(`[Agent] Starting email processing run at ${new Date().toISOString()}`);

  await initDatabase();

  let newMessageIds = [];
  let newHistoryId = null;

  let lastHistoryId = await getLastHistoryId();

  if (lastHistoryId) {
    // Incremental sync using history.list
    try {
      const history = await gmail.users.history.list({
        userId: 'me',
        startHistoryId: lastHistoryId,
        historyTypes: ['messageAdded'],
      });

      newHistoryId = history.data.historyId;

      if (history.data.history) {
        for (const record of history.data.history) {
          if (record.messagesAdded) {
            for (const added of record.messagesAdded) {
              newMessageIds.push(added.message.id);
            }
          }
        }
      }
      console.log(`[Agent] History sync: ${newMessageIds.length} new messages since historyId ${lastHistoryId}`);
    } catch (err) {
      if (err.code === 404) {
        // historyId expired — fall back to full sync of last 24h
        console.warn('[Agent] historyId expired, falling back to full sync');
        lastHistoryId = null;
      } else {
        throw err;
      }
    }
  }

  if (!lastHistoryId) {
    // Full sync fallback — get messages from last 24 hours
    const since = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
    const list = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 50,
      q: `after:${since} -category:promotions -category:social`,
    });
    newHistoryId = (await gmail.users.getProfile({ userId: 'me' })).data.historyId;
    newMessageIds = (list.data.messages || []).map(m => m.id);
    console.log(`[Agent] Full sync fallback: ${newMessageIds.length} messages`);
  }

  // Process each new message
  let processed = 0;
  let skipped = 0;

  for (const messageId of newMessageIds) {
    // Skip if already processed
    if (await isProcessed(messageId)) {
      skipped++;
      continue;
    }

    try {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const headers = detail.data.payload.headers;
      const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
      const subject = headers.find(h => h.name === 'Subject')?.value || '(no subject)';
      const dateStr = headers.find(h => h.name === 'Date')?.value || '';
      const body = extractBody(detail.data.payload)
        .replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

      const classification = await classifyAndDraft({ from, date: dateStr, subject, body });

      // Generate approval token if a draft reply exists
      let approvalToken = null;
      let approvalExpires = null;
      if (classification.suggested_reply) {
        approvalToken = crypto.randomBytes(32).toString('hex');
        approvalExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);
      }

      await saveProcessedEmail({
        messageId,
        threadId: detail.data.threadId,
        receivedAt: dateStr ? new Date(dateStr) : new Date(),
        from,
        subject,
        category: classification.category,
        urgency: classification.urgency,
        summary: classification.summary,
        draftReply: classification.suggested_reply,
        followUpDays: classification.follow_up_days,
        deadlineDetected: classification.deadline_iso ? new Date(classification.deadline_iso) : null,
        deadlineDescription: classification.deadline_description,
        approvalToken,
        approvalTokenExpires: approvalExpires,
      });

      // Apply cosmetic Gmail label
      await applyLabel(messageId, 'AI-Reviewed');

      console.log(`[Agent] processed | ${classification.urgency} | ${classification.category} | ${subject}`);
      processed++;

    } catch (err) {
      console.error(`[Agent] Error processing message ${messageId}:`, err.message);
    }
  }

  // Save the new historyId for next run
  if (newHistoryId) {
    await saveHistoryId(newHistoryId);
  }

  console.log(`[Agent] Run complete: ${processed} processed, ${skipped} skipped`);
}

// Run
processInbox()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('[Agent] Fatal error:', err);
    process.exit(1);
  });

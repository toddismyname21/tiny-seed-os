/**
 * Neon PostgreSQL connection and queries for the email agent.
 * Uses DATABASE_URL environment variable (set in Railway).
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
});

// Create tables if they don't exist
export async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS gmail_sync_state (
        gmail_user_id VARCHAR(255) PRIMARY KEY,
        last_history_id BIGINT,
        last_synced_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS processed_emails (
        id SERIAL PRIMARY KEY,
        gmail_message_id VARCHAR(255) UNIQUE NOT NULL,
        gmail_thread_id VARCHAR(255),
        received_at TIMESTAMPTZ,
        processed_at TIMESTAMPTZ DEFAULT NOW(),
        from_address TEXT,
        subject TEXT,
        category VARCHAR(50),
        urgency VARCHAR(20),
        summary TEXT,
        draft_reply TEXT,
        draft_approved BOOLEAN DEFAULT FALSE,
        draft_approved_at TIMESTAMPTZ,
        draft_sent BOOLEAN DEFAULT FALSE,
        follow_up_days INTEGER,
        deadline_detected TIMESTAMPTZ,
        deadline_description TEXT,
        calendar_event_created BOOLEAN DEFAULT FALSE,
        approval_token VARCHAR(64),
        approval_token_expires_at TIMESTAMPTZ,
        included_in_brief BOOLEAN DEFAULT FALSE
      );

      CREATE INDEX IF NOT EXISTS idx_processed_emails_message_id
        ON processed_emails(gmail_message_id);

      CREATE INDEX IF NOT EXISTS idx_processed_emails_processed_at
        ON processed_emails(processed_at DESC);

      CREATE INDEX IF NOT EXISTS idx_processed_emails_brief
        ON processed_emails(included_in_brief, processed_at DESC);
    `);
    console.log('[DB] Tables ready');
  } finally {
    client.release();
  }
}

export async function getLastHistoryId(userId = 'me') {
  const res = await pool.query(
    'SELECT last_history_id FROM gmail_sync_state WHERE gmail_user_id = $1',
    [userId]
  );
  return res.rows[0]?.last_history_id || null;
}

export async function saveHistoryId(historyId, userId = 'me') {
  await pool.query(`
    INSERT INTO gmail_sync_state (gmail_user_id, last_history_id, last_synced_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (gmail_user_id) DO UPDATE
      SET last_history_id = $2, last_synced_at = NOW()
  `, [userId, historyId]);
}

export async function isProcessed(messageId) {
  const res = await pool.query(
    'SELECT id FROM processed_emails WHERE gmail_message_id = $1',
    [messageId]
  );
  return res.rows.length > 0;
}

export async function saveProcessedEmail(data) {
  await pool.query(`
    INSERT INTO processed_emails (
      gmail_message_id, gmail_thread_id, received_at, from_address, subject,
      category, urgency, summary, draft_reply, follow_up_days,
      deadline_detected, deadline_description, approval_token, approval_token_expires_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    ON CONFLICT (gmail_message_id) DO NOTHING
  `, [
    data.messageId, data.threadId, data.receivedAt, data.from, data.subject,
    data.category, data.urgency, data.summary, data.draftReply, data.followUpDays,
    data.deadlineDetected, data.deadlineDescription, data.approvalToken, data.approvalTokenExpires
  ]);
}

export async function getUnprocessedBriefEmails(hoursBack = 24) {
  const res = await pool.query(`
    SELECT * FROM processed_emails
    WHERE processed_at > NOW() - make_interval(hours => $1)
      AND included_in_brief = FALSE
    ORDER BY
      CASE urgency WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
      processed_at DESC
    LIMIT 50
  `, [hoursBack]);
  return res.rows;
}

export async function markIncludedInBrief(ids) {
  if (!ids.length) return;
  await pool.query(
    'UPDATE processed_emails SET included_in_brief = TRUE WHERE id = ANY($1)',
    [ids]
  );
}

export async function getApprovalToken(token) {
  const res = await pool.query(`
    SELECT * FROM processed_emails
    WHERE approval_token = $1
      AND approval_token_expires_at > NOW()
      AND draft_sent = FALSE
  `, [token]);
  return res.rows[0] || null;
}

export async function markDraftSent(id) {
  await pool.query(
    'UPDATE processed_emails SET draft_sent = TRUE, draft_approved = TRUE, draft_approved_at = NOW() WHERE id = $1',
    [id]
  );
}

export default pool;

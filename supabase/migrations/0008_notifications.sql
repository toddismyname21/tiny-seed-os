-- ═══════════════════════════════════════════════════════════════════
-- Migration 0008: Unified Notification Log (email + SMS)
-- Renamed from email_log to notification_log per Todd's 2026-05-08
-- decision to bring SMS (Twilio Verify) into Phase 1.
-- Replaces CSA_Email_Log sheet + adds Resend + Twilio webhook events.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE notification_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id         UUID REFERENCES members(id) ON DELETE SET NULL,
  customer_id       UUID REFERENCES customers(id) ON DELETE SET NULL,
  channel           TEXT NOT NULL CHECK (channel IN ('email','sms','push')),
  notification_type TEXT NOT NULL,                            -- magic_link, welcome, weekly_reminder, renewal, custom
  recipient         TEXT NOT NULL,                            -- email or phone number
  status            TEXT NOT NULL CHECK (status IN
                      ('queued','sent','delivered','opened','clicked','bounced','complained','failed','undelivered')),
  provider          TEXT NOT NULL CHECK (provider IN ('resend','twilio_verify','twilio_sms','gmail_legacy')),
  provider_message_id TEXT UNIQUE,                            -- Resend or Twilio message SID
  subject           TEXT,                                     -- email only
  template          TEXT,                                     -- React Email template name
  sent_at           TIMESTAMPTZ DEFAULT NOW(),
  delivered_at      TIMESTAMPTZ,
  opened_at         TIMESTAMPTZ,
  error_message     TEXT,
  metadata          JSONB DEFAULT '{}'                        -- provider webhook data
);

CREATE INDEX notif_log_member_idx        ON notification_log(member_id);
CREATE INDEX notif_log_customer_idx      ON notification_log(customer_id);
CREATE INDEX notif_log_status_idx        ON notification_log(status);
CREATE INDEX notif_log_channel_type_idx  ON notification_log(channel, notification_type);
CREATE INDEX notif_log_sent_idx          ON notification_log(sent_at DESC);

COMMENT ON TABLE notification_log IS 'Unified email + SMS log. Provider webhooks update status fields.';

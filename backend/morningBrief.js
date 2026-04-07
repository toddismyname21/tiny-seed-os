/**
 * Tiny Seed Farm — Morning Brief Generator
 *
 * Runs daily at 7am Eastern (11:00 UTC) via Railway cron.
 * Queries Neon for emails processed in last 24h,
 * generates HTML email, sends to Todd via Gmail API.
 *
 * Run: node backend/morningBrief.js
 */

import { google } from 'googleapis';
import { initDatabase, getUnprocessedBriefEmails, markIncludedInBrief } from './db.js';

// ─── Weather helpers ─────────────────────────────────────────────────
function weatherCodeDescription(code) {
  if (code === 0) return 'Clear sky';
  if (code >= 1 && code <= 3) return 'Partly cloudy';
  if (code >= 45 && code <= 48) return 'Foggy';
  if (code >= 51 && code <= 55) return 'Drizzle';
  if (code >= 56 && code <= 57) return 'Freezing drizzle';
  if (code >= 61 && code <= 65) return 'Rain';
  if (code >= 66 && code <= 67) return 'Freezing rain';
  if (code >= 71 && code <= 75) return 'Snow';
  if (code === 77) return 'Snow grains';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code === 85 || code === 86) return 'Snow showers';
  if (code === 95) return 'Thunderstorm';
  if (code === 96 || code === 99) return 'Thunderstorm with hail';
  return 'Unknown';
}

function weatherCodeEmoji(code) {
  if (code === 0) return '☀️';
  if (code >= 1 && code <= 3) return '⛅';
  if (code >= 45 && code <= 48) return '🌫️';
  if (code >= 51 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code >= 85 && code <= 86) return '🌨️';
  if (code >= 95) return '⛈️';
  return '🌤️';
}

async function fetchWeatherForBrief() {
  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=40.7&longitude=-80.1&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FNew_York&forecast_days=3';
    const res = await fetch(url);
    const data = await res.json();
    return data.daily;
  } catch (e) {
    return null;
  }
}

const required = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'DATABASE_URL', 'TODD_EMAIL', 'RAILWAY_URL'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`FATAL: ${key} not set`);
    process.exit(1);
  }
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

const RAILWAY_URL = process.env.RAILWAY_URL;
const TODD_EMAIL = process.env.TODD_EMAIL;

function urgencyColor(urgency) {
  const colors = { CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#ca8a04', LOW: '#16a34a', UNSURE: '#7c3aed' };
  return colors[urgency] || '#6b7280';
}

function urgencyEmoji(urgency) {
  const e = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🟢', UNSURE: '🔵' };
  return e[urgency] || '⚪';
}

function buildBriefHtml(emails, date, weather) {
  const critical = emails.filter(e => e.urgency === 'CRITICAL');
  const high = emails.filter(e => e.urgency === 'HIGH');
  const medium = emails.filter(e => e.urgency === 'MEDIUM');
  const low = emails.filter(e => ['LOW', 'UNSURE'].includes(e.urgency));
  const needsAction = emails.filter(e => e.draft_reply && ['CRITICAL','HIGH'].includes(e.urgency));
  const deadlines = emails.filter(e => e.deadline_detected);

  let html = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 16px; background: #f9fafb; color: #111827; }
  .header { background: #1a2e1a; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
  .header h1 { margin: 0 0 4px 0; font-size: 18px; }
  .header p { margin: 0; font-size: 13px; opacity: 0.8; }
  .stat-row { display: flex; gap: 12px; margin-bottom: 20px; }
  .stat { background: white; border-radius: 8px; padding: 12px 16px; flex: 1; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .stat-number { font-size: 24px; font-weight: 700; }
  .stat-label { font-size: 11px; color: #6b7280; text-transform: uppercase; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 13px; font-weight: 600; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; }
  .email-card { background: white; border-radius: 8px; padding: 14px; margin-bottom: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 4px solid #e5e7eb; }
  .email-card.critical { border-left-color: #dc2626; }
  .email-card.high { border-left-color: #ea580c; }
  .email-card.medium { border-left-color: #ca8a04; }
  .email-from { font-size: 12px; color: #6b7280; margin-bottom: 2px; }
  .email-subject { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
  .email-summary { font-size: 13px; color: #374151; margin-bottom: 10px; }
  .draft-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px; margin-bottom: 10px; font-size: 12px; color: #166534; white-space: pre-wrap; }
  .btn-row { display: flex; gap: 8px; }
  .btn { display: inline-block; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; text-decoration: none; text-align: center; }
  .btn-approve { background: #16a34a; color: white; }
  .btn-reject { background: #f3f4f6; color: #374151; }
  .deadline-card { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 12px; margin-bottom: 8px; }
  .deadline-date { font-size: 13px; font-weight: 700; color: #9a3412; }
  .deadline-desc { font-size: 13px; color: #374151; }
  .footer { text-align: center; font-size: 11px; color: #9ca3af; margin-top: 20px; }
</style>
</head>
<body>

<div class="header">
  <h1>🌱 Tiny Seed Farm — Morning Brief</h1>
  <p>${date} · Prepared by your Chief of Staff</p>
</div>

<div class="stat-row">
  <div class="stat">
    <div class="stat-number" style="color:#dc2626">${critical.length + high.length}</div>
    <div class="stat-label">Need Action</div>
  </div>
  <div class="stat">
    <div class="stat-number" style="color:#ca8a04">${medium.length}</div>
    <div class="stat-label">Medium Priority</div>
  </div>
  <div class="stat">
    <div class="stat-number" style="color:#16a34a">${low.length}</div>
    <div class="stat-label">Low / FYI</div>
  </div>
  <div class="stat">
    <div class="stat-number" style="color:#2563eb">${deadlines.length}</div>
    <div class="stat-label">Deadlines</div>
  </div>
</div>`;

  // Weather section
  if (weather && weather.time && weather.time.length > 0) {
    html += `<div class="section"><div class="section-title">🌤️ Weather — Rochester, PA</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">`;
    const dayLabels = ['Today', 'Tomorrow'];
    const count = Math.min(weather.time.length, 3);
    for (let i = 0; i < count; i++) {
      const label = dayLabels[i] || new Date(weather.time[i] + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const code = weather.weathercode[i];
      const emoji = weatherCodeEmoji(code);
      const desc = weatherCodeDescription(code);
      const high = Math.round(weather.temperature_2m_max[i]);
      const low = Math.round(weather.temperature_2m_min[i]);
      const rain = weather.precipitation_probability_max[i];
      const frostWarning = low <= 35;
      html += `<div style="background:white;border-radius:8px;padding:12px 16px;flex:1;min-width:140px;box-shadow:0 1px 3px rgba(0,0,0,0.1);text-align:center${frostWarning ? ';border:2px solid #dc2626' : ''}">
        <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase">${label}</div>
        <div style="font-size:28px;margin:4px 0">${emoji}</div>
        <div style="font-size:13px;font-weight:600">${desc}</div>
        <div style="font-size:20px;font-weight:700;margin:4px 0">${low}°–${high}°F</div>
        <div style="font-size:11px;color:#6b7280">${rain}% rain</div>
        ${frostWarning ? '<div style="font-size:11px;font-weight:700;color:#dc2626;margin-top:4px">⚠️ FROST RISK</div>' : ''}
      </div>`;
    }
    html += `</div></div>`;
  }

  // Deadlines section
  if (deadlines.length > 0) {
    html += `<div class="section"><div class="section-title">⏰ Deadlines Detected</div>`;
    for (const e of deadlines) {
      const d = e.deadline_detected ? new Date(e.deadline_detected).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '';
      html += `<div class="deadline-card">
        <div class="deadline-date">${d}</div>
        <div class="deadline-desc">${e.deadline_description || e.subject}</div>
        <div class="email-from">From: ${e.from_address}</div>
      </div>`;
    }
    html += `</div>`;
  }

  // Render a section of emails grouped by urgency
  function renderEmailSection(title, emailList) {
    if (!emailList.length) return '';
    let s = `<div class="section"><div class="section-title">${title}</div>`;
    for (const e of emailList) {
      const cssClass = e.urgency.toLowerCase();
      s += `<div class="email-card ${cssClass}">
        <div class="email-from">${urgencyEmoji(e.urgency)} ${e.from_address}</div>
        <div class="email-subject">${e.subject}</div>
        <div class="email-summary">${e.summary}</div>`;
      if (e.draft_reply && e.approval_token) {
        s += `<div class="draft-box">${e.draft_reply.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        <div class="btn-row">
          <a href="${RAILWAY_URL}/approve/${e.approval_token}" class="btn btn-approve">✓ Send This Reply</a>
          <a href="${RAILWAY_URL}/reject/${e.approval_token}" class="btn btn-reject">✗ Discard</a>
        </div>`;
      }
      s += `</div>`;
    }
    return s + `</div>`;
  }

  if (critical.length) html += renderEmailSection('🔴 Critical — Act Now', critical);
  if (high.length) html += renderEmailSection('🟠 High Priority', high);
  if (medium.length) html += renderEmailSection('🟡 Medium Priority', medium);
  if (low.length) html += renderEmailSection('🟢 Low / FYI', low);

  if (emails.length === 0) {
    html += `<div style="text-align:center;padding:40px;color:#6b7280">
      <div style="font-size:32px">✅</div>
      <div style="font-size:16px;font-weight:600;margin-top:8px">Inbox clear</div>
      <div style="font-size:13px;margin-top:4px">No new emails since last brief</div>
    </div>`;
  }

  html += `<div class="footer">
    Tiny Seed Farm Chief of Staff · Powered by Railway + Claude<br>
    Reply links expire in 48 hours
  </div>
</body></html>`;

  return html;
}

async function sendMorningBrief() {
  console.log(`[Brief] Starting morning brief at ${new Date().toISOString()}`);

  await initDatabase();

  const [emails, weather] = await Promise.all([
    getUnprocessedBriefEmails(24),
    fetchWeatherForBrief(),
  ]);
  console.log(`[Brief] Found ${emails.length} emails to include`);
  console.log(`[Brief] Weather data: ${weather ? 'loaded' : 'unavailable'}`);

  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const needsAction = emails.filter(e => ['CRITICAL','HIGH'].includes(e.urgency)).length;
  const subject = `[Tiny Seed] Morning Brief — ${date}${needsAction > 0 ? ` (${needsAction} need action)` : ' — Inbox clear'}`;

  const html = buildBriefHtml(emails, date, weather);

  // Build RFC 2822 email message
  const messageParts = [
    `From: ${TODD_EMAIL}`,
    `To: ${TODD_EMAIL}`,
    `Subject: ${subject}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    html,
  ];
  const raw = Buffer.from(messageParts.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });

  // Mark all included emails
  if (emails.length > 0) {
    await markIncludedInBrief(emails.map(e => e.id));
  }

  console.log(`[Brief] Sent morning brief: "${subject}"`);
}

sendMorningBrief()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('[Brief] Fatal error:', err);
    process.exit(1);
  });

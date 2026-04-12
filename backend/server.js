/**
 * ═══════════════════════════════════════════════════════════════════════
 * TINY SEED FARM OS — RAILWAY BACKEND (Phase 2)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Phase 3A capabilities:
 *   - GET  /health              → Health check
 *   - POST /api/chat/stream     → Streaming AI chat with live Google + Sheets + Weather context
 *   - GET  /api/sheets/summary  → Debug endpoint for Sheets context
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
const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

const SHEET_ID = '128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc';

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

// ─── Google Sheets context fetcher ───────────────────────────────────
async function fetchSheetsContext() {
  const tabNames = [
    'UNIFIED_TASKS',
    'PLANNING_2026',
    'CSA_Members',
    'CSA_BoxContents',
    'WHOLESALE_CUSTOMERS',
    'WHOLESALE_STANDING_ORDERS',
    'FIN_BANK_ACCOUNTS',
    'FIN_BILLS',
    'HARVEST_LOG',
    'SALES_MarketItems',
  ];

  const results = await Promise.allSettled(
    tabNames.map(tab =>
      sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: tab })
    )
  );

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sections = [];

  // Helper: find column index case-insensitively, trying multiple aliases
  function colIdx(headers, ...names) {
    for (const name of names) {
      const idx = headers.findIndex(h => h.toLowerCase().trim() === name.toLowerCase());
      if (idx !== -1) return idx;
    }
    return -1;
  }

  // Helper: parse a date string safely
  function parseDate(val) {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }

  // Helper: days between two dates (positive = future, negative = past)
  function daysDiff(date) {
    if (!date) return Infinity;
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return Math.round((d - today) / (1000 * 60 * 60 * 24));
  }

  // Helper: get sheet data or null
  function getSheet(tabName) {
    const idx = tabNames.indexOf(tabName);
    const result = results[idx];
    if (result.status === 'rejected') return { error: result.reason.message };
    const rows = result.value.data.values;
    if (!rows || rows.length < 2) return { headers: [], data: [] };
    return { headers: rows[0], data: rows.slice(1) };
  }

  // --- UNIFIED_TASKS ---
  try {
    const sheet = getSheet('UNIFIED_TASKS');
    if (sheet.error) {
      sections.push(`UNIFIED_TASKS: Unavailable (${sheet.error})`);
    } else if (sheet.data.length === 0) {
      sections.push('=== TODAY\'S OPEN TASKS ===\nNo tasks yet');
    } else {
      const h = sheet.headers;
      const iTitle = colIdx(h, 'title', 'task_title', 'task');
      const iAssignee = colIdx(h, 'assignee_name', 'assignee', 'assigned_to');
      const iDue = colIdx(h, 'due_date', 'due', 'duedate');
      const iPriority = colIdx(h, 'priority_manual', 'priority');
      const iStatus = colIdx(h, 'status');

      const doneStatuses = ['done', 'completed'];
      const tasks = sheet.data.filter(row => {
        const status = (row[iStatus] || '').toLowerCase().trim();
        if (doneStatuses.includes(status)) return false;
        const due = parseDate(row[iDue]);
        const diff = daysDiff(due);
        return diff <= 7; // past due, today, or within 7 days
      }).slice(0, 15);

      if (tasks.length === 0) {
        sections.push('=== TODAY\'S OPEN TASKS ===\nNo tasks due in the next 7 days');
      } else {
        const lines = tasks.map(r =>
          `- ${r[iTitle] || '(untitled)'} | ${r[iAssignee] || '?'} | Due: ${r[iDue] || '?'} | ${r[iPriority] || '-'} | ${r[iStatus] || '-'}`
        );
        sections.push('=== TODAY\'S OPEN TASKS ===\n' + lines.join('\n'));
      }
    }
  } catch (e) {
    sections.push(`UNIFIED_TASKS: Error (${e.message})`);
  }

  // --- PLANNING_2026 ---
  try {
    const sheet = getSheet('PLANNING_2026');
    if (sheet.error) {
      sections.push(`PLANNING_2026: Unavailable (${sheet.error})`);
    } else if (sheet.data.length === 0) {
      sections.push('=== UPCOMING TRANSPLANTS & HARVESTS ===\nNo planning data yet');
    } else {
      const h = sheet.headers;
      const iCrop = colIdx(h, 'crop', 'crop_name');
      const iVariety = colIdx(h, 'variety');
      const iPlanTransplant = colIdx(h, 'Plan_Transplant', 'transplant_date', 'Transplant_Date');
      const iActTransplant = colIdx(h, 'Act_Transplant');
      const iHarvest = colIdx(h, 'First_Harvest', 'Target_First_Harvest', 'first_harvest', 'harvest_date');
      const iStatus = colIdx(h, 'status');
      const iBed = colIdx(h, 'Target_Bed_ID', 'bed_id', 'Bed_ID', 'bed', 'field');

      const upcoming = sheet.data.filter(row => {
        const planTd = parseDate(row[iPlanTransplant]);
        const actTd = parseDate(row[iActTransplant]);
        const td = actTd || planTd; // prefer actual if recorded
        const hd = parseDate(row[iHarvest]);
        return (td && daysDiff(td) >= -7 && daysDiff(td) <= 21) ||
               (hd && daysDiff(hd) >= -1 && daysDiff(hd) <= 14);
      }).slice(0, 20);

      if (upcoming.length === 0) {
        sections.push('=== UPCOMING TRANSPLANTS & HARVESTS ===\nNothing in next 14 days');
      } else {
        const lines = upcoming.map(r => {
          const planTx = r[iPlanTransplant] || '-';
          const actTx = r[iActTransplant];
          const txDisplay = actTx ? `${actTx} ✓` : planTx;
          return `- ${r[iCrop] || '?'} ${r[iVariety] || ''} | TX: ${txDisplay} | Harvest: ${r[iHarvest] || '-'} | ${r[iStatus] || '-'} | Bed: ${r[iBed] || '-'}`;
        });
        sections.push('=== UPCOMING TRANSPLANTS & HARVESTS (next 21 days) ===\n' + lines.join('\n'));
      }
    }
  } catch (e) {
    sections.push(`PLANNING_2026: Error (${e.message})`);
  }

  // --- CSA_Members ---
  try {
    const sheet = getSheet('CSA_Members');
    if (sheet.error) {
      sections.push(`CSA_Members: Unavailable (${sheet.error})`);
    } else if (sheet.data.length === 0) {
      sections.push('=== CSA STATUS ===\nNo members yet');
    } else {
      const h = sheet.headers;
      const iStatus = colIdx(h, 'status');
      const iDelivery = colIdx(h, 'delivery_date', 'next_delivery', 'next_delivery_date');

      const activeCount = sheet.data.filter(r => {
        const s = (r[iStatus] || '').toLowerCase().trim();
        return s === 'active';
      }).length;

      const renewalCount = sheet.data.filter(r => {
        const s = (r[iStatus] || '').toLowerCase().trim();
        return ['renewal_needed', 'pending_renewal'].includes(s);
      }).length;

      let nextDelivery = 'Unknown';
      if (iDelivery !== -1) {
        const dates = sheet.data
          .map(r => parseDate(r[iDelivery]))
          .filter(d => d && d >= today)
          .sort((a, b) => a - b);
        if (dates.length > 0) {
          nextDelivery = dates[0].toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        }
      }

      sections.push(`=== CSA STATUS ===\nActive members: ${activeCount} | Renewals needed: ${renewalCount} | Next delivery: ${nextDelivery}`);
    }
  } catch (e) {
    sections.push(`CSA_Members: Error (${e.message})`);
  }

  // --- CSA_BoxContents ---
  try {
    const sheet = getSheet('CSA_BoxContents');
    if (sheet.error) {
      sections.push(`CSA_BoxContents: Unavailable (${sheet.error})`);
    } else if (sheet.data.length === 0) {
      sections.push('=== THIS WEEK\'S CSA BOX ===\nNo box contents yet');
    } else {
      const h = sheet.headers;
      const iDate = colIdx(h, 'week_of', 'date', 'week');
      const iItem = colIdx(h, 'item', 'product', 'crop');
      const iQty = colIdx(h, 'quantity', 'qty');
      const iUnit = colIdx(h, 'unit');

      // Find the most recent week
      let latestRows = sheet.data;
      if (iDate !== -1) {
        const datesWithRows = sheet.data
          .map(r => ({ date: parseDate(r[iDate]), row: r }))
          .filter(x => x.date);
        if (datesWithRows.length > 0) {
          datesWithRows.sort((a, b) => b.date - a.date);
          const latestDate = datesWithRows[0].date.toDateString();
          latestRows = datesWithRows.filter(x => x.date.toDateString() === latestDate).map(x => x.row);
        }
      }

      const lines = latestRows.map(r =>
        `- ${r[iItem] || '?'}: ${r[iQty] || '?'} ${r[iUnit] || ''}`
      );
      sections.push('=== THIS WEEK\'S CSA BOX ===\n' + lines.join('\n'));
    }
  } catch (e) {
    sections.push(`CSA_BoxContents: Error (${e.message})`);
  }

  // --- WHOLESALE_CUSTOMERS ---
  try {
    const sheet = getSheet('WHOLESALE_CUSTOMERS');
    if (sheet.error) {
      sections.push(`WHOLESALE_CUSTOMERS: Unavailable (${sheet.error})`);
    } else if (sheet.data.length === 0) {
      sections.push('=== WHOLESALE ACCOUNTS ===\nNo accounts yet');
    } else {
      const h = sheet.headers;
      const iName = colIdx(h, 'name', 'customer_name', 'business_name');
      const iContact = colIdx(h, 'contact', 'contact_name', 'email', 'phone');
      const iStatus = colIdx(h, 'status');
      const iLastOrder = colIdx(h, 'last_order', 'last_order_date');

      const active = sheet.data.filter(r => (r[iStatus] || '').toLowerCase().trim() === 'active');
      const top5 = active.slice(0, 5);
      const lines = top5.map(r =>
        `- ${r[iName] || '?'} | Contact: ${r[iContact] || '-'} | Last order: ${r[iLastOrder] || '-'}`
      );
      sections.push(`=== WHOLESALE ACCOUNTS ===\nActive: ${active.length}\n${lines.join('\n')}`);
    }
  } catch (e) {
    sections.push(`WHOLESALE_CUSTOMERS: Error (${e.message})`);
  }

  // --- WHOLESALE_STANDING_ORDERS ---
  try {
    const sheet = getSheet('WHOLESALE_STANDING_ORDERS');
    if (sheet.error) {
      sections.push(`WHOLESALE_STANDING_ORDERS: Unavailable (${sheet.error})`);
    } else if (sheet.data.length === 0) {
      sections.push('=== STANDING ORDERS ===\nNo standing orders yet');
    } else {
      const h = sheet.headers;
      const iCustomer = colIdx(h, 'customer_name', 'customer', 'name');
      const iItems = colIdx(h, 'items', 'products', 'order_items');
      const iFreq = colIdx(h, 'frequency', 'schedule');
      const iNext = colIdx(h, 'next_delivery', 'next_date', 'delivery_date');
      const iStatus = colIdx(h, 'status');

      const active = sheet.data.filter(r => {
        const s = (r[iStatus] || '').toLowerCase().trim();
        return s === '' || s === 'active'; // include rows with no status too
      });

      const lines = active.map(r =>
        `- ${r[iCustomer] || '?'} | ${r[iItems] || '-'} | ${r[iFreq] || '-'} | Next: ${r[iNext] || '-'}`
      );
      sections.push('=== STANDING ORDERS ===\n' + (lines.length ? lines.join('\n') : 'No active standing orders'));
    }
  } catch (e) {
    sections.push(`WHOLESALE_STANDING_ORDERS: Error (${e.message})`);
  }

  // --- FIN_BANK_ACCOUNTS ---
  try {
    const sheet = getSheet('FIN_BANK_ACCOUNTS');
    if (sheet.error) {
      sections.push(`FIN_BANK_ACCOUNTS: Unavailable (${sheet.error})`);
    } else if (sheet.data.length === 0) {
      sections.push('=== BANK BALANCES ===\nNo accounts yet');
    } else {
      const h = sheet.headers;
      const iName = colIdx(h, 'account_name', 'name', 'account', 'bank');
      const iBalance = colIdx(h, 'current_balance', 'balance', 'amount');

      const lines = sheet.data.map(r =>
        `- ${r[iName] || '?'}: $${r[iBalance] || '0'}`
      );
      sections.push('=== BANK BALANCES ===\n' + lines.join('\n'));
    }
  } catch (e) {
    sections.push(`FIN_BANK_ACCOUNTS: Error (${e.message})`);
  }

  // --- FIN_BILLS ---
  try {
    const sheet = getSheet('FIN_BILLS');
    if (sheet.error) {
      sections.push(`FIN_BILLS: Unavailable (${sheet.error})`);
    } else if (sheet.data.length === 0) {
      sections.push('=== BILLS DUE ===\nNo bills tracked');
    } else {
      const h = sheet.headers;
      const iName = colIdx(h, 'name', 'vendor', 'description', 'bill_name');
      const iAmount = colIdx(h, 'amount', 'total', 'balance_due');
      const iDue = colIdx(h, 'due_date', 'due', 'date_due');
      const iBillStatus = colIdx(h, 'status');

      const dueSoon = sheet.data.filter(r => {
        const s = (r[iBillStatus] || '').toLowerCase().trim();
        if (s === 'paid') return false;
        const d = parseDate(r[iDue]);
        return d && daysDiff(d) <= 14;
      });

      if (dueSoon.length === 0) {
        sections.push('=== BILLS DUE ===\nNo bills due in next 14 days');
      } else {
        const lines = dueSoon.map(r =>
          `- ${r[iName] || '?'}: $${r[iAmount] || '?'} | Due: ${r[iDue] || '?'} | ${r[iBillStatus] || '-'}`
        );
        sections.push('=== BILLS DUE ===\n' + lines.join('\n'));
      }
    }
  } catch (e) {
    sections.push(`FIN_BILLS: Error (${e.message})`);
  }

  // --- HARVEST_LOG ---
  try {
    const sheet = getSheet('HARVEST_LOG');
    if (sheet.error) {
      sections.push(`HARVEST_LOG: Unavailable (${sheet.error})`);
    } else if (sheet.data.length === 0) {
      sections.push('=== RECENT HARVESTS ===\nNo harvests logged');
    } else {
      const h = sheet.headers;
      const iDate = colIdx(h, 'date', 'harvest_date');
      const iCrop = colIdx(h, 'crop', 'crop_name', 'item');
      const iQty = colIdx(h, 'quantity', 'qty', 'amount');
      const iUnit = colIdx(h, 'unit');
      const iBed = colIdx(h, 'field', 'bed', 'bed_id', 'location');

      const recent = sheet.data.filter(r => {
        const d = parseDate(r[iDate]);
        return d && daysDiff(d) >= -7 && daysDiff(d) <= 0;
      });

      if (recent.length === 0) {
        sections.push('=== RECENT HARVESTS (last 7 days) ===\nNo harvests in last 7 days');
      } else {
        const lines = recent.map(r =>
          `- ${r[iDate] || '?'}: ${r[iCrop] || '?'} — ${r[iQty] || '?'} ${r[iUnit] || ''} (${r[iBed] || '-'})`
        );
        sections.push('=== RECENT HARVESTS (last 7 days) ===\n' + lines.join('\n'));
      }
    }
  } catch (e) {
    sections.push(`HARVEST_LOG: Error (${e.message})`);
  }

  // --- SALES_MarketItems ---
  try {
    const sheet = getSheet('SALES_MarketItems');
    if (sheet.error) {
      sections.push(`SALES_MarketItems: Unavailable (${sheet.error})`);
    } else if (sheet.data.length === 0) {
      sections.push('=== MARKET AVAILABILITY ===\nNo market items yet');
    } else {
      const h = sheet.headers;
      const iItem = colIdx(h, 'item', 'product', 'crop', 'name');
      const iQty = colIdx(h, 'quantity', 'qty', 'available');
      const iPrice = colIdx(h, 'price', 'unit_price');
      const iStatus = colIdx(h, 'status', 'available', 'active');

      const available = sheet.data.filter(r => {
        const s = (r[iStatus] || '').toLowerCase().trim();
        return s === '' || s === 'active' || s === 'available' || s === 'yes' || s === 'true';
      });

      if (available.length === 0) {
        sections.push('=== MARKET AVAILABILITY ===\nNo items currently available');
      } else {
        const lines = available.map(r =>
          `- ${r[iItem] || '?'}: ${r[iQty] || '?'} @ $${r[iPrice] || '?'}`
        );
        sections.push('=== MARKET AVAILABILITY ===\n' + lines.join('\n'));
      }
    }
  } catch (e) {
    sections.push(`SALES_MarketItems: Error (${e.message})`);
  }

  // Cap total output to ~4000 chars
  let output = sections.join('\n\n');
  if (output.length > 4000) {
    output = output.substring(0, 3997) + '...';
  }
  return output;
}

// ─── Weather fetcher ─────────────────────────────────────────────────
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

async function fetchWeather() {
  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=40.7&longitude=-80.1&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&hourly=temperature_2m&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FNew_York&forecast_days=7';
    const res = await fetch(url);
    const data = await res.json();

    const days = data.daily.time.map((date, i) => {
      const code = data.daily.weathercode[i];
      const desc = weatherCodeDescription(code);
      const high = Math.round(data.daily.temperature_2m_max[i]);
      const low = Math.round(data.daily.temperature_2m_min[i]);
      const rain = data.daily.precipitation_probability_max[i];
      const frost = low <= 35 ? ' ⚠️ FROST RISK' : '';
      return `- ${date}: ${desc}, ${low}°F–${high}°F, ${rain}% rain chance${frost}`;
    });

    return 'WEATHER FORECAST (Rochester PA, next 7 days):\n' + days.join('\n');
  } catch (e) {
    return `WEATHER: Unavailable (${e.message})`;
  }
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
  version: '3.0.0',
  phase: '3A',
  googleConnected: true,
  sheetsConnected: true,
  timestamp: new Date().toISOString(),
}));

// ─── Morning brief manual/cron trigger ───────────────────────────────────────
fastify.post('/api/run/morning-brief', async (request, reply) => {
  const secret = request.headers['x-cron-secret'];
  if (secret !== process.env.CRON_SECRET) {
    reply.status(401).send({ error: 'Unauthorized' });
    return;
  }
  try {
    // Dynamically import and run morning brief
    const { sendMorningBrief } = await import('./morningBrief.js');
    await sendMorningBrief();
    reply.send({ success: true, message: 'Morning brief sent', timestamp: new Date().toISOString() });
  } catch (err) {
    fastify.log.error({ err }, 'Morning brief trigger error');
    reply.status(500).send({ success: false, error: err.message });
  }
});

// ─── Chief of Staff tools ─────────────────────────────────────────────────────
const COS_TOOLS = [
  {
    name: 'search_emails',
    description: 'Search Gmail for emails matching a query. Use when Todd asks to find specific emails, check if someone replied, or look up past correspondence.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Gmail search query (e.g. "from:molly@horizon.org", "subject:lease", "is:unread from:FSA")' },
        maxResults: { type: 'number', description: 'Max emails to return (default 5, max 10)' }
      },
      required: ['query']
    }
  },
  {
    name: 'draft_email',
    description: 'Create a draft email for Todd to review and send. ALWAYS use this instead of claiming to send an email. Returns a draft that Todd must approve.',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject line' },
        body: { type: 'string', description: 'Email body text (plain text, no HTML)' },
        cc: { type: 'string', description: 'CC email address (optional)' }
      },
      required: ['to', 'subject', 'body']
    }
  },
  {
    name: 'create_calendar_event',
    description: 'Create a Google Calendar event. Always confirm details with Todd before calling this. Returns the created event for confirmation.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Event title' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        startTime: { type: 'string', description: 'Start time in HH:MM format (24h), e.g. "09:00"' },
        endTime: { type: 'string', description: 'End time in HH:MM format (24h), e.g. "10:00"' },
        description: { type: 'string', description: 'Event description or notes' },
        location: { type: 'string', description: 'Event location (optional)' }
      },
      required: ['title', 'date', 'startTime', 'endTime']
    }
  },
  {
    name: 'read_sheet',
    description: 'Read data from a specific Google Sheets tab. Use when Todd asks about specific farm data not already in context.',
    input_schema: {
      type: 'object',
      properties: {
        tabName: { type: 'string', description: 'The exact sheet tab name (e.g. "UNIFIED_TASKS", "PLANNING_2026", "HARVEST_LOG", "CSA_Members", "WHOLESALE_CUSTOMERS", "FIN_BANK_ACCOUNTS")' },
        filter: { type: 'string', description: 'Optional: describe what rows to filter for (e.g. "only active members", "due this week")' }
      },
      required: ['tabName']
    }
  }
];

// ─── Tool execution ───────────────────────────────────────────────────────────
async function executeTool(toolName, toolInput) {
  switch (toolName) {
    case 'search_emails':
      return await toolSearchEmails(toolInput);
    case 'draft_email':
      return await toolDraftEmail(toolInput);
    case 'create_calendar_event':
      return await toolCreateCalendarEvent(toolInput);
    case 'read_sheet':
      return await toolReadSheet(toolInput);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

async function toolSearchEmails({ query, maxResults = 5 }) {
  try {
    const list = await gmail.users.messages.list({
      userId: 'me',
      maxResults: Math.min(maxResults, 10),
      q: query,
    });
    if (!list.data.messages?.length) return { results: [], message: 'No emails found matching that query.' };

    const details = await Promise.all(
      list.data.messages.slice(0, maxResults).map(async (msg) => {
        try {
          const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'metadata',
            metadataHeaders: ['From', 'Subject', 'Date'] });
          const h = detail.data.payload.headers;
          return {
            id: msg.id,
            from: h.find(x => x.name === 'From')?.value,
            subject: h.find(x => x.name === 'Subject')?.value,
            date: h.find(x => x.name === 'Date')?.value,
            snippet: detail.data.snippet,
          };
        } catch { return null; }
      })
    );
    return { results: details.filter(Boolean) };
  } catch (e) {
    return { error: e.message };
  }
}

async function toolDraftEmail({ to, subject, body, cc }) {
  try {
    // Save as Gmail draft
    const messageParts = [
      `From: ${process.env.TODD_EMAIL || 'me'}`,
      `To: ${to}`,
      cc ? `Cc: ${cc}` : '',
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      body,
    ].filter(Boolean);

    const raw = Buffer.from(messageParts.join('\r\n'))
      .toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const draft = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: { message: { raw } },
    });

    return {
      success: true,
      draftId: draft.data.id,
      message: `Draft created in Gmail. To: ${to} | Subject: ${subject}`,
      note: 'The draft is saved in your Gmail Drafts folder. Open Gmail to review and send it.',
      preview: { to, subject, body: body.substring(0, 200) + (body.length > 200 ? '...' : '') }
    };
  } catch (e) {
    return { error: e.message };
  }
}

async function toolCreateCalendarEvent({ title, date, startTime, endTime, description, location }) {
  try {
    const timeZone = 'America/New_York';
    const event = {
      summary: title,
      description: description || '',
      location: location || '',
      start: { dateTime: `${date}T${startTime}:00`, timeZone },
      end: { dateTime: `${date}T${endTime}:00`, timeZone },
    };
    const result = await calendarApi.events.insert({ calendarId: 'primary', requestBody: event });
    return {
      success: true,
      eventId: result.data.id,
      link: result.data.htmlLink,
      message: `Event created: "${title}" on ${date} from ${startTime} to ${endTime} Eastern`,
    };
  } catch (e) {
    return { error: e.message };
  }
}

async function toolReadSheet({ tabName, filter }) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: tabName,
    });
    const rows = res.data.values || [];
    if (rows.length < 2) return { data: [], message: `${tabName} has no data yet.` };

    const headers = rows[0];
    const data = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => { if (row[i] !== undefined && row[i] !== '') obj[h] = row[i]; });
      return obj;
    }).filter(obj => Object.keys(obj).length > 0);

    // Apply simple text filter if provided
    let filtered = data;
    if (filter) {
      const f = filter.toLowerCase();
      filtered = data.filter(row =>
        Object.values(row).some(v => String(v).toLowerCase().includes(f))
      );
    }

    return {
      tab: tabName,
      totalRows: data.length,
      returnedRows: filtered.length,
      data: filtered.slice(0, 30), // cap at 30 rows to avoid context overload
      note: filtered.length > 30 ? `Showing first 30 of ${filtered.length} matching rows` : undefined
    };
  } catch (e) {
    return { error: `Could not read ${tabName}: ${e.message}` };
  }
}

// ─── Streaming chat with tool use ────────────────────────────────────────────
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
    const [liveContext, sheetsContext, weatherContext] = await Promise.all([
      fetchLiveContext(),
      fetchSheetsContext(),
      fetchWeather(),
    ]);
    const systemPrompt = BASE_SYSTEM
      + '\n\n=== LIVE DATA (fetched now) ===\n' + liveContext
      + '\n\n=== FARM DATA (Google Sheets) ===\n' + sheetsContext
      + '\n\n=== WEATHER ===\n' + weatherContext;

    let messages = [
      ...history.slice(-20),
      { role: 'user', content: message },
    ];

    // Tool use loop — keep going until no more tool calls
    let loopCount = 0;
    while (loopCount < 5) {
      loopCount++;
      const stream = anthropic.messages.stream({
        model: 'claude-sonnet-4-5',
        max_tokens: 2048,
        system: systemPrompt,
        tools: COS_TOOLS,
        messages,
      });

      let assistantContent = [];
      let hasToolUse = false;
      let currentTextBlock = '';

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_start') {
          if (chunk.content_block.type === 'text') {
            currentTextBlock = '';
          } else if (chunk.content_block.type === 'tool_use') {
            hasToolUse = true;
            assistantContent.push({
              type: 'tool_use',
              id: chunk.content_block.id,
              name: chunk.content_block.name,
              input: {},
            });
          }
        } else if (chunk.type === 'content_block_delta') {
          if (chunk.delta?.type === 'text_delta') {
            currentTextBlock += chunk.delta.text;
            reply.raw.write(`data: ${JSON.stringify({ type: 'token', text: chunk.delta.text })}\n\n`);
          } else if (chunk.delta?.type === 'input_json_delta') {
            // Accumulate tool input JSON
            const lastTool = assistantContent[assistantContent.length - 1];
            if (lastTool?.type === 'tool_use') {
              lastTool._inputJson = (lastTool._inputJson || '') + chunk.delta.partial_json;
            }
          }
        } else if (chunk.type === 'content_block_stop') {
          if (currentTextBlock) {
            assistantContent.push({ type: 'text', text: currentTextBlock });
            currentTextBlock = '';
          }
          // Parse accumulated JSON for tool inputs
          const lastBlock = assistantContent[assistantContent.length - 1];
          if (lastBlock?.type === 'tool_use' && lastBlock._inputJson) {
            try {
              lastBlock.input = JSON.parse(lastBlock._inputJson);
            } catch {}
            delete lastBlock._inputJson;
          }
        }
      }

      if (!hasToolUse) break; // No tool calls — we're done

      // Add assistant message with tool use
      messages.push({ role: 'assistant', content: assistantContent });

      // Execute all tools and collect results
      const toolResults = [];
      for (const block of assistantContent) {
        if (block.type !== 'tool_use') continue;

        // Tell the frontend a tool is running
        reply.raw.write(`data: ${JSON.stringify({ type: 'tool_call', tool: block.name, input: block.input })}\n\n`);

        const result = await executeTool(block.name, block.input);

        reply.raw.write(`data: ${JSON.stringify({ type: 'tool_result', tool: block.name })}\n\n`);

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }

      // Add tool results and loop back for Claude's response
      messages.push({ role: 'user', content: toolResults });
    }

    reply.raw.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);

  } catch (error) {
    fastify.log.error({ err: error }, 'Streaming error');
    reply.raw.write(`data: ${JSON.stringify({ type: 'error', message: 'Service error. Please try again.' })}\n\n`);
  } finally {
    reply.raw.end();
  }
});

// ─── Sheets summary endpoint (debug / future use) ────────────────────
fastify.get('/api/sheets/summary', async (request, reply) => {
  const context = await fetchSheetsContext();
  reply.send({ context, timestamp: new Date().toISOString() });
});

// ─── Email approval endpoints ─────────────────────────────────────────
fastify.get('/approve/:token', async (request, reply) => {
  const { token } = request.params;
  const { getApprovalToken, markDraftSent } = await import('./db.js');

  const email = await getApprovalToken(token);

  if (!email) {
    reply.type('text/html').send(`<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:500px;margin:60px auto;text-align:center">
      <div style="font-size:48px">⚠️</div>
      <h2>Link expired or already used</h2>
      <p style="color:#6b7280">This approval link has expired (48h) or the reply was already sent.</p>
    </body></html>`);
    return;
  }

  try {
    // Send the draft reply via Gmail
    const messageParts = [
      `From: ${process.env.TODD_EMAIL}`,
      `To: ${email.from_address}`,
      `Subject: Re: ${email.subject}`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      email.draft_reply,
    ];
    const raw = Buffer.from(messageParts.join('\r\n'))
      .toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });

    await markDraftSent(email.id);

    reply.type('text/html').send(`<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:500px;margin:60px auto;text-align:center">
      <div style="font-size:48px">✅</div>
      <h2>Reply sent!</h2>
      <p style="color:#374151">Your reply to <strong>${email.from_address}</strong> has been sent.</p>
      <p style="color:#6b7280;font-size:13px">Subject: Re: ${email.subject}</p>
    </body></html>`);
  } catch (err) {
    fastify.log.error({ err }, 'Failed to send approved reply');
    reply.type('text/html').send(`<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:500px;margin:60px auto;text-align:center">
      <div style="font-size:48px">❌</div>
      <h2>Failed to send</h2>
      <p style="color:#6b7280">${err.message}</p>
    </body></html>`);
  }
});

fastify.get('/reject/:token', async (request, reply) => {
  reply.type('text/html').send(`<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:500px;margin:60px auto;text-align:center">
    <div style="font-size:48px">🗑️</div>
    <h2>Draft discarded</h2>
    <p style="color:#6b7280">The draft reply has been discarded. No email was sent.</p>
  </body></html>`);
});

// ─── Start ────────────────────────────────────────────────────────────
const port = parseInt(process.env.PORT || '3000', 10);
try {
  await fastify.listen({ port, host: '0.0.0.0' });
  console.log(`Tiny Seed Railway API v3.0 (Phase 3A: Sheets + Weather) running on port ${port}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}

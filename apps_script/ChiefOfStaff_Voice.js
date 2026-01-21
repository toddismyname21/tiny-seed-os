/**
 * ========================================
 * CHIEF OF STAFF - VOICE INTERFACE
 * ========================================
 *
 * STATE-OF-THE-ART Voice command system for hands-free operation
 * Perfect for field work when hands are dirty or driving tractor
 *
 * Architecture:
 * - Web app captures voice via Web Speech API
 * - Transcription sent to Apps Script
 * - Command parsing via Claude AI
 * - Response generated and spoken back via TTS
 *
 * Commands supported:
 * - "Hey Chief, what's urgent today?"
 * - "Read me [X]'s email"
 * - "Approve the response to [X]"
 * - "Schedule a follow-up with [X] for [date]"
 * - "What's my day look like?"
 * - "Send acknowledgment to [X]"
 *
 * @author Claude PM_Architect
 * @version 1.0.0
 * @date 2026-01-21
 */

// ==========================================
// VOICE COMMAND PARSER
// ==========================================

/**
 * Parse voice command and execute appropriate action
 * Uses Claude AI for natural language understanding
 *
 * @param {string} transcript - Voice transcription
 * @param {string} userId - User ID for context
 * @returns {Object} Response with action taken and spoken response
 */
function parseVoiceCommand(transcript, userId = 'todd') {
  const startTime = new Date();

  try {
    // Clean transcript
    const cleanTranscript = transcript.toLowerCase().trim();

    // Check for wake word
    const wakeWords = ['hey chief', 'chief', 'hey assistant', 'assistant'];
    let hasWakeWord = false;
    let command = cleanTranscript;

    for (const wake of wakeWords) {
      if (cleanTranscript.startsWith(wake)) {
        hasWakeWord = true;
        command = cleanTranscript.substring(wake.length).trim();
        // Remove leading comma or punctuation
        command = command.replace(/^[,\s]+/, '');
        break;
      }
    }

    // Quick-match common commands for speed
    const quickMatch = matchQuickCommand(command);
    if (quickMatch.matched) {
      return executeVoiceAction(quickMatch.action, quickMatch.params, userId);
    }

    // Use Claude for complex commands
    const aiParsed = parseCommandWithAI(command, userId);
    return executeVoiceAction(aiParsed.action, aiParsed.params, userId);

  } catch (error) {
    console.error('Voice command error:', error);
    return {
      success: false,
      action: 'error',
      spoken: "I'm sorry, I couldn't understand that command. Could you try again?",
      error: error.message
    };
  }
}

/**
 * Quick pattern matching for common commands (faster than AI)
 */
function matchQuickCommand(command) {
  const patterns = [
    {
      patterns: ["what's urgent", "whats urgent", "what is urgent", "urgent today", "what needs attention"],
      action: 'get_urgent',
      params: {}
    },
    {
      patterns: ["what's my day", "whats my day", "my schedule", "my day look like", "today's schedule"],
      action: 'get_schedule',
      params: {}
    },
    {
      patterns: ["morning brief", "daily brief", "brief me", "what should i know"],
      action: 'get_brief',
      params: {}
    },
    {
      patterns: ["how many emails", "email count", "inbox status"],
      action: 'get_inbox_status',
      params: {}
    },
    {
      patterns: ["pending approvals", "what needs approval", "approvals pending"],
      action: 'get_approvals',
      params: {}
    },
    {
      patterns: ["any follow ups", "follow ups due", "overdue follow"],
      action: 'get_followups',
      params: {}
    }
  ];

  for (const p of patterns) {
    for (const pattern of p.patterns) {
      if (command.includes(pattern)) {
        return { matched: true, action: p.action, params: p.params };
      }
    }
  }

  // Check for "read [person]'s email" pattern
  const readMatch = command.match(/read\s+(?:me\s+)?(\w+)(?:'s)?\s+email/i);
  if (readMatch) {
    return { matched: true, action: 'read_email', params: { person: readMatch[1] } };
  }

  // Check for "approve [something]" pattern
  const approveMatch = command.match(/approve\s+(?:the\s+)?(?:response\s+)?(?:to\s+)?(\w+)/i);
  if (approveMatch) {
    return { matched: true, action: 'approve_response', params: { person: approveMatch[1] } };
  }

  // Check for "schedule follow up" pattern
  const followupMatch = command.match(/schedule\s+(?:a\s+)?follow\s*up\s+(?:with\s+)?(\w+)/i);
  if (followupMatch) {
    return { matched: true, action: 'schedule_followup', params: { person: followupMatch[1] } };
  }

  return { matched: false };
}

/**
 * Use Claude AI to parse complex natural language commands
 */
function parseCommandWithAI(command, userId) {
  const prompt = `You are a voice command parser for an Email Chief-of-Staff system.
Parse this voice command and return a JSON action.

Available actions:
- get_urgent: Get urgent emails/tasks
- get_schedule: Get today's schedule
- get_brief: Get morning brief
- get_inbox_status: Get inbox statistics
- get_approvals: Get pending approvals
- get_followups: Get overdue follow-ups
- read_email: Read email from specific person (params: person)
- approve_response: Approve response to person (params: person)
- reject_response: Reject response to person (params: person)
- schedule_followup: Schedule follow-up (params: person, date)
- send_acknowledgment: Send quick acknowledgment (params: person)
- search_emails: Search emails (params: query)
- get_customer_info: Get customer information (params: name)
- unknown: Could not parse command

Voice command: "${command}"

Return ONLY valid JSON like:
{"action": "action_name", "params": {"key": "value"}}`;

  try {
    const response = callClaudeAPI(prompt, 'haiku');
    const parsed = JSON.parse(response.trim());
    return parsed;
  } catch (error) {
    console.error('AI parse error:', error);
    return { action: 'unknown', params: {} };
  }
}

/**
 * Execute the parsed voice action
 */
function executeVoiceAction(action, params, userId) {
  const responses = {
    get_urgent: executeGetUrgent,
    get_schedule: executeGetSchedule,
    get_brief: executeGetBrief,
    get_inbox_status: executeGetInboxStatus,
    get_approvals: executeGetApprovals,
    get_followups: executeGetFollowups,
    read_email: executeReadEmail,
    approve_response: executeApproveResponse,
    reject_response: executeRejectResponse,
    schedule_followup: executeScheduleFollowup,
    send_acknowledgment: executeSendAcknowledgment,
    search_emails: executeSearchEmails,
    get_customer_info: executeGetCustomerInfo,
    unknown: executeUnknown
  };

  const executor = responses[action] || executeUnknown;
  return executor(params, userId);
}

// ==========================================
// VOICE ACTION EXECUTORS
// ==========================================

function executeGetUrgent(params, userId) {
  try {
    // Get urgent from proactive alerts
    const alerts = getActiveAlerts('critical');
    const pendingApprovals = getPendingApprovals();
    const overdue = getOverdueFollowups();

    let spoken = '';
    const urgentCount = (alerts?.length || 0) +
                       (pendingApprovals?.filter(a => a.priority === 'high')?.length || 0) +
                       (overdue?.length || 0);

    if (urgentCount === 0) {
      spoken = "Good news! You have nothing urgent right now. Your inbox is under control.";
    } else {
      spoken = `You have ${urgentCount} urgent items. `;

      if (alerts?.length > 0) {
        spoken += `${alerts.length} proactive alert${alerts.length > 1 ? 's' : ''}. `;
        // Describe top alert
        spoken += alerts[0].spoken_summary || alerts[0].description + '. ';
      }

      const urgentApprovals = pendingApprovals?.filter(a => a.priority === 'high') || [];
      if (urgentApprovals.length > 0) {
        spoken += `${urgentApprovals.length} response${urgentApprovals.length > 1 ? 's' : ''} awaiting your approval. `;
      }

      if (overdue?.length > 0) {
        spoken += `${overdue.length} overdue follow-up${overdue.length > 1 ? 's' : ''}. `;
      }

      spoken += "Say 'get details' to hear more about any of these.";
    }

    return {
      success: true,
      action: 'get_urgent',
      data: { alerts, pendingApprovals, overdue, urgentCount },
      spoken: spoken
    };
  } catch (error) {
    return {
      success: false,
      action: 'get_urgent',
      spoken: "I had trouble checking urgent items. Let me try again in a moment.",
      error: error.message
    };
  }
}

function executeGetSchedule(params, userId) {
  try {
    const calendar = CalendarApp.getDefaultCalendar();
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const events = calendar.getEvents(today, tomorrow);

    let spoken = '';

    if (events.length === 0) {
      spoken = "Your calendar is clear today. Perfect time for field work or catching up on emails.";
    } else {
      spoken = `You have ${events.length} event${events.length > 1 ? 's' : ''} today. `;

      // List first 3 events
      const toDescribe = events.slice(0, 3);
      for (const event of toDescribe) {
        const time = Utilities.formatDate(event.getStartTime(), 'America/New_York', 'h:mm a');
        spoken += `At ${time}, ${event.getTitle()}. `;
      }

      if (events.length > 3) {
        spoken += `Plus ${events.length - 3} more later.`;
      }
    }

    return {
      success: true,
      action: 'get_schedule',
      data: { events: events.map(e => ({ title: e.getTitle(), start: e.getStartTime(), end: e.getEndTime() })) },
      spoken: spoken
    };
  } catch (error) {
    return {
      success: false,
      action: 'get_schedule',
      spoken: "I couldn't access your calendar. Please check permissions.",
      error: error.message
    };
  }
}

function executeGetBrief(params, userId) {
  try {
    // Call the morning brief generator
    const brief = generateMorningBrief();

    // Convert to spoken format
    let spoken = "Good morning! Here's your brief. ";

    if (brief.critical?.length > 0) {
      spoken += `${brief.critical.length} critical items need attention. `;
      spoken += brief.critical[0].spoken_summary || brief.critical[0].description + '. ';
    }

    if (brief.stats) {
      spoken += `You have ${brief.stats.pending_emails || 0} emails to review and ${brief.stats.pending_approvals || 0} approvals waiting. `;
    }

    if (brief.recommendations?.length > 0) {
      spoken += "My top recommendation: " + brief.recommendations[0] + '. ';
    }

    spoken += "Say 'more details' to dive deeper into any area.";

    return {
      success: true,
      action: 'get_brief',
      data: brief,
      spoken: spoken
    };
  } catch (error) {
    return {
      success: false,
      action: 'get_brief',
      spoken: "I couldn't generate your morning brief. Let me try again.",
      error: error.message
    };
  }
}

function executeGetInboxStatus(params, userId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const inbox = ss.getSheetByName('EMAIL_INBOX_STATE');

    if (!inbox) {
      return {
        success: true,
        action: 'get_inbox_status',
        spoken: "The inbox system hasn't been initialized yet. Would you like me to set it up?"
      };
    }

    const data = inbox.getDataRange().getValues();
    const statuses = { new: 0, triaged: 0, awaiting: 0, resolved: 0 };

    for (let i = 1; i < data.length; i++) {
      const status = data[i][4]?.toLowerCase() || 'new';
      if (statuses.hasOwnProperty(status)) statuses[status]++;
    }

    const total = data.length - 1;
    const spoken = `Your inbox has ${total} tracked emails. ${statuses.new} are new and need triage. ` +
                  `${statuses.triaged} have been triaged. ${statuses.awaiting} are awaiting response from others. ` +
                  `${statuses.resolved} have been resolved.`;

    return {
      success: true,
      action: 'get_inbox_status',
      data: statuses,
      spoken: spoken
    };
  } catch (error) {
    return {
      success: false,
      action: 'get_inbox_status',
      spoken: "I couldn't check inbox status right now.",
      error: error.message
    };
  }
}

function executeGetApprovals(params, userId) {
  try {
    const approvals = getPendingApprovals();

    if (!approvals || approvals.length === 0) {
      return {
        success: true,
        action: 'get_approvals',
        data: [],
        spoken: "You have no pending approvals. Everything is up to date!"
      };
    }

    let spoken = `You have ${approvals.length} pending approval${approvals.length > 1 ? 's' : ''}. `;

    // Describe top 3
    const toDescribe = approvals.slice(0, 3);
    for (let i = 0; i < toDescribe.length; i++) {
      const a = toDescribe[i];
      spoken += `${i + 1}: ${a.action_type} for ${a.recipient || 'unknown'}. `;
    }

    if (approvals.length > 3) {
      spoken += `Plus ${approvals.length - 3} more. `;
    }

    spoken += "Say 'approve' followed by the number, or 'approve all' to approve everything.";

    return {
      success: true,
      action: 'get_approvals',
      data: approvals,
      spoken: spoken
    };
  } catch (error) {
    return {
      success: false,
      action: 'get_approvals',
      spoken: "I couldn't retrieve pending approvals.",
      error: error.message
    };
  }
}

function executeGetFollowups(params, userId) {
  try {
    const overdue = getOverdueFollowups();

    if (!overdue || overdue.length === 0) {
      return {
        success: true,
        action: 'get_followups',
        data: [],
        spoken: "No overdue follow-ups. You're all caught up!"
      };
    }

    let spoken = `You have ${overdue.length} overdue follow-up${overdue.length > 1 ? 's' : ''}. `;

    for (let i = 0; i < Math.min(3, overdue.length); i++) {
      const f = overdue[i];
      const daysOverdue = Math.floor((new Date() - new Date(f.due_date)) / (1000 * 60 * 60 * 24));
      spoken += `${f.contact_name || f.subject}: ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue. `;
    }

    spoken += "Would you like me to draft follow-up emails?";

    return {
      success: true,
      action: 'get_followups',
      data: overdue,
      spoken: spoken
    };
  } catch (error) {
    return {
      success: false,
      action: 'get_followups',
      spoken: "I couldn't check follow-ups right now.",
      error: error.message
    };
  }
}

function executeReadEmail(params, userId) {
  try {
    const person = params.person;
    if (!person) {
      return {
        success: false,
        action: 'read_email',
        spoken: "I didn't catch who's email you want me to read. Please say the name again."
      };
    }

    // Search for recent email from this person
    const threads = GmailApp.search(`from:${person}`, 0, 1);

    if (threads.length === 0) {
      return {
        success: true,
        action: 'read_email',
        spoken: `I couldn't find any recent emails from ${person}. Try spelling the name or email address?`
      };
    }

    const message = threads[0].getMessages()[threads[0].getMessageCount() - 1];
    const subject = message.getSubject();
    const body = message.getPlainBody().substring(0, 500); // First 500 chars
    const from = message.getFrom();
    const date = message.getDate();

    // Clean body for speaking
    const cleanBody = body.replace(/\n+/g, '. ').replace(/https?:\/\/\S+/g, 'link').trim();

    const spoken = `Email from ${from}, received ${formatRelativeDate(date)}. ` +
                  `Subject: ${subject}. ` +
                  `Message: ${cleanBody}. ` +
                  `Would you like me to draft a response?`;

    return {
      success: true,
      action: 'read_email',
      data: { from, subject, body: cleanBody, date, threadId: threads[0].getId() },
      spoken: spoken
    };
  } catch (error) {
    return {
      success: false,
      action: 'read_email',
      spoken: `I had trouble finding ${params.person}'s email.`,
      error: error.message
    };
  }
}

function executeApproveResponse(params, userId) {
  try {
    const person = params.person;

    // Find pending approval for this person
    const approvals = getPendingApprovals();
    const match = approvals.find(a =>
      (a.recipient || '').toLowerCase().includes(person.toLowerCase()) ||
      (a.subject || '').toLowerCase().includes(person.toLowerCase())
    );

    if (!match) {
      return {
        success: false,
        action: 'approve_response',
        spoken: `I couldn't find a pending approval for ${person}. Say 'pending approvals' to hear what's waiting.`
      };
    }

    // Execute approval
    const result = approveEmailAction(match.action_id);

    if (result.success) {
      return {
        success: true,
        action: 'approve_response',
        data: result,
        spoken: `Done! I've approved and sent the response to ${person}.`
      };
    } else {
      return {
        success: false,
        action: 'approve_response',
        spoken: `I couldn't complete the approval. ${result.error || 'Please try again.'}`
      };
    }
  } catch (error) {
    return {
      success: false,
      action: 'approve_response',
      spoken: "I had trouble processing that approval.",
      error: error.message
    };
  }
}

function executeRejectResponse(params, userId) {
  try {
    const person = params.person;

    const approvals = getPendingApprovals();
    const match = approvals.find(a =>
      (a.recipient || '').toLowerCase().includes(person.toLowerCase())
    );

    if (!match) {
      return {
        success: false,
        action: 'reject_response',
        spoken: `I couldn't find a pending response for ${person}.`
      };
    }

    const result = rejectEmailAction(match.action_id, 'Rejected via voice command');

    return {
      success: true,
      action: 'reject_response',
      data: result,
      spoken: `I've rejected the response to ${person}. Would you like me to draft a new one?`
    };
  } catch (error) {
    return {
      success: false,
      action: 'reject_response',
      spoken: "I couldn't process that rejection.",
      error: error.message
    };
  }
}

function executeScheduleFollowup(params, userId) {
  try {
    const person = params.person;
    const dateStr = params.date || 'tomorrow';

    // Parse date
    const followupDate = parseFuzzyDate(dateStr);

    // Find email thread for this person
    const threads = GmailApp.search(`from:${person} OR to:${person}`, 0, 1);

    if (threads.length === 0) {
      return {
        success: false,
        action: 'schedule_followup',
        spoken: `I couldn't find any email conversation with ${person} to link the follow-up to.`
      };
    }

    const thread = threads[0];
    const result = createFollowUp(
      thread.getId(),
      thread.getLastMessageDate(),
      followupDate,
      `Voice-scheduled follow-up with ${person}`,
      'medium'
    );

    const dateFormatted = Utilities.formatDate(followupDate, 'America/New_York', 'EEEE, MMMM d');

    return {
      success: true,
      action: 'schedule_followup',
      data: result,
      spoken: `I've scheduled a follow-up with ${person} for ${dateFormatted}. I'll remind you when it's due.`
    };
  } catch (error) {
    return {
      success: false,
      action: 'schedule_followup',
      spoken: "I couldn't schedule that follow-up.",
      error: error.message
    };
  }
}

function executeSendAcknowledgment(params, userId) {
  try {
    const person = params.person;

    // Find most recent unread from this person
    const threads = GmailApp.search(`from:${person} is:unread`, 0, 1);

    if (threads.length === 0) {
      return {
        success: false,
        action: 'send_acknowledgment',
        spoken: `I don't see any unread emails from ${person} to acknowledge.`
      };
    }

    const thread = threads[0];
    const message = thread.getMessages()[thread.getMessageCount() - 1];

    // Get style profile for acknowledgment
    const stylePrompt = getStylePrompt ? getStylePrompt() : '';

    // Generate acknowledgment
    const ackPrompt = `Write a brief acknowledgment email (1-2 sentences) for this message.
${stylePrompt}

Original subject: ${message.getSubject()}
From: ${message.getFrom()}

Just acknowledge receipt and say you'll get back to them soon. Be brief and natural.`;

    const ackText = callClaudeAPI(ackPrompt, 'haiku');

    // Create draft
    const draft = message.createDraftReply(ackText);

    return {
      success: true,
      action: 'send_acknowledgment',
      data: { draftId: draft.getId(), recipient: message.getFrom() },
      spoken: `I've drafted an acknowledgment to ${person}. Say 'send it' to send now, or 'read it' to hear it first.`,
      draft: ackText
    };
  } catch (error) {
    return {
      success: false,
      action: 'send_acknowledgment',
      spoken: "I couldn't create that acknowledgment.",
      error: error.message
    };
  }
}

function executeSearchEmails(params, userId) {
  try {
    const query = params.query;
    const threads = GmailApp.search(query, 0, 5);

    if (threads.length === 0) {
      return {
        success: true,
        action: 'search_emails',
        data: [],
        spoken: `I didn't find any emails matching "${query}". Try different search terms?`
      };
    }

    let spoken = `Found ${threads.length} email${threads.length > 1 ? 's' : ''} matching your search. `;

    for (let i = 0; i < Math.min(3, threads.length); i++) {
      const t = threads[i];
      const lastMsg = t.getMessages()[t.getMessageCount() - 1];
      spoken += `${i + 1}: From ${lastMsg.getFrom().split('<')[0]}, subject ${t.getFirstMessageSubject()}. `;
    }

    return {
      success: true,
      action: 'search_emails',
      data: threads.map(t => ({
        id: t.getId(),
        subject: t.getFirstMessageSubject(),
        from: t.getMessages()[0].getFrom()
      })),
      spoken: spoken
    };
  } catch (error) {
    return {
      success: false,
      action: 'search_emails',
      spoken: "I had trouble searching emails.",
      error: error.message
    };
  }
}

function executeGetCustomerInfo(params, userId) {
  try {
    const name = params.name;

    // Use memory system if available
    if (typeof recallContact === 'function') {
      const contact = recallContact(name);

      if (contact) {
        let spoken = `Here's what I know about ${name}. `;
        if (contact.last_interaction) {
          spoken += `Last interaction was ${formatRelativeDate(new Date(contact.last_interaction))}. `;
        }
        if (contact.total_interactions) {
          spoken += `We've had ${contact.total_interactions} interactions. `;
        }
        if (contact.notes) {
          spoken += `Notes: ${contact.notes}. `;
        }
        return {
          success: true,
          action: 'get_customer_info',
          data: contact,
          spoken: spoken
        };
      }
    }

    // Fallback: Search customer sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const customers = ss.getSheetByName('Customers');

    if (customers) {
      const data = customers.getDataRange().getValues();
      const headers = data[0];

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const fullName = `${row[1]} ${row[2]}`.toLowerCase();
        if (fullName.includes(name.toLowerCase())) {
          const customer = {};
          headers.forEach((h, idx) => customer[h] = row[idx]);

          const spoken = `Found ${row[1]} ${row[2]}. Email: ${row[4]}. ` +
                        `Type: ${row[6] || 'unknown'}. ` +
                        (row[15] ? `Lifetime value: $${row[15]}. ` : '');

          return {
            success: true,
            action: 'get_customer_info',
            data: customer,
            spoken: spoken
          };
        }
      }
    }

    return {
      success: true,
      action: 'get_customer_info',
      spoken: `I don't have detailed records for ${name}. Would you like me to look them up in email history?`
    };
  } catch (error) {
    return {
      success: false,
      action: 'get_customer_info',
      spoken: "I couldn't retrieve customer information.",
      error: error.message
    };
  }
}

function executeUnknown(params, userId) {
  return {
    success: false,
    action: 'unknown',
    spoken: "I'm not sure what you're asking for. Try saying 'what's urgent', 'read me an email', or 'pending approvals'."
  };
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Format date relative to now (e.g., "2 hours ago", "yesterday")
 */
function formatRelativeDate(date) {
  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return Utilities.formatDate(date, 'America/New_York', 'MMMM d');
}

/**
 * Parse fuzzy date strings like "tomorrow", "next week", "in 3 days"
 */
function parseFuzzyDate(dateStr) {
  const now = new Date();
  const lower = dateStr.toLowerCase();

  if (lower === 'today') return now;
  if (lower === 'tomorrow') {
    return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
  if (lower.includes('next week')) {
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  // "in X days"
  const inDaysMatch = lower.match(/in\s+(\d+)\s+day/);
  if (inDaysMatch) {
    return new Date(now.getTime() + parseInt(inDaysMatch[1]) * 24 * 60 * 60 * 1000);
  }

  // Day of week
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = days.findIndex(d => lower.includes(d));
  if (dayIndex >= 0) {
    const currentDay = now.getDay();
    let daysAhead = dayIndex - currentDay;
    if (daysAhead <= 0) daysAhead += 7;
    return new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  }

  // Default to tomorrow
  return new Date(now.getTime() + 24 * 60 * 60 * 1000);
}

/**
 * Call Claude API (if not already defined elsewhere)
 */
function callClaudeAPI(prompt, model = 'sonnet') {
  // Check if already defined
  if (typeof askClaudeEmail === 'function') {
    return askClaudeEmail(prompt, model);
  }

  // Fallback implementation
  const apiKey = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  if (!apiKey) throw new Error('Claude API key not configured');

  const modelId = model === 'haiku' ? 'claude-3-5-haiku-20241022' : 'claude-sonnet-4-20250514';

  const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify({
      model: modelId,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const result = JSON.parse(response.getContentText());
  return result.content[0].text;
}

// ==========================================
// VOICE INTERFACE API ENDPOINTS
// ==========================================

/**
 * Main voice command endpoint
 */
function handleVoiceCommand(transcript) {
  return parseVoiceCommand(transcript);
}

/**
 * Get conversation state for multi-turn dialogs
 */
function getVoiceConversationState(sessionId) {
  const cache = CacheService.getUserCache();
  const state = cache.get(`voice_session_${sessionId}`);
  return state ? JSON.parse(state) : { context: null, lastAction: null };
}

/**
 * Save conversation state
 */
function saveVoiceConversationState(sessionId, state) {
  const cache = CacheService.getUserCache();
  cache.put(`voice_session_${sessionId}`, JSON.stringify(state), 300); // 5 min timeout
}

// ==========================================
// VOICE WEB APP GENERATOR
// ==========================================

/**
 * Generate the voice interface web app HTML
 * This creates a mobile-friendly voice interface
 */
function generateVoiceWebApp() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Chief of Staff - Voice</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      max-width: 400px;
      width: 100%;
      text-align: center;
    }
    h1 {
      font-size: 1.5rem;
      margin-bottom: 10px;
      opacity: 0.9;
    }
    .status {
      font-size: 0.9rem;
      opacity: 0.7;
      margin-bottom: 30px;
    }
    .mic-container {
      position: relative;
      margin: 40px 0;
    }
    .mic-button {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      border: none;
      background: linear-gradient(145deg, #4a5568, #2d3748);
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .mic-button:hover { transform: scale(1.05); }
    .mic-button.listening {
      background: linear-gradient(145deg, #38a169, #276749);
      animation: pulse 1.5s infinite;
    }
    .mic-button.processing {
      background: linear-gradient(145deg, #d69e2e, #b7791f);
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(56, 161, 105, 0.7); }
      70% { box-shadow: 0 0 0 30px rgba(56, 161, 105, 0); }
      100% { box-shadow: 0 0 0 0 rgba(56, 161, 105, 0); }
    }
    .mic-icon {
      width: 40px;
      height: 40px;
      fill: white;
    }
    .transcript {
      background: rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 15px;
      margin: 20px 0;
      min-height: 60px;
      font-size: 0.95rem;
    }
    .transcript.empty { opacity: 0.5; font-style: italic; }
    .response {
      background: rgba(56, 161, 105, 0.2);
      border-radius: 12px;
      padding: 15px;
      margin: 20px 0;
      min-height: 80px;
      text-align: left;
    }
    .hints {
      font-size: 0.8rem;
      opacity: 0.6;
      margin-top: 30px;
    }
    .hints p { margin: 5px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Chief of Staff</h1>
    <p class="status" id="status">Tap the mic to speak</p>

    <div class="mic-container">
      <button class="mic-button" id="micButton" onclick="toggleListening()">
        <svg class="mic-icon" viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
        </svg>
      </button>
    </div>

    <div class="transcript empty" id="transcript">Your words will appear here...</div>
    <div class="response" id="response" style="display:none;"></div>

    <div class="hints">
      <p>Try saying:</p>
      <p>"Hey Chief, what's urgent today?"</p>
      <p>"Read me Sarah's email"</p>
      <p>"What's my day look like?"</p>
    </div>
  </div>

  <script>
    const API_URL = '${ScriptApp.getService().getUrl()}';
    let recognition = null;
    let isListening = false;
    let synth = window.speechSynthesis;

    if ('webkitSpeechRecognition' in window) {
      recognition = new webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        isListening = true;
        document.getElementById('micButton').classList.add('listening');
        document.getElementById('status').textContent = 'Listening...';
        document.getElementById('transcript').textContent = '';
        document.getElementById('transcript').classList.add('empty');
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        document.getElementById('transcript').textContent = transcript;
        document.getElementById('transcript').classList.remove('empty');
      };

      recognition.onend = () => {
        isListening = false;
        document.getElementById('micButton').classList.remove('listening');
        const transcript = document.getElementById('transcript').textContent;
        if (transcript && !transcript.includes('Your words')) {
          processCommand(transcript);
        } else {
          document.getElementById('status').textContent = 'Tap the mic to speak';
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech error:', event.error);
        document.getElementById('status').textContent = 'Error: ' + event.error;
        isListening = false;
        document.getElementById('micButton').classList.remove('listening');
      };
    } else {
      document.getElementById('status').textContent = 'Speech recognition not supported';
      document.getElementById('micButton').disabled = true;
    }

    function toggleListening() {
      if (isListening) {
        recognition.stop();
      } else {
        recognition.start();
      }
    }

    async function processCommand(transcript) {
      document.getElementById('micButton').classList.add('processing');
      document.getElementById('status').textContent = 'Processing...';

      try {
        const response = await fetch(API_URL + '?action=voiceCommand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: transcript })
        });

        const result = await response.json();

        document.getElementById('response').style.display = 'block';
        document.getElementById('response').textContent = result.spoken || result.error || 'No response';
        document.getElementById('status').textContent = 'Tap the mic to speak';

        // Speak the response
        if (result.spoken && synth) {
          const utterance = new SpeechSynthesisUtterance(result.spoken);
          utterance.rate = 1.0;
          synth.speak(utterance);
        }
      } catch (error) {
        console.error('API error:', error);
        document.getElementById('response').style.display = 'block';
        document.getElementById('response').textContent = 'Error connecting to Chief of Staff';
        document.getElementById('status').textContent = 'Error - tap to retry';
      }

      document.getElementById('micButton').classList.remove('processing');
    }
  </script>
</body>
</html>`;
}

/**
 * Serve voice web app
 */
function doGetVoice(e) {
  return HtmlService.createHtmlOutput(generateVoiceWebApp())
    .setTitle('Chief of Staff - Voice')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

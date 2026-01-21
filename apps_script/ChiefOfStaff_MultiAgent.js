/**
 * ========================================
 * CHIEF OF STAFF - MULTI-AGENT ORCHESTRATION
 * ========================================
 *
 * STATE-OF-THE-ART multi-agent architecture
 * Specialized agents that collaborate for optimal outcomes
 *
 * Based on: CrewAI, SuperAGI, BCG Agentic AI patterns
 *
 * Agent Types:
 * 1. TRIAGE AGENT - Email classification specialist
 * 2. RESPONSE AGENT - Draft generation specialist
 * 3. RESEARCH AGENT - Information lookup specialist
 * 4. SCHEDULING AGENT - Calendar management specialist
 * 5. FINANCE AGENT - Invoice/payment specialist
 * 6. CUSTOMER AGENT - CRM specialist
 * 7. ORCHESTRATOR - Coordinates all agents
 *
 * @author Claude PM_Architect
 * @version 1.0.0
 * @date 2026-01-21
 */

// ==========================================
// AGENT DEFINITIONS
// ==========================================

const AGENT_REGISTRY = {
  triage: {
    name: 'Triage Agent',
    role: 'Email Classification Specialist',
    goal: 'Accurately classify and prioritize incoming emails',
    capabilities: ['classify_email', 'extract_urgency', 'detect_sentiment', 'identify_action_required'],
    tools: ['gmail_read', 'memory_recall', 'pattern_match'],
    autonomy_level: 3, // Can act without approval for classification
    prompt_template: `You are a Triage Agent specializing in email classification.
Your role: Analyze emails and determine priority, category, and required actions.
You have deep knowledge of:
- Tiny Seed Farm's customer base and patterns
- Email urgency indicators
- Seasonal farming communication patterns
- Business-critical vs routine correspondence

Always output structured JSON with: priority, category, action_required, confidence, reasoning`
  },

  response: {
    name: 'Response Agent',
    role: 'Email Draft Generation Specialist',
    goal: 'Generate high-quality responses that match owner style',
    capabilities: ['draft_reply', 'draft_forward', 'suggest_template', 'personalize_content'],
    tools: ['style_profile', 'memory_recall', 'template_match', 'gmail_draft'],
    autonomy_level: 1, // Requires approval before sending
    prompt_template: `You are a Response Agent specializing in email drafting.
Your role: Write email responses that perfectly match the owner's communication style.
You have access to:
- Owner's writing style profile
- Historical responses for reference
- Customer relationship context
- Template library for common scenarios

Write naturally, matching tone and vocabulary. Never sound robotic or generic.`
  },

  research: {
    name: 'Research Agent',
    role: 'Information Lookup Specialist',
    goal: 'Find relevant information to support other agents',
    capabilities: ['search_emails', 'search_drive', 'lookup_customer', 'find_order', 'check_inventory'],
    tools: ['gmail_search', 'drive_search', 'sheets_query', 'memory_recall'],
    autonomy_level: 4, // Full autonomy for lookups
    prompt_template: `You are a Research Agent specializing in information retrieval.
Your role: Find and synthesize information from across all systems.
You can access:
- Email history
- Customer records
- Order history
- Inventory data
- Document storage

Always cite your sources and indicate confidence level.`
  },

  scheduling: {
    name: 'Scheduling Agent',
    role: 'Calendar Management Specialist',
    goal: 'Optimize time management and prevent scheduling conflicts',
    capabilities: ['check_availability', 'create_event', 'reschedule', 'protect_focus_time', 'suggest_times'],
    tools: ['calendar_read', 'calendar_write', 'memory_preferences'],
    autonomy_level: 2, // Can suggest but needs approval to create
    prompt_template: `You are a Scheduling Agent specializing in time management.
Your role: Manage calendar, protect productive time, and optimize scheduling.
You understand:
- Farm work patterns (field time, market days, office time)
- Meeting preferences and optimal times
- Focus time requirements
- Seasonal variations in schedule

Always consider weather, farm operations, and energy levels.`
  },

  finance: {
    name: 'Finance Agent',
    role: 'Invoice and Payment Specialist',
    goal: 'Track financial correspondence and ensure timely payments',
    capabilities: ['detect_invoice', 'extract_amounts', 'track_payment', 'reconcile', 'flag_overdue'],
    tools: ['email_scan', 'sheets_finance', 'quickbooks_sync'],
    autonomy_level: 2, // Can flag but not execute payments
    prompt_template: `You are a Finance Agent specializing in financial tracking.
Your role: Identify and track all financial correspondence.
You can:
- Detect invoices and payment requests
- Extract amounts, dates, and terms
- Track payment status
- Flag overdue items
- Reconcile with accounting data

Always be precise with numbers. Flag any discrepancies immediately.`
  },

  customer: {
    name: 'Customer Agent',
    role: 'CRM and Relationship Specialist',
    goal: 'Maintain customer relationships and identify opportunities',
    capabilities: ['identify_customer', 'update_crm', 'track_interaction', 'predict_churn', 'suggest_outreach'],
    tools: ['memory_contacts', 'sheets_customers', 'email_history'],
    autonomy_level: 3, // Can update CRM automatically
    prompt_template: `You are a Customer Agent specializing in relationship management.
Your role: Track and enhance customer relationships.
You maintain:
- Customer interaction history
- Preference profiles
- Purchase patterns
- Satisfaction indicators
- Outreach schedules

Proactively identify customers who need attention.`
  },

  orchestrator: {
    name: 'Orchestrator',
    role: 'Multi-Agent Coordinator',
    goal: 'Coordinate agents for optimal outcomes',
    capabilities: ['assign_task', 'resolve_conflict', 'synthesize_results', 'escalate', 'optimize_workflow'],
    tools: ['all_agents', 'workflow_engine'],
    autonomy_level: 4, // Full autonomy for coordination
    prompt_template: `You are the Orchestrator coordinating all Chief-of-Staff agents.
Your role: Assign tasks to specialists, resolve conflicts, synthesize results.
You manage:
- Task routing to appropriate agents
- Parallel execution when possible
- Result aggregation and conflict resolution
- Escalation to human when needed
- Workflow optimization

Always choose the best agent for each subtask. Minimize latency.`
  }
};

// ==========================================
// AGENT EXECUTION ENGINE
// ==========================================

/**
 * Execute a single agent task
 *
 * @param {string} agentType - Agent to use (triage, response, etc.)
 * @param {Object} task - Task specification
 * @returns {Object} Agent result
 */
function executeAgent(agentType, task) {
  const agent = AGENT_REGISTRY[agentType];
  if (!agent) {
    throw new Error(`Unknown agent type: ${agentType}`);
  }

  const startTime = new Date();

  // Log agent activation
  logAgentActivity(agentType, 'start', task);

  try {
    // Build agent context
    const context = buildAgentContext(agent, task);

    // Execute agent logic
    const result = runAgentLogic(agent, task, context);

    // Log completion
    const duration = new Date() - startTime;
    logAgentActivity(agentType, 'complete', { ...task, result, duration });

    return {
      success: true,
      agent: agentType,
      result: result,
      duration: duration,
      confidence: result.confidence || 0.8
    };

  } catch (error) {
    logAgentActivity(agentType, 'error', { ...task, error: error.message });
    return {
      success: false,
      agent: agentType,
      error: error.message,
      duration: new Date() - startTime
    };
  }
}

/**
 * Build context for agent execution
 */
function buildAgentContext(agent, task) {
  const context = {
    agent: agent,
    task: task,
    memory: {},
    tools: {}
  };

  // Load relevant memory
  if (typeof buildCompleteContext === 'function') {
    context.memory = buildCompleteContext({
      email: task.email,
      sender: task.sender,
      subject: task.subject
    });
  }

  // Load tool functions
  for (const tool of agent.tools) {
    context.tools[tool] = getToolFunction(tool);
  }

  return context;
}

/**
 * Get tool function by name
 */
function getToolFunction(toolName) {
  const tools = {
    gmail_read: (params) => {
      const threads = GmailApp.search(params.query || '', 0, params.limit || 10);
      return threads.map(t => ({
        id: t.getId(),
        subject: t.getFirstMessageSubject(),
        from: t.getMessages()[0].getFrom(),
        date: t.getLastMessageDate()
      }));
    },

    gmail_search: (params) => {
      return GmailApp.search(params.query, 0, params.limit || 20);
    },

    gmail_draft: (params) => {
      if (params.replyTo) {
        const thread = GmailApp.getThreadById(params.replyTo);
        const msg = thread.getMessages()[thread.getMessageCount() - 1];
        return msg.createDraftReply(params.body);
      }
      return GmailApp.createDraft(params.to, params.subject, params.body);
    },

    memory_recall: (params) => {
      if (typeof recallContact === 'function') {
        return recallContact(params.email || params.name);
      }
      return null;
    },

    pattern_match: (params) => {
      if (typeof getPatternSuggestions === 'function') {
        return getPatternSuggestions(params.context);
      }
      return [];
    },

    style_profile: () => {
      if (typeof getStyleProfile === 'function') {
        return getStyleProfile();
      }
      return null;
    },

    template_match: (params) => {
      if (typeof findMatchingTemplates === 'function') {
        return findMatchingTemplates(params.category, params.context);
      }
      return [];
    },

    calendar_read: (params) => {
      const cal = CalendarApp.getDefaultCalendar();
      const start = params.start || new Date();
      const end = params.end || new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
      return cal.getEvents(start, end).map(e => ({
        title: e.getTitle(),
        start: e.getStartTime(),
        end: e.getEndTime(),
        id: e.getId()
      }));
    },

    calendar_write: (params) => {
      const cal = CalendarApp.getDefaultCalendar();
      return cal.createEvent(params.title, params.start, params.end, params.options || {});
    },

    sheets_query: (params) => {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(params.sheet);
      if (!sheet) return null;
      return sheet.getDataRange().getValues();
    },

    sheets_customers: () => {
      return getToolFunction('sheets_query')({ sheet: 'Customers' });
    },

    sheets_finance: () => {
      return getToolFunction('sheets_query')({ sheet: 'Invoices' });
    },

    drive_search: (params) => {
      const files = DriveApp.searchFiles(`title contains '${params.query}'`);
      const results = [];
      while (files.hasNext() && results.length < (params.limit || 10)) {
        const file = files.next();
        results.push({
          id: file.getId(),
          name: file.getName(),
          type: file.getMimeType(),
          url: file.getUrl()
        });
      }
      return results;
    }
  };

  return tools[toolName] || (() => null);
}

/**
 * Run agent logic with AI
 */
function runAgentLogic(agent, task, context) {
  // Build the prompt
  const prompt = `${agent.prompt_template}

TASK:
${JSON.stringify(task, null, 2)}

CONTEXT:
${JSON.stringify(context.memory, null, 2)}

Analyze this task and provide your specialized output.
Return valid JSON with your analysis and any actions to take.`;

  // Call Claude
  const response = callClaudeForAgent(prompt, agent.role);

  // Parse response
  try {
    return JSON.parse(response);
  } catch (e) {
    return {
      text: response,
      structured: false
    };
  }
}

/**
 * Call Claude API for agent
 */
function callClaudeForAgent(prompt, role) {
  // Use existing Claude function if available
  if (typeof askClaudeEmail === 'function') {
    return askClaudeEmail(prompt, 'haiku'); // Use haiku for speed
  }

  const apiKey = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  if (!apiKey) throw new Error('Claude API key not configured');

  const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1000,
      system: `You are the ${role} of the Chief-of-Staff system.`,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const result = JSON.parse(response.getContentText());
  return result.content[0].text;
}

// ==========================================
// MULTI-AGENT ORCHESTRATION
// ==========================================

/**
 * Process a complex task using multiple agents
 *
 * @param {Object} task - The task to process
 * @returns {Object} Aggregated results from all agents
 */
function orchestrateTask(task) {
  const startTime = new Date();

  // Determine which agents are needed
  const plan = planAgentExecution(task);

  // Execute agents according to plan
  const results = {};

  // Phase 1: Parallel information gathering
  if (plan.parallel && plan.parallel.length > 0) {
    // Execute in parallel (as much as Apps Script allows)
    for (const agentType of plan.parallel) {
      results[agentType] = executeAgent(agentType, {
        ...task,
        phase: 'gather'
      });
    }
  }

  // Phase 2: Sequential dependent tasks
  if (plan.sequential && plan.sequential.length > 0) {
    for (const step of plan.sequential) {
      const enrichedTask = {
        ...task,
        priorResults: results,
        phase: 'process'
      };
      results[step.agent] = executeAgent(step.agent, enrichedTask);

      // Check if we should stop
      if (step.stopOnFail && !results[step.agent].success) {
        break;
      }
    }
  }

  // Phase 3: Final synthesis
  const synthesis = synthesizeResults(task, results);

  return {
    success: true,
    task: task,
    plan: plan,
    agentResults: results,
    synthesis: synthesis,
    totalDuration: new Date() - startTime
  };
}

/**
 * Plan which agents to use and in what order
 */
function planAgentExecution(task) {
  const taskType = task.type || detectTaskType(task);

  const plans = {
    // Email processing: triage → research → response
    email_process: {
      parallel: ['triage', 'customer'],
      sequential: [
        { agent: 'research', condition: 'needs_context' },
        { agent: 'response', stopOnFail: true }
      ]
    },

    // Calendar request: scheduling with context
    calendar_request: {
      parallel: ['research', 'customer'],
      sequential: [
        { agent: 'scheduling', stopOnFail: true }
      ]
    },

    // Financial email: finance + research
    financial: {
      parallel: ['finance', 'research'],
      sequential: [
        { agent: 'customer' }
      ]
    },

    // Customer inquiry: full context gathering
    customer_inquiry: {
      parallel: ['customer', 'research', 'triage'],
      sequential: [
        { agent: 'response', stopOnFail: true }
      ]
    },

    // General: orchestrator decides
    general: {
      parallel: ['triage'],
      sequential: [
        { agent: 'research', condition: 'if_needed' },
        { agent: 'response' }
      ]
    }
  };

  return plans[taskType] || plans.general;
}

/**
 * Detect task type from task content
 */
function detectTaskType(task) {
  const content = JSON.stringify(task).toLowerCase();

  if (content.includes('invoice') || content.includes('payment') || content.includes('$')) {
    return 'financial';
  }
  if (content.includes('schedule') || content.includes('meeting') || content.includes('calendar')) {
    return 'calendar_request';
  }
  if (content.includes('customer') || content.includes('order') || content.includes('csa')) {
    return 'customer_inquiry';
  }
  if (task.email || task.thread_id) {
    return 'email_process';
  }

  return 'general';
}

/**
 * Synthesize results from multiple agents
 */
function synthesizeResults(task, agentResults) {
  // Collect all outputs
  const outputs = [];
  const errors = [];
  let totalConfidence = 0;
  let confidenceCount = 0;

  for (const [agent, result] of Object.entries(agentResults)) {
    if (result.success) {
      outputs.push({
        agent: agent,
        result: result.result
      });
      if (result.confidence) {
        totalConfidence += result.confidence;
        confidenceCount++;
      }
    } else {
      errors.push({
        agent: agent,
        error: result.error
      });
    }
  }

  // Build synthesis
  const synthesis = {
    success: errors.length === 0,
    totalAgents: Object.keys(agentResults).length,
    successfulAgents: outputs.length,
    failedAgents: errors.length,
    averageConfidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
    errors: errors
  };

  // Extract key outputs
  if (agentResults.triage?.success) {
    synthesis.priority = agentResults.triage.result?.priority;
    synthesis.category = agentResults.triage.result?.category;
  }

  if (agentResults.response?.success) {
    synthesis.draft = agentResults.response.result?.draft;
    synthesis.draftConfidence = agentResults.response.confidence;
  }

  if (agentResults.customer?.success) {
    synthesis.customerContext = agentResults.customer.result;
  }

  if (agentResults.scheduling?.success) {
    synthesis.schedulingAction = agentResults.scheduling.result;
  }

  if (agentResults.finance?.success) {
    synthesis.financialData = agentResults.finance.result;
  }

  return synthesis;
}

// ==========================================
// AGENT CONFLICT RESOLUTION
// ==========================================

/**
 * Resolve conflicts between agent outputs
 */
function resolveAgentConflict(agentA, resultA, agentB, resultB, conflictType) {
  // Priority rules for different conflict types
  const resolutionRules = {
    priority_disagreement: (a, b) => {
      // Higher confidence wins
      if (a.confidence > b.confidence + 0.1) return 'a';
      if (b.confidence > a.confidence + 0.1) return 'b';
      // Tie: prefer triage agent for priority
      if (agentA === 'triage') return 'a';
      if (agentB === 'triage') return 'b';
      return 'escalate';
    },

    action_disagreement: (a, b) => {
      // More specific action wins
      const specificityA = (a.action?.specificity || 0);
      const specificityB = (b.action?.specificity || 0);
      if (specificityA > specificityB) return 'a';
      if (specificityB > specificityA) return 'b';
      return 'escalate';
    },

    data_disagreement: (a, b) => {
      // More recent data wins
      const dateA = new Date(a.data_date || 0);
      const dateB = new Date(b.data_date || 0);
      if (dateA > dateB) return 'a';
      if (dateB > dateA) return 'b';
      return 'merge'; // Merge if same date
    }
  };

  const resolver = resolutionRules[conflictType] || (() => 'escalate');
  const decision = resolver(resultA, resultB);

  return {
    conflict: conflictType,
    agents: [agentA, agentB],
    decision: decision,
    winner: decision === 'a' ? agentA : decision === 'b' ? agentB : null,
    merged: decision === 'merge' ? mergeResults(resultA, resultB) : null,
    escalated: decision === 'escalate'
  };
}

/**
 * Merge two agent results
 */
function mergeResults(resultA, resultB) {
  return {
    ...resultA,
    ...resultB,
    merged: true,
    sources: [resultA, resultB]
  };
}

// ==========================================
// AGENT ACTIVITY LOGGING
// ==========================================

/**
 * Log agent activity for monitoring and learning
 */
function logAgentActivity(agentType, action, data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('COS_AGENT_LOG');

  if (!sheet) {
    sheet = ss.insertSheet('COS_AGENT_LOG');
    sheet.appendRow([
      'timestamp', 'agent', 'action', 'task_type', 'duration_ms',
      'success', 'confidence', 'data'
    ]);
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
  }

  sheet.appendRow([
    new Date().toISOString(),
    agentType,
    action,
    data.type || data.task?.type || 'unknown',
    data.duration || 0,
    data.result?.success ?? (action === 'complete'),
    data.result?.confidence || '',
    JSON.stringify(data).substring(0, 1000)
  ]);
}

// ==========================================
// AGENT PERFORMANCE METRICS
// ==========================================

/**
 * Get agent performance metrics
 */
function getAgentMetrics(days = 7) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('COS_AGENT_LOG');

  if (!sheet) {
    return { error: 'No agent log found' };
  }

  const data = sheet.getDataRange().getValues();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const metrics = {};

  for (const agent of Object.keys(AGENT_REGISTRY)) {
    metrics[agent] = {
      totalExecutions: 0,
      successCount: 0,
      errorCount: 0,
      totalDuration: 0,
      avgConfidence: 0,
      confidenceSum: 0
    };
  }

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const timestamp = new Date(row[0]);

    if (timestamp < cutoff) continue;

    const agent = row[1];
    const action = row[2];
    const duration = row[4] || 0;
    const success = row[5];
    const confidence = row[6] || 0;

    if (action !== 'complete') continue;

    if (metrics[agent]) {
      metrics[agent].totalExecutions++;
      metrics[agent].totalDuration += duration;

      if (success) {
        metrics[agent].successCount++;
      } else {
        metrics[agent].errorCount++;
      }

      if (confidence) {
        metrics[agent].confidenceSum += confidence;
      }
    }
  }

  // Calculate averages
  for (const agent of Object.keys(metrics)) {
    const m = metrics[agent];
    m.successRate = m.totalExecutions > 0 ? m.successCount / m.totalExecutions : 0;
    m.avgDuration = m.totalExecutions > 0 ? m.totalDuration / m.totalExecutions : 0;
    m.avgConfidence = m.successCount > 0 ? m.confidenceSum / m.successCount : 0;
  }

  return {
    period: `Last ${days} days`,
    agents: metrics,
    summary: {
      totalExecutions: Object.values(metrics).reduce((a, m) => a + m.totalExecutions, 0),
      overallSuccessRate: calculateOverallSuccessRate(metrics)
    }
  };
}

function calculateOverallSuccessRate(metrics) {
  let totalSuccess = 0;
  let totalExec = 0;

  for (const m of Object.values(metrics)) {
    totalSuccess += m.successCount;
    totalExec += m.totalExecutions;
  }

  return totalExec > 0 ? totalSuccess / totalExec : 0;
}

// ==========================================
// CREW-STYLE TASK DELEGATION
// ==========================================

/**
 * Create a crew (team of agents) for a complex mission
 */
function createCrew(mission) {
  return {
    mission: mission,
    agents: [],
    tasks: [],

    addAgent: function(agentType, customConfig = {}) {
      const base = AGENT_REGISTRY[agentType];
      if (!base) throw new Error(`Unknown agent: ${agentType}`);

      this.agents.push({
        ...base,
        type: agentType,
        ...customConfig
      });
      return this;
    },

    addTask: function(description, assignedAgent, dependencies = []) {
      this.tasks.push({
        id: `task_${this.tasks.length + 1}`,
        description: description,
        agent: assignedAgent,
        dependencies: dependencies,
        status: 'pending',
        result: null
      });
      return this;
    },

    execute: function() {
      const results = {};
      const completed = new Set();

      // Execute tasks respecting dependencies
      while (completed.size < this.tasks.length) {
        let progress = false;

        for (const task of this.tasks) {
          if (completed.has(task.id)) continue;

          // Check dependencies
          const depsReady = task.dependencies.every(d => completed.has(d));
          if (!depsReady) continue;

          // Execute task
          task.status = 'running';
          const priorResults = {};
          for (const depId of task.dependencies) {
            const depTask = this.tasks.find(t => t.id === depId);
            if (depTask) priorResults[depId] = depTask.result;
          }

          task.result = executeAgent(task.agent, {
            description: task.description,
            mission: this.mission,
            priorResults: priorResults
          });

          task.status = task.result.success ? 'completed' : 'failed';
          completed.add(task.id);
          results[task.id] = task.result;
          progress = true;
        }

        if (!progress && completed.size < this.tasks.length) {
          // Circular dependency or all remaining have unmet deps
          throw new Error('Crew execution stuck - check task dependencies');
        }
      }

      return {
        mission: this.mission,
        agents: this.agents.map(a => a.type),
        taskResults: results,
        allSucceeded: this.tasks.every(t => t.status === 'completed')
      };
    }
  };
}

// ==========================================
// API ENDPOINTS
// ==========================================

/**
 * Get list of available agents
 */
function getAvailableAgents() {
  return Object.entries(AGENT_REGISTRY).map(([type, agent]) => ({
    type: type,
    name: agent.name,
    role: agent.role,
    goal: agent.goal,
    capabilities: agent.capabilities,
    autonomyLevel: agent.autonomy_level
  }));
}

/**
 * Execute single agent task via API
 */
function runAgentTask(agentType, taskData) {
  return executeAgent(agentType, taskData);
}

/**
 * Execute multi-agent orchestration via API
 */
function runOrchestration(taskData) {
  return orchestrateTask(taskData);
}

/**
 * Create and execute a crew
 */
function runCrewMission(missionConfig) {
  const crew = createCrew(missionConfig.mission);

  for (const agent of missionConfig.agents || []) {
    crew.addAgent(agent);
  }

  for (const task of missionConfig.tasks || []) {
    crew.addTask(task.description, task.agent, task.dependencies || []);
  }

  return crew.execute();
}

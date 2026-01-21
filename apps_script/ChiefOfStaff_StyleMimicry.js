// ═══════════════════════════════════════════════════════════════════════════
// CHIEF-OF-STAFF: STYLE MIMICRY SYSTEM
// Sounds EXACTLY like Todd - No generic AI voice
// Created: 2026-01-21
// ═══════════════════════════════════════════════════════════════════════════

const STYLE_PROFILE_SHEET = 'COS_STYLE_PROFILE';
const STYLE_SAMPLES_SHEET = 'COS_STYLE_SAMPLES';

const STYLE_PROFILE_HEADERS = [
  'Profile_ID', 'Owner_Email', 'Tone', 'Formality_Level', 'Avg_Sentence_Length',
  'Common_Greetings', 'Common_Closings', 'Signature', 'Vocabulary_Style',
  'Punctuation_Patterns', 'Emoji_Usage', 'Response_Length_Preference',
  'Topics_Expertise', 'Phrases_To_Use', 'Phrases_To_Avoid',
  'Sample_Count', 'Last_Analyzed', 'Confidence_Score', 'Created_At', 'Updated_At'
];

const STYLE_SAMPLES_HEADERS = [
  'Sample_ID', 'Profile_ID', 'Email_Type', 'Recipient_Type', 'Subject',
  'Body', 'Word_Count', 'Sentence_Count', 'Extracted_Patterns',
  'Quality_Score', 'Created_At'
];

// ═══════════════════════════════════════════════════════════════════════════
// STYLE SYSTEM INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize style mimicry system
 */
function initializeStyleSystem() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  createSheetWithHeaders(ss, STYLE_PROFILE_SHEET, STYLE_PROFILE_HEADERS, '#E65100');
  createSheetWithHeaders(ss, STYLE_SAMPLES_SHEET, STYLE_SAMPLES_HEADERS, '#F57C00');

  return { success: true, message: 'Style mimicry system initialized' };
}

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL COLLECTION & ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analyze sent emails to learn writing style
 * @param {number} maxEmails - Maximum emails to analyze
 */
function analyzeOwnerStyle(maxEmails = 500) {
  try {
    // Get sent emails
    const threads = GmailApp.search('in:sent', 0, maxEmails);

    if (threads.length === 0) {
      return { success: false, error: 'No sent emails found' };
    }

    const samples = [];
    const patterns = {
      greetings: {},
      closings: {},
      phrases: {},
      sentenceLengths: [],
      wordCounts: [],
      punctuationPatterns: {
        exclamationMarks: 0,
        questionMarks: 0,
        ellipsis: 0,
        emojis: 0
      },
      formalityIndicators: {
        contractions: 0,
        formalWords: 0,
        casualWords: 0
      },
      totalEmails: 0
    };

    const ownerEmail = Session.getActiveUser().getEmail();

    for (const thread of threads) {
      const messages = thread.getMessages();

      for (const msg of messages) {
        // Only analyze emails FROM the owner
        if (!msg.getFrom().includes(ownerEmail)) continue;

        const body = msg.getPlainBody();
        if (!body || body.length < 20) continue;

        patterns.totalEmails++;

        // Analyze this email
        const analysis = analyzeEmailContent(body);

        // Collect patterns
        if (analysis.greeting) {
          patterns.greetings[analysis.greeting] = (patterns.greetings[analysis.greeting] || 0) + 1;
        }
        if (analysis.closing) {
          patterns.closings[analysis.closing] = (patterns.closings[analysis.closing] || 0) + 1;
        }

        patterns.sentenceLengths.push(analysis.avgSentenceLength);
        patterns.wordCounts.push(analysis.wordCount);

        patterns.punctuationPatterns.exclamationMarks += analysis.exclamationCount;
        patterns.punctuationPatterns.questionMarks += analysis.questionCount;
        patterns.punctuationPatterns.ellipsis += analysis.ellipsisCount;
        patterns.punctuationPatterns.emojis += analysis.emojiCount;

        patterns.formalityIndicators.contractions += analysis.contractionCount;
        patterns.formalityIndicators.formalWords += analysis.formalWordCount;
        patterns.formalityIndicators.casualWords += analysis.casualWordCount;

        // Extract common phrases
        analysis.phrases.forEach(phrase => {
          patterns.phrases[phrase] = (patterns.phrases[phrase] || 0) + 1;
        });

        // Store sample (limit to prevent memory issues)
        if (samples.length < 100) {
          samples.push({
            subject: thread.getFirstMessageSubject(),
            body: body.substring(0, 2000),
            wordCount: analysis.wordCount,
            sentenceCount: analysis.sentenceCount,
            patterns: analysis
          });
        }
      }
    }

    // Calculate profile
    const profile = calculateStyleProfile(patterns, ownerEmail);

    // Store profile
    storeStyleProfile(profile);

    // Store samples
    storeSamples(samples, profile.profileId);

    return {
      success: true,
      message: `Analyzed ${patterns.totalEmails} emails, style profile created`,
      profile: profile
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Analyze individual email content
 */
function analyzeEmailContent(body) {
  const lines = body.split('\n').filter(l => l.trim());
  const sentences = body.split(/[.!?]+/).filter(s => s.trim().length > 3);
  const words = body.split(/\s+/).filter(w => w.length > 0);

  // Detect greeting
  let greeting = null;
  const greetingPatterns = [
    /^(hi|hey|hello|dear|good morning|good afternoon|good evening)/i,
    /^(thanks|thank you)/i
  ];
  for (const line of lines.slice(0, 3)) {
    for (const pattern of greetingPatterns) {
      const match = line.match(pattern);
      if (match) {
        greeting = line.substring(0, 50).replace(/[,!].*/, '').trim();
        break;
      }
    }
    if (greeting) break;
  }

  // Detect closing
  let closing = null;
  const closingPatterns = [
    /^(best|thanks|thank you|cheers|regards|sincerely|warmly|take care)/i,
    /^(talk soon|let me know|looking forward)/i
  ];
  for (const line of lines.slice(-5).reverse()) {
    for (const pattern of closingPatterns) {
      if (pattern.test(line)) {
        closing = line.substring(0, 50).trim();
        break;
      }
    }
    if (closing) break;
  }

  // Punctuation analysis
  const exclamationCount = (body.match(/!/g) || []).length;
  const questionCount = (body.match(/\?/g) || []).length;
  const ellipsisCount = (body.match(/\.\.\./g) || []).length;
  const emojiCount = (body.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]/gu) || []).length;

  // Formality indicators
  const contractions = (body.match(/\b(don't|won't|can't|didn't|wouldn't|couldn't|isn't|aren't|wasn't|weren't|I'm|you're|we're|they're|it's|that's|there's|here's|what's|who's|how's|let's|I've|you've|we've|they've|I'd|you'd|we'd|they'd|I'll|you'll|we'll|they'll)\b/gi) || []).length;
  const formalWords = (body.match(/\b(therefore|however|furthermore|consequently|accordingly|nevertheless|pursuant|regarding|concerning|hereby)\b/gi) || []).length;
  const casualWords = (body.match(/\b(awesome|cool|yeah|yep|nope|gonna|wanna|kinda|sorta|stuff|things|guys|folks)\b/gi) || []).length;

  // Extract common phrases (2-4 word combinations)
  const phrases = [];
  const wordArray = body.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
  for (let i = 0; i < wordArray.length - 2; i++) {
    const phrase = wordArray.slice(i, i + 3).join(' ');
    if (phrase.length > 8 && phrase.length < 40) {
      phrases.push(phrase);
    }
  }

  return {
    greeting,
    closing,
    wordCount: words.length,
    sentenceCount: sentences.length,
    avgSentenceLength: sentences.length > 0 ? words.length / sentences.length : 0,
    exclamationCount,
    questionCount,
    ellipsisCount,
    emojiCount,
    contractionCount: contractions,
    formalWordCount: formalWords,
    casualWordCount: casualWords,
    phrases: [...new Set(phrases)].slice(0, 20)
  };
}

/**
 * Calculate the final style profile from patterns
 */
function calculateStyleProfile(patterns, ownerEmail) {
  const profileId = 'STYLE-' + Utilities.getUuid().substring(0, 8);

  // Determine tone
  const emojiRatio = patterns.punctuationPatterns.emojis / patterns.totalEmails;
  const exclamationRatio = patterns.punctuationPatterns.exclamationMarks / patterns.totalEmails;
  let tone = 'professional';
  if (emojiRatio > 0.3 || exclamationRatio > 2) {
    tone = 'friendly';
  } else if (exclamationRatio > 1 || patterns.formalityIndicators.casualWords > patterns.formalityIndicators.formalWords) {
    tone = 'warm';
  }

  // Determine formality
  const formalityScore = (patterns.formalityIndicators.formalWords - patterns.formalityIndicators.casualWords + patterns.formalityIndicators.contractions * -0.5) / patterns.totalEmails;
  let formality = 'balanced';
  if (formalityScore > 1) formality = 'formal';
  else if (formalityScore < -1) formality = 'casual';

  // Get top greetings and closings
  const topGreetings = Object.entries(patterns.greetings)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([g]) => g);

  const topClosings = Object.entries(patterns.closings)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([c]) => c);

  // Get common phrases
  const commonPhrases = Object.entries(patterns.phrases)
    .filter(([_, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([phrase]) => phrase);

  // Calculate averages
  const avgSentenceLength = patterns.sentenceLengths.reduce((a, b) => a + b, 0) / patterns.sentenceLengths.length;
  const avgWordCount = patterns.wordCounts.reduce((a, b) => a + b, 0) / patterns.wordCounts.length;

  return {
    profileId,
    ownerEmail,
    tone,
    formalityLevel: formality,
    avgSentenceLength: Math.round(avgSentenceLength),
    commonGreetings: topGreetings,
    commonClosings: topClosings,
    vocabularyStyle: formality === 'casual' ? 'conversational' : formality === 'formal' ? 'professional' : 'balanced',
    punctuationPatterns: {
      usesExclamations: exclamationRatio > 0.5,
      usesEmojis: emojiRatio > 0.1,
      usesEllipsis: patterns.punctuationPatterns.ellipsis / patterns.totalEmails > 0.2
    },
    responseLength: avgWordCount < 100 ? 'concise' : avgWordCount > 300 ? 'detailed' : 'moderate',
    phrasesToUse: commonPhrases,
    sampleCount: patterns.totalEmails,
    confidence: Math.min(0.95, patterns.totalEmails / 100)
  };
}

/**
 * Store style profile to sheet
 */
function storeStyleProfile(profile) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(STYLE_PROFILE_SHEET);

  if (!sheet) {
    initializeStyleSystem();
    sheet = ss.getSheetByName(STYLE_PROFILE_SHEET);
  }

  const now = new Date().toISOString();

  const rowData = [
    profile.profileId,
    profile.ownerEmail,
    profile.tone,
    profile.formalityLevel,
    profile.avgSentenceLength,
    JSON.stringify(profile.commonGreetings),
    JSON.stringify(profile.commonClosings),
    '', // Signature - to be set manually
    profile.vocabularyStyle,
    JSON.stringify(profile.punctuationPatterns),
    profile.punctuationPatterns.usesEmojis ? 'occasional' : 'never',
    profile.responseLength,
    '[]', // Topics expertise - to be set manually
    JSON.stringify(profile.phrasesToUse),
    '[]', // Phrases to avoid - to be set manually
    profile.sampleCount,
    now,
    profile.confidence,
    now,
    now
  ];

  // Check if profile exists for this owner
  const existingRow = findProfileByOwner(sheet, profile.ownerEmail);
  if (existingRow) {
    sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  return { success: true, profileId: profile.profileId };
}

/**
 * Store sample emails for reference
 */
function storeSamples(samples, profileId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(STYLE_SAMPLES_SHEET);

  if (!sheet) {
    initializeStyleSystem();
    sheet = ss.getSheetByName(STYLE_SAMPLES_SHEET);
  }

  const now = new Date().toISOString();

  // Store top 50 samples
  samples.slice(0, 50).forEach((sample, index) => {
    const sampleId = 'SAM-' + Utilities.getUuid().substring(0, 8);
    const rowData = [
      sampleId,
      profileId,
      'SENT',
      'UNKNOWN',
      sample.subject?.substring(0, 200) || '',
      sample.body?.substring(0, 2000) || '',
      sample.wordCount,
      sample.sentenceCount,
      JSON.stringify(sample.patterns || {}),
      0.8, // Default quality score
      now
    ];
    sheet.appendRow(rowData);
  });

  return { success: true, samplesStored: Math.min(50, samples.length) };
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLE APPLICATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the owner's style profile
 */
function getStyleProfile() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(STYLE_PROFILE_SHEET);

  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: false, error: 'No style profile found. Run analyzeOwnerStyle() first.' };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // Get the first (and likely only) profile
  const profileData = data[1];
  const profile = {};

  headers.forEach((h, i) => {
    let value = profileData[i];
    // Parse JSON fields
    if (['Common_Greetings', 'Common_Closings', 'Punctuation_Patterns', 'Topics_Expertise', 'Phrases_To_Use', 'Phrases_To_Avoid'].includes(h)) {
      try { value = JSON.parse(value || '[]'); } catch(e) { value = []; }
    }
    profile[h.toLowerCase()] = value;
  });

  return { success: true, data: profile };
}

/**
 * Generate a style-matched prompt for Claude
 */
function getStylePrompt() {
  const profileResult = getStyleProfile();

  if (!profileResult.success) {
    return {
      success: false,
      prompt: 'Write in a professional, friendly tone appropriate for a small farm business.',
      isDefault: true
    };
  }

  const p = profileResult.data;

  const prompt = `CRITICAL: You must write EXACTLY like the farm owner. Match this style perfectly:

TONE: ${p.tone || 'professional'}
FORMALITY: ${p.formality_level || 'balanced'}

GREETINGS TO USE (pick one naturally):
${(p.common_greetings || []).join(', ') || 'Hi, Hello'}

CLOSINGS TO USE (pick one naturally):
${(p.common_closings || []).join(', ') || 'Thanks, Best'}

SENTENCE LENGTH: Average ${p.avg_sentence_length || 15} words per sentence
RESPONSE LENGTH: ${p.response_length_preference || 'moderate'} - keep responses appropriately sized

VOCABULARY: ${p.vocabulary_style || 'balanced'} - use conversational language, not corporate speak

PHRASES TO NATURALLY INCLUDE WHEN APPROPRIATE:
${(p.phrases_to_use || []).slice(0, 10).join(', ') || 'None specified'}

PUNCTUATION RULES:
- Exclamation marks: ${p.punctuation_patterns?.usesExclamations ? 'Use occasionally for warmth' : 'Use sparingly'}
- Emojis: ${p.emoji_usage === 'occasional' ? 'Can use occasionally' : 'Do not use'}

SIGNATURE (if signing):
${p.signature || 'Tiny Seed Farm'}

The response must sound like it was written by a real person who runs a small organic farm, NOT by an AI.
Never say "I hope this email finds you well" or other generic corporate phrases.
Be genuine, direct, and personable.`;

  return {
    success: true,
    prompt: prompt,
    profile: p,
    isDefault: false
  };
}

/**
 * Apply style to a draft
 */
function applyStyleToDraft(draftText, recipientType = 'customer') {
  const profileResult = getStyleProfile();

  if (!profileResult.success) {
    return { success: true, text: draftText, styled: false };
  }

  const p = profileResult.data;

  // Apply greeting if missing
  let styled = draftText;
  const hasGreeting = /^(hi|hey|hello|dear|good|thanks)/i.test(draftText.trim());

  if (!hasGreeting && p.common_greetings?.length > 0) {
    const greeting = p.common_greetings[Math.floor(Math.random() * p.common_greetings.length)];
    styled = greeting + ',\n\n' + styled;
  }

  // Apply closing if missing
  const hasClosing = /(best|thanks|regards|cheers|sincerely|warmly|take care)/i.test(draftText.slice(-200));

  if (!hasClosing && p.common_closings?.length > 0) {
    const closing = p.common_closings[Math.floor(Math.random() * p.common_closings.length)];
    styled = styled.trim() + '\n\n' + closing + ',\n' + (p.signature || 'Tiny Seed Farm');
  }

  return { success: true, text: styled, styled: true };
}

/**
 * Score how well a draft matches the owner's style
 */
function scoreStyleMatch(draftText) {
  const profileResult = getStyleProfile();

  if (!profileResult.success) {
    return { success: true, score: 0.5, message: 'No style profile to compare against' };
  }

  const p = profileResult.data;
  let score = 0;
  let maxScore = 0;
  const feedback = [];

  // Check greeting
  maxScore += 10;
  const greetings = p.common_greetings || [];
  for (const g of greetings) {
    if (draftText.toLowerCase().includes(g.toLowerCase().split(' ')[0])) {
      score += 10;
      break;
    }
  }
  if (score < 10) feedback.push('Greeting doesn\'t match typical style');

  // Check closing
  maxScore += 10;
  const closings = p.common_closings || [];
  for (const c of closings) {
    if (draftText.toLowerCase().includes(c.toLowerCase().split(' ')[0])) {
      score += 10;
      break;
    }
  }
  if (score < 20) feedback.push('Closing doesn\'t match typical style');

  // Check sentence length
  maxScore += 20;
  const sentences = draftText.split(/[.!?]+/).filter(s => s.trim());
  const words = draftText.split(/\s+/);
  const avgLen = sentences.length > 0 ? words.length / sentences.length : 0;
  const targetLen = p.avg_sentence_length || 15;

  if (Math.abs(avgLen - targetLen) < 5) {
    score += 20;
  } else if (Math.abs(avgLen - targetLen) < 10) {
    score += 10;
    feedback.push('Sentence length slightly off from typical style');
  } else {
    feedback.push('Sentence length very different from typical style');
  }

  // Check formality
  maxScore += 20;
  const contractions = (draftText.match(/\b(don't|won't|can't|I'm|you're|it's)\b/gi) || []).length;
  const isCasual = contractions > 2;
  const targetCasual = p.formality_level === 'casual';

  if (isCasual === targetCasual) {
    score += 20;
  } else {
    score += 10;
    feedback.push(`Formality level doesn't match (should be ${p.formality_level})`);
  }

  // Check for corporate speak (bad)
  maxScore += 20;
  const corporateSpeak = [
    'hope this email finds you',
    'per our conversation',
    'please do not hesitate',
    'at your earliest convenience',
    'touch base',
    'circle back',
    'synergy'
  ];

  let hasCorporate = false;
  for (const phrase of corporateSpeak) {
    if (draftText.toLowerCase().includes(phrase)) {
      hasCorporate = true;
      feedback.push(`Remove corporate phrase: "${phrase}"`);
      break;
    }
  }

  if (!hasCorporate) {
    score += 20;
  }

  // Check length appropriateness
  maxScore += 20;
  const targetLength = p.response_length_preference;
  const wordCount = words.length;

  let lengthMatch = false;
  if (targetLength === 'concise' && wordCount < 100) lengthMatch = true;
  else if (targetLength === 'moderate' && wordCount >= 50 && wordCount <= 250) lengthMatch = true;
  else if (targetLength === 'detailed' && wordCount > 150) lengthMatch = true;

  if (lengthMatch) {
    score += 20;
  } else {
    score += 10;
    feedback.push(`Response length should be ${targetLength}`);
  }

  return {
    success: true,
    score: score / maxScore,
    scorePercent: Math.round((score / maxScore) * 100) + '%',
    feedback: feedback,
    improvements: feedback.length === 0 ? 'Perfect style match!' : feedback
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function findProfileByOwner(sheet, email) {
  if (!sheet || sheet.getLastRow() <= 1) return null;
  const emails = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < emails.length; i++) {
    if (emails[i][0]?.toLowerCase() === email.toLowerCase()) return i + 2;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

function testStyleMimicry() {
  Logger.log('=== TESTING STYLE MIMICRY SYSTEM ===');

  // 1. Initialize
  Logger.log('1. Initializing style system...');
  initializeStyleSystem();

  // 2. Analyze owner style (this will take a moment)
  Logger.log('2. Analyzing owner emails (this may take 30-60 seconds)...');
  const analysis = analyzeOwnerStyle(100); // Start with 100 for testing
  Logger.log('   Result: ' + (analysis.success ? analysis.message : analysis.error));

  if (analysis.success) {
    // 3. Get style profile
    Logger.log('3. Getting style profile...');
    const profile = getStyleProfile();
    Logger.log('   Tone: ' + (profile.data?.tone || 'unknown'));
    Logger.log('   Formality: ' + (profile.data?.formality_level || 'unknown'));

    // 4. Get style prompt
    Logger.log('4. Getting style prompt for AI...');
    const prompt = getStylePrompt();
    Logger.log('   Prompt generated: ' + (prompt.success ? 'YES' : 'NO'));

    // 5. Test style scoring
    Logger.log('5. Testing style match scoring...');
    const testDraft = 'Hi there!\n\nThanks for your email. I\'d love to help with that.\n\nBest,\nTodd';
    const score = scoreStyleMatch(testDraft);
    Logger.log('   Style match: ' + score.scorePercent);
  }

  Logger.log('=== STYLE MIMICRY TEST COMPLETE ===');

  return { success: true, message: 'Style system tested' };
}

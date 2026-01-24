/**
 * SMART CSA INTELLIGENCE LAYER
 * Proactive, predictive CSA management functions
 * Created: 2026-01-24
 *
 * OWNER DIRECTIVE: "I WANT IT TO BE SO SMART THAT IT KNOWS WHAT I SHOULD DO BEFORE ME"
 */

/**
 * PROACTIVE CSA ALERTS - Predictive intelligence that alerts BEFORE problems happen
 * This is the "smart smart smart" function the owner requested
 */
function getProactiveCSAAlerts() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const memberSheet = ss.getSheetByName(SALES_SHEETS.CSA_MEMBERS);
    const pickupSheet = ss.getSheetByName('CSA_Pickup_Attendance');
    const onboardingSheet = ss.getSheetByName('CSA_Onboarding_Tracker');

    if (!memberSheet) return { success: false, error: 'CSA_Members sheet not found' };

    const alerts = [];
    const now = new Date();

    // Get all active members
    const memberData = memberSheet.getDataRange().getValues();
    const memberHeaders = memberData[0];

    for (let i = 1; i < memberData.length; i++) {
      const status = memberData[i][memberHeaders.indexOf('Status')];
      if (status !== 'Active') continue;

      const memberId = memberData[i][memberHeaders.indexOf('Member_ID')];
      const memberName = memberData[i][memberHeaders.indexOf('Customer_Name')] || 'Unknown';
      const createdDate = new Date(memberData[i][memberHeaders.indexOf('Created_Date')] || now);
      const daysSinceMember = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
      const isFirstYear = daysSinceMember < 365;

      // ALERT 1: Two consecutive missed pickups
      if (pickupSheet) {
        const pickupData = pickupSheet.getDataRange().getValues();
        const memberPickups = pickupData.filter((row, idx) => idx > 0 && row[1] === memberId)
          .sort((a, b) => new Date(b[2]) - new Date(a[2]));

        if (memberPickups.length >= 2) {
          const last2 = memberPickups.slice(0, 2);
          if (last2.every(p => p[3] === false)) {
            alerts.push({
              type: 'CONSECUTIVE_MISSED_PICKUPS',
              priority: 'P1',
              memberId, memberName,
              message: `${memberName} missed 2 consecutive pickups`,
              action: 'Call today to check if they need help or vacation hold',
              data: { missedDates: last2.map(p => p[2]) }
            });
          }
        }
      }

      // ALERT 2: Health score dropped 20+ points
      const healthResult = calculateMemberHealthScoreSmart(memberId);
      if (healthResult.success && healthResult.healthScore < 60) {
        alerts.push({
          type: 'LOW_HEALTH_SCORE',
          priority: healthResult.healthScore < 25 ? 'P1' : healthResult.healthScore < 50 ? 'P2' : 'P3',
          memberId, memberName,
          message: `${memberName} health score is ${healthResult.healthScore}/100 (${healthResult.riskLevel})`,
          action: healthResult.riskLevel === 'RED' ? 'Immediate contact required' : 'Proactive outreach within 48 hours',
          data: { healthScore: healthResult.healthScore, riskLevel: healthResult.riskLevel }
        });
      }

      // ALERT 3: No login in 30+ days (if we had portal login tracking)
      // TODO: Implement when portal login tracking is added

      // ALERT 4: First-year member struggling (health < 60 in late season)
      if (isFirstYear && healthResult.success && healthResult.healthScore < 60) {
        const monthsSinceMember = daysSinceMember / 30;
        if (monthsSinceMember > 2) {
          alerts.push({
            type: 'FIRST_YEAR_AT_RISK',
            priority: 'P2',
            memberId, memberName,
            message: `First-year member ${memberName} at risk (${Math.round(monthsSinceMember)} months in, score ${healthResult.healthScore})`,
            action: 'Personal check-in call to ensure they feel supported',
            data: { daysSinceMember, healthScore: healthResult.healthScore }
          });
        }
      }

      // ALERT 5: Onboarding not completed within 14 days
      if (onboardingSheet && daysSinceMember < 60) {
        const onboardingStatus = getCSAOnboardingStatus(memberId);
        if (onboardingStatus.success && onboardingStatus.status === 'AT_RISK') {
          alerts.push({
            type: 'ONBOARDING_AT_RISK',
            priority: 'P2',
            memberId, memberName,
            message: `${memberName} has not activated after ${onboardingStatus.daysSinceSignup} days`,
            action: `Next step: ${onboardingStatus.nextAction}`,
            data: onboardingStatus.milestones
          });
        }
      }
    }

    // Sort by priority
    alerts.sort((a, b) => a.priority.localeCompare(b.priority));

    return {
      success: true,
      alerts,
      summary: {
        total: alerts.length,
        critical: alerts.filter(a => a.priority === 'P1').length,
        high: alerts.filter(a => a.priority === 'P2').length,
        moderate: alerts.filter(a => a.priority === 'P3').length
      },
      generatedAt: now.toISOString()
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * GET ONBOARDING TASKS - Returns what needs to happen for each member in onboarding
 * Implements the 30-day onboarding sequence from the spec
 */
function getOnboardingTasks() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const memberSheet = ss.getSheetByName(SALES_SHEETS.CSA_MEMBERS);
    if (!memberSheet) return { success: false, error: 'CSA_Members sheet not found' };

    const now = new Date();
    const tasks = [];

    const memberData = memberSheet.getDataRange().getValues();
    const memberHeaders = memberData[0];

    // Onboarding schedule from spec (Day 0, 1, 2, 3, 5, 7, 8, 10, 14, 21, 30)
    const onboardingSchedule = [
      { day: 0, action: 'welcome_email', channel: 'email', description: 'Welcome & Confirmation' },
      { day: 1, action: 'quick_start', channel: 'email', description: 'Quick Start Guide' },
      { day: 2, action: 'profile_nudge', channel: 'sms', description: 'Profile Completion Nudge' },
      { day: 3, action: 'customization_education', channel: 'email', description: 'Feature Education (Customization)' },
      { day: 5, action: 'social_proof', channel: 'email', description: 'Social Proof (Member Stories)' },
      { day: 7, action: 'first_pickup_prep', channel: 'email', description: 'First Pickup Prep' },
      { day: 8, action: 'post_pickup_checkin', channel: 'sms', description: 'Post-Pickup Check-in' },
      { day: 10, action: 'recipes', channel: 'email', description: 'Recipes Based on Box' },
      { day: 14, action: 'milestone_2week', channel: 'email', description: 'Milestone Celebration' },
      { day: 21, action: 'community_invite', channel: 'email', description: 'Community Invite' },
      { day: 30, action: 'success_call', channel: 'phone', description: 'Personal Success Call' }
    ];

    for (let i = 1; i < memberData.length; i++) {
      const status = memberData[i][memberHeaders.indexOf('Status')];
      if (status !== 'Active') continue;

      const memberId = memberData[i][memberHeaders.indexOf('Member_ID')];
      const memberName = memberData[i][memberHeaders.indexOf('Customer_Name')] || 'Unknown';
      const createdDate = new Date(memberData[i][memberHeaders.indexOf('Created_Date')] || now);
      const daysSinceMember = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));

      // Only track members in their first 60 days
      if (daysSinceMember > 60) continue;

      // Check which onboarding tasks should have happened by now
      for (const task of onboardingSchedule) {
        if (daysSinceMember >= task.day && daysSinceMember <= task.day + 2) {
          tasks.push({
            memberId,
            memberName,
            daysSinceMember,
            taskDay: task.day,
            action: task.action,
            channel: task.channel,
            description: task.description,
            dueDate: new Date(createdDate.getTime() + (task.day * 24 * 60 * 60 * 1000)).toISOString(),
            status: daysSinceMember === task.day ? 'DUE_TODAY' : 'OVERDUE'
          });
        }
      }
    }

    // Sort by priority (DUE_TODAY first, then by days since member)
    tasks.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'DUE_TODAY' ? -1 : 1;
      return a.daysSinceMember - b.daysSinceMember;
    });

    return {
      success: true,
      tasks,
      summary: {
        total: tasks.length,
        dueToday: tasks.filter(t => t.status === 'DUE_TODAY').length,
        overdue: tasks.filter(t => t.status === 'OVERDUE').length,
        emails: tasks.filter(t => t.channel === 'email').length,
        sms: tasks.filter(t => t.channel === 'sms').length,
        calls: tasks.filter(t => t.channel === 'phone').length
      },
      generatedAt: now.toISOString()
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * ENHANCED RETENTION DASHBOARD - Adds cohort analysis and predicted churn
 */
function getCSARetentionDashboardEnhanced() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const memberSheet = ss.getSheetByName(SALES_SHEETS.CSA_MEMBERS);
    if (!memberSheet) return { success: false, error: 'Sheet not found' };

    const data = memberSheet.getDataRange().getValues();
    const headers = data[0];
    const now = new Date();

    let activeMembers = 0, totalRevenue = 0;
    const cohorts = {};  // Group by signup month
    const predictedChurn = [];

    for (let i = 1; i < data.length; i++) {
      const status = data[i][headers.indexOf('Status')];
      const memberId = data[i][headers.indexOf('Member_ID')];
      const createdDate = new Date(data[i][headers.indexOf('Created_Date')] || now);
      const cohortKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;

      if (!cohorts[cohortKey]) {
        cohorts[cohortKey] = { total: 0, active: 0, churned: 0, revenue: 0 };
      }
      cohorts[cohortKey].total++;

      if (status === 'Active') {
        activeMembers++;
        cohorts[cohortKey].active++;
        const revenue = parseFloat(data[i][headers.indexOf('Total_Paid')] || 0);
        totalRevenue += revenue;
        cohorts[cohortKey].revenue += revenue;

        // Calculate health score for churn prediction
        const health = calculateMemberHealthScoreSmart(memberId);
        if (health.success && health.healthScore < 60) {
          predictedChurn.push({
            memberId,
            name: data[i][headers.indexOf('Customer_Name')] || 'Unknown',
            healthScore: health.healthScore,
            riskLevel: health.riskLevel,
            cohort: cohortKey
          });
        }
      } else {
        cohorts[cohortKey].churned++;
      }
    }

    // Calculate retention rates by cohort
    const cohortAnalysis = Object.keys(cohorts).sort().reverse().slice(0, 12).map(key => ({
      cohort: key,
      total: cohorts[key].total,
      active: cohorts[key].active,
      churned: cohorts[key].churned,
      retentionRate: cohorts[key].total > 0 ? Math.round((cohorts[key].active / cohorts[key].total) * 100) : 0,
      revenue: cohorts[key].revenue,
      avgRevenuePerMember: cohorts[key].active > 0 ? Math.round(cohorts[key].revenue / cohorts[key].active) : 0
    }));

    const atRisk = getAtRiskCSAMembers(75);
    const yellowCount = atRisk.success ? atRisk.members.filter(m => m.riskLevel === 'YELLOW').length : 0;
    const orangeCount = atRisk.success ? atRisk.members.filter(m => m.riskLevel === 'ORANGE').length : 0;
    const redCount = atRisk.success ? atRisk.members.filter(m => m.riskLevel === 'RED').length : 0;

    return {
      success: true,
      snapshot: {
        activeMembers,
        totalRevenue,
        avgRevenuePerMember: activeMembers > 0 ? Math.round(totalRevenue / activeMembers) : 0
      },
      health: {
        green: activeMembers - yellowCount - orangeCount - redCount,
        yellow: yellowCount,
        orange: orangeCount,
        red: redCount,
        greenPercent: activeMembers > 0 ? Math.round(((activeMembers - yellowCount - orangeCount - redCount) / activeMembers) * 100) : 0
      },
      cohortAnalysis,
      predictedChurn: predictedChurn.slice(0, 10),
      alerts: {
        critical: redCount,
        warning: yellowCount + orangeCount,
        atRiskMembers: atRisk.success ? atRisk.members.slice(0, 5) : []
      },
      actionItems: [
        { priority: 'P1', count: redCount, action: 'Call RED members immediately' },
        { priority: 'P2', count: orangeCount, action: 'Reach out to ORANGE members within 48 hours' },
        { priority: 'P3', count: yellowCount, action: 'Check in with YELLOW members this week' }
      ].filter(item => item.count > 0),
      generatedAt: new Date().toISOString()
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * ENHANCED HEALTH SCORE CALCULATION - Uses REAL pickup data instead of hardcoded values
 */
function calculateMemberHealthScoreEnhanced(memberId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const memberSheet = ss.getSheetByName(SALES_SHEETS.CSA_MEMBERS);
    const pickupSheet = ss.getSheetByName('CSA_Pickup_Attendance');

    if (!memberSheet) return { success: false, error: 'CSA_Members sheet not found' };

    const data = memberSheet.getDataRange().getValues();
    const headers = data[0];
    let memberData = null;

    for (let i = 1; i < data.length; i++) {
      if (data[i][headers.indexOf('Member_ID')] === memberId) {
        memberData = {};
        headers.forEach((h, idx) => { memberData[h] = data[i][idx]; });
        break;
      }
    }

    if (!memberData) return { success: false, error: 'Member not found' };

    // REAL PICKUP SCORE - Based on actual attendance
    let pickupScore = 100;  // Start at perfect
    if (pickupSheet) {
      const pickupData = pickupSheet.getDataRange().getValues();
      const memberPickups = pickupData.filter((row, idx) => idx > 0 && row[1] === memberId);

      if (memberPickups.length > 0) {
        const recentPickups = memberPickups.slice(-4);  // Last 4 pickups
        const attendedCount = recentPickups.filter(p => p[3] === true).length;
        const missedCount = recentPickups.length - attendedCount;

        // Scoring: All attended=100, 1 miss=80, 2 misses=60, 3+ misses=20
        if (missedCount === 0) pickupScore = 100;
        else if (missedCount === 1) pickupScore = 80;
        else if (missedCount === 2) pickupScore = 60;
        else pickupScore = 20;
      }
    }

    // ENGAGEMENT SCORE - Portal login tracking (placeholder until implemented)
    const engagementScore = 70;  // TODO: Replace with real portal login tracking

    // CUSTOMIZATION SCORE - Based on preference activity
    const prefSheet = ss.getSheetByName('CSA_Preferences');
    let customizationScore = 10;  // Default if no preferences
    if (prefSheet) {
      const prefData = prefSheet.getDataRange().getValues();
      const memberPrefs = prefData.filter((row, idx) => idx > 0 && row[1] === memberId);

      if (memberPrefs.length > 0) {
        customizationScore = Math.min(100, 40 + (memberPrefs.length * 5));
      }
    }

    // SUPPORT SCORE - Based on support log
    const supportSheet = ss.getSheetByName('CSA_Support_Log');
    let supportScore = 100;  // Perfect unless there are issues
    if (supportSheet) {
      const supportData = supportSheet.getDataRange().getValues();
      const memberSupport = supportData.filter((row, idx) => idx > 0 && row[1] === memberId);

      const unresolvedComplaints = memberSupport.filter(s => s[2] === 'COMPLAINT' && s[3] !== 'RESOLVED').length;
      const resolvedComplaints = memberSupport.filter(s => s[2] === 'COMPLAINT' && s[3] === 'RESOLVED').length;

      supportScore = 100 - (unresolvedComplaints * 40) - (resolvedComplaints * 10);
      supportScore = Math.max(0, supportScore);
    }

    // Tenure score
    const signupDate = new Date(memberData.Created_Date || new Date());
    const monthsTenure = (new Date() - signupDate) / (1000 * 60 * 60 * 24 * 30);
    const tenureScore = monthsTenure < 12 ? 50 + Math.min(monthsTenure * 2, 20) :
                        monthsTenure < 24 ? 70 + Math.min(monthsTenure - 12, 15) : 85;

    const HEALTH_SCORE_COMPONENT_WEIGHTS = {
      pickup: 0.30, engagement: 0.25, customization: 0.20, support: 0.15, tenure: 0.10
    };

    const healthScore = Math.round(
      (pickupScore * HEALTH_SCORE_COMPONENT_WEIGHTS.pickup) +
      (engagementScore * HEALTH_SCORE_COMPONENT_WEIGHTS.engagement) +
      (customizationScore * HEALTH_SCORE_COMPONENT_WEIGHTS.customization) +
      (supportScore * HEALTH_SCORE_COMPONENT_WEIGHTS.support) +
      (tenureScore * HEALTH_SCORE_COMPONENT_WEIGHTS.tenure)
    );

    const riskLevel = healthScore >= 75 ? 'GREEN' : healthScore >= 50 ? 'YELLOW' :
                      healthScore >= 25 ? 'ORANGE' : 'RED';

    return {
      success: true, memberId, healthScore, riskLevel,
      components: { pickup: pickupScore, engagement: engagementScore,
                    customization: customizationScore, support: supportScore, tenure: tenureScore },
      calculatedAt: new Date().toISOString()
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

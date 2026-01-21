# SEO DOMINATION DASHBOARD
## Frontend Specification & Design

**Purpose:** Real-time visibility into SEO progress toward #1 Pittsburgh ranking

---

## DASHBOARD LAYOUT

```
┌────────────────────────────────────────────────────────────────────────────┐
│  🏆 SEO DOMINATION DASHBOARD          [Refresh] [Export] [Date Range ▼]   │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │  OVERALL SCORE   │  │  REVIEW COUNT    │  │  CITATIONS       │          │
│  │       78/100     │  │      47 ⭐        │  │    23/37 ✓       │          │
│  │  ↑ 12 this month │  │  Avg: 4.9 stars  │  │    62% Complete  │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  🎯 KEYWORD RANKINGS                                         [Edit]  │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │  "farm pittsburgh"           #4  ↑3   ████████████░░░░ Target: #1    │  │
│  │  "CSA pittsburgh"            #2  ↑5   ██████████████░░ Target: #1    │  │
│  │  "organic farm pittsburgh"   #6  ↑8   ██████████░░░░░░ Target: #3    │  │
│  │  "local produce pittsburgh"  #8  ↑2   ████████░░░░░░░░ Target: #5    │  │
│  │                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │  📊 RANKING HISTORY             │  │  ⭐ REVIEW METRICS              │  │
│  ├─────────────────────────────────┤  ├─────────────────────────────────┤  │
│  │  [Line chart showing keyword    │  │  This Week:     8 new reviews   │  │
│  │   rankings over time]           │  │  Requests Sent: 32              │  │
│  │                                 │  │  Conversion:    25%             │  │
│  │   Jan  Feb  Mar  Apr  May       │  │                                 │  │
│  │                                 │  │  Sentiment:                     │  │
│  │   #1 ─────────●──────────       │  │  ██████████████ Positive (42)   │  │
│  │   #5 ────●─────────────         │  │  ██ Neutral (3)                 │  │
│  │   #10 ●────────────────         │  │  █ Negative (2)                 │  │
│  │                                 │  │                                 │  │
│  └─────────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  📝 RECENT REVIEWS                                   [View All]       │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │  ⭐⭐⭐⭐⭐  Sarah M.  •  2 days ago  •  Google      [Respond ▶]     │  │
│  │  "Best CSA in Pittsburgh! The Mt. Lebanon pickup is so convenient,   │  │
│  │   and the vegetables are always incredibly fresh..."                 │  │
│  │                                                                       │  │
│  │  ⭐⭐⭐⭐⭐  Michael T.  •  5 days ago  •  Google    [Responded ✓]   │  │
│  │  "We switched from grocery store produce and the difference is       │  │
│  │   night and day. Everything tastes so much better..."                │  │
│  │                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │  📍 CITATION STATUS             │  │  📅 CONTENT CALENDAR            │  │
│  ├─────────────────────────────────┤  ├─────────────────────────────────┤  │
│  │                                 │  │                                 │  │
│  │  Tier 1 Essential  ████░ 4/5   │  │  This Week:                     │  │
│  │  Tier 2 Farm       ███░░ 5/7   │  │  📝 "Spring CSA Preview" [Due]  │  │
│  │  Tier 3 Pittsburgh ██░░░ 6/8   │  │                                 │  │
│  │  Tier 4 Business   ██░░░ 5/10  │  │  Next Week:                     │  │
│  │  Tier 5 Social     ███░░ 3/5   │  │  📝 "10 Spring Greens Recipes"  │  │
│  │  Tier 6 Review     ░░░░░ 0/2   │  │                                 │  │
│  │                                 │  │  [View Full Calendar]           │  │
│  │  [Add Citation]  [View All]     │  │                                 │  │
│  └─────────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  📋 ACTION ITEMS                                          [Mark All] │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  ⚠️  HIGH: 2 reviews need responses                        [View]    │  │
│  │  📌  Submit to Yelp Business (Tier 1 remaining)            [Do Now]  │  │
│  │  📝  Write blog post for this week                         [Start]   │  │
│  │  📊  Log keyword rankings (weekly check due)               [Log]     │  │
│  │  📧  8 members ready for review request                    [Send]    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## COMPONENT SPECIFICATIONS

### 1. Score Card Row

```html
<div class="score-cards">
  <div class="score-card">
    <div class="label">OVERALL SCORE</div>
    <div class="value" id="overall-score">78/100</div>
    <div class="trend positive">↑ 12 this month</div>
  </div>

  <div class="score-card">
    <div class="label">REVIEW COUNT</div>
    <div class="value" id="review-count">47 ⭐</div>
    <div class="detail">Avg: 4.9 stars</div>
  </div>

  <div class="score-card">
    <div class="label">CITATIONS</div>
    <div class="value" id="citation-count">23/37 ✓</div>
    <div class="progress-bar" style="width: 62%"></div>
  </div>
</div>
```

**Overall Score Calculation:**
```javascript
function calculateOverallScore() {
  const weights = {
    reviews: 0.30,      // Review count & quality
    rankings: 0.35,     // Keyword rankings
    citations: 0.15,    // Citation completeness
    content: 0.10,      // Blog posts published
    engagement: 0.10    // GBP engagement metrics
  };

  const reviewScore = Math.min(100, (reviewCount / 150) * 100);
  const rankingScore = calculateRankingScore(); // Based on positions
  const citationScore = (completedCitations / 37) * 100;
  const contentScore = (publishedPosts / 52) * 100;

  return Math.round(
    reviewScore * weights.reviews +
    rankingScore * weights.rankings +
    citationScore * weights.citations +
    contentScore * weights.content +
    engagementScore * weights.engagement
  );
}
```

### 2. Keyword Rankings Table

```html
<div class="rankings-section">
  <div class="section-header">
    <h3>🎯 KEYWORD RANKINGS</h3>
    <button onclick="logNewRankings()">Log Rankings</button>
  </div>

  <table class="rankings-table">
    <thead>
      <tr>
        <th>Keyword</th>
        <th>Rank</th>
        <th>Change</th>
        <th>Progress</th>
        <th>Target</th>
      </tr>
    </thead>
    <tbody id="rankings-body">
      <!-- Populated dynamically -->
    </tbody>
  </table>
</div>
```

**API Call:**
```javascript
async function loadRankings() {
  const data = await google.script.run
    .withSuccessHandler(renderRankings)
    .getSEORankings({ limit: 10, timeframe: 'week' });
}

function renderRankings(data) {
  const tbody = document.getElementById('rankings-body');
  tbody.innerHTML = data.keywords.map(kw => `
    <tr>
      <td>"${kw.keyword}"</td>
      <td class="rank">#${kw.currentRank}</td>
      <td class="${kw.change > 0 ? 'positive' : 'negative'}">
        ${kw.change > 0 ? '↑' : '↓'}${Math.abs(kw.change)}
      </td>
      <td>
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: ${kw.progress}%"></div>
        </div>
      </td>
      <td>Target: #${kw.target}</td>
    </tr>
  `).join('');
}
```

### 3. Ranking History Chart

**Using Chart.js:**
```javascript
const rankingChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    datasets: [
      {
        label: 'farm pittsburgh',
        data: [15, 12, 8, 5, 4],
        borderColor: '#2E7D32',
        tension: 0.4
      },
      {
        label: 'CSA pittsburgh',
        data: [20, 15, 10, 6, 2],
        borderColor: '#1976D2',
        tension: 0.4
      }
    ]
  },
  options: {
    responsive: true,
    scales: {
      y: {
        reverse: true,  // Lower rank is better
        min: 1,
        max: 20,
        title: { display: true, text: 'Ranking' }
      }
    }
  }
});
```

### 4. Review Metrics Panel

```html
<div class="review-metrics">
  <h3>⭐ REVIEW METRICS</h3>

  <div class="metric-row">
    <span class="label">This Week:</span>
    <span class="value" id="reviews-this-week">8 new reviews</span>
  </div>

  <div class="metric-row">
    <span class="label">Requests Sent:</span>
    <span class="value" id="requests-sent">32</span>
  </div>

  <div class="metric-row">
    <span class="label">Conversion:</span>
    <span class="value" id="conversion-rate">25%</span>
  </div>

  <div class="sentiment-breakdown">
    <div class="sentiment-bar positive" style="width: 89%">Positive (42)</div>
    <div class="sentiment-bar neutral" style="width: 6%">Neutral (3)</div>
    <div class="sentiment-bar negative" style="width: 4%">Negative (2)</div>
  </div>
</div>
```

**API Call:**
```javascript
async function loadReviewMetrics() {
  const data = await google.script.run
    .withSuccessHandler(renderReviewMetrics)
    .getReviewMetrics({ platform: 'all', timeframe: 'week' });
}
```

### 5. Recent Reviews Feed

```html
<div class="reviews-feed">
  <div class="section-header">
    <h3>📝 RECENT REVIEWS</h3>
    <button onclick="showAllReviews()">View All</button>
  </div>

  <div class="reviews-list" id="reviews-list">
    <!-- Populated dynamically -->
  </div>
</div>
```

```javascript
function renderReview(review) {
  return `
    <div class="review-card">
      <div class="review-header">
        <span class="stars">${'⭐'.repeat(review.rating)}</span>
        <span class="reviewer">${review.reviewerName}</span>
        <span class="date">${timeAgo(review.date)}</span>
        <span class="platform">${review.platform}</span>
        ${review.responded
          ? '<span class="badge responded">Responded ✓</span>'
          : '<button onclick="respondToReview(\''+review.id+'\')">Respond ▶</button>'
        }
      </div>
      <div class="review-text">"${review.text.substring(0, 150)}..."</div>
    </div>
  `;
}
```

### 6. Citation Status Panel

```html
<div class="citation-status">
  <h3>📍 CITATION STATUS</h3>

  <div class="tier-progress" id="citation-tiers">
    <!-- Populated dynamically -->
  </div>

  <div class="actions">
    <button onclick="showAddCitation()">Add Citation</button>
    <button onclick="showAllCitations()">View All</button>
  </div>
</div>
```

```javascript
function renderCitationTiers(data) {
  const tiers = [
    { name: 'Tier 1 Essential', total: 5 },
    { name: 'Tier 2 Farm', total: 7 },
    { name: 'Tier 3 Pittsburgh', total: 8 },
    { name: 'Tier 4 Business', total: 10 },
    { name: 'Tier 5 Social', total: 5 },
    { name: 'Tier 6 Review', total: 2 }
  ];

  return tiers.map(tier => {
    const completed = data.byTier[tier.name] || 0;
    const pct = (completed / tier.total) * 100;
    return `
      <div class="tier-row">
        <span class="tier-name">${tier.name}</span>
        <div class="tier-bar">
          <div class="tier-fill" style="width: ${pct}%"></div>
        </div>
        <span class="tier-count">${completed}/${tier.total}</span>
      </div>
    `;
  }).join('');
}
```

### 7. Action Items Panel

```html
<div class="action-items">
  <div class="section-header">
    <h3>📋 ACTION ITEMS</h3>
    <button onclick="markAllComplete()">Mark All</button>
  </div>

  <div class="items-list" id="action-items-list">
    <!-- Populated dynamically -->
  </div>
</div>
```

```javascript
async function loadActionItems() {
  const dashboard = await google.script.run
    .withSuccessHandler(generateActionItems)
    .getSEODashboard({});
}

function generateActionItems(data) {
  const items = [];

  // Check for unresponded reviews
  if (data.reviews.unresponded > 0) {
    items.push({
      priority: 'high',
      icon: '⚠️',
      text: `${data.reviews.unresponded} reviews need responses`,
      action: 'viewUnrespondedReviews'
    });
  }

  // Check for missing citations
  const tier1Missing = 5 - (data.citations.byTier?.['Tier 1'] || 0);
  if (tier1Missing > 0) {
    items.push({
      priority: 'medium',
      icon: '📌',
      text: `Submit to ${tier1Missing} Tier 1 directories`,
      action: 'showMissingCitations'
    });
  }

  // Check content calendar
  if (isContentDue()) {
    items.push({
      priority: 'medium',
      icon: '📝',
      text: 'Write blog post for this week',
      action: 'openContentCalendar'
    });
  }

  // Check ranking log
  if (isRankingLogDue()) {
    items.push({
      priority: 'medium',
      icon: '📊',
      text: 'Log keyword rankings (weekly check due)',
      action: 'logNewRankings'
    });
  }

  // Check review candidates
  if (data.reviewCandidates > 0) {
    items.push({
      priority: 'low',
      icon: '📧',
      text: `${data.reviewCandidates} members ready for review request`,
      action: 'showReviewCandidates'
    });
  }

  return items;
}
```

---

## API INTEGRATION

### Load Dashboard Data
```javascript
async function loadDashboard() {
  showLoading();

  try {
    const data = await google.script.run
      .withSuccessHandler(renderDashboard)
      .withFailureHandler(showError)
      .getSEODashboard({});

  } catch (error) {
    showError(error);
  }
}

function renderDashboard(data) {
  // Update score cards
  document.getElementById('overall-score').textContent = calculateOverallScore(data);
  document.getElementById('review-count').textContent = `${data.reviews.total} ⭐`;
  document.getElementById('citation-count').textContent =
    `${data.citations.submitted}/${data.citations.total} ✓`;

  // Render sections
  renderRankings(data.rankings);
  renderReviewMetrics(data.reviews);
  renderRecentReviews(data.recentReviews);
  renderCitationTiers(data.citations);
  renderActionItems(data);

  hideLoading();
}
```

### Log New Rankings
```javascript
async function logNewRanking(keyword, rank) {
  await google.script.run
    .withSuccessHandler(() => {
      showToast('Ranking logged successfully');
      loadDashboard();
    })
    .logSEORanking({
      keyword: keyword,
      rank: rank,
      searchEngine: 'google'
    });
}
```

### Create Review Request
```javascript
async function sendReviewRequest(member) {
  await google.script.run
    .withSuccessHandler(() => {
      showToast(`Review request sent to ${member.name}`);
    })
    .createReviewRequest({
      memberId: member.id,
      memberName: member.name,
      memberEmail: member.email,
      method: 'email',
      trigger: 'manual_request'
    });
}
```

---

## MODAL DIALOGS

### Log Rankings Modal

```html
<div id="rankings-modal" class="modal">
  <div class="modal-content">
    <h2>Log Keyword Rankings</h2>
    <p>Enter current rankings from Google search (incognito mode)</p>

    <form id="rankings-form">
      <div class="form-group">
        <label>farm pittsburgh</label>
        <input type="number" name="farm_pittsburgh" min="1" max="100" required>
      </div>

      <div class="form-group">
        <label>CSA pittsburgh</label>
        <input type="number" name="csa_pittsburgh" min="1" max="100" required>
      </div>

      <div class="form-group">
        <label>organic farm pittsburgh</label>
        <input type="number" name="organic_farm_pittsburgh" min="1" max="100" required>
      </div>

      <div class="form-group">
        <label>local produce pittsburgh</label>
        <input type="number" name="local_produce_pittsburgh" min="1" max="100" required>
      </div>

      <div class="form-actions">
        <button type="button" onclick="closeModal()">Cancel</button>
        <button type="submit">Save Rankings</button>
      </div>
    </form>
  </div>
</div>
```

### Add Citation Modal

```html
<div id="citation-modal" class="modal">
  <div class="modal-content">
    <h2>Log New Citation</h2>

    <form id="citation-form">
      <div class="form-group">
        <label>Directory</label>
        <select name="directory" required>
          <option value="">Select directory...</option>
          <optgroup label="Tier 1 - Essential">
            <option value="Google Business Profile">Google Business Profile</option>
            <option value="Bing Places">Bing Places</option>
            <option value="Apple Maps">Apple Maps</option>
            <option value="Facebook">Facebook</option>
            <option value="Yelp">Yelp</option>
          </optgroup>
          <optgroup label="Tier 2 - Farm">
            <option value="LocalHarvest">LocalHarvest</option>
            <option value="USDA CSA Directory">USDA CSA Directory</option>
            <!-- etc -->
          </optgroup>
        </select>
      </div>

      <div class="form-group">
        <label>Status</label>
        <select name="status" required>
          <option value="submitted">Submitted</option>
          <option value="live">Live/Verified</option>
          <option value="pending">Pending Verification</option>
        </select>
      </div>

      <div class="form-group">
        <label>URL (if live)</label>
        <input type="url" name="url">
      </div>

      <div class="form-actions">
        <button type="button" onclick="closeModal()">Cancel</button>
        <button type="submit">Save Citation</button>
      </div>
    </form>
  </div>
</div>
```

### Review Request Modal

```html
<div id="review-request-modal" class="modal">
  <div class="modal-content">
    <h2>Send Review Requests</h2>
    <p>Select members to send review request emails</p>

    <div class="candidates-list" id="candidates-list">
      <!-- Populated with candidates from getReviewRequestCandidates() -->
    </div>

    <div class="form-actions">
      <button type="button" onclick="closeModal()">Cancel</button>
      <button type="button" onclick="sendSelectedRequests()">
        Send to Selected
      </button>
    </div>
  </div>
</div>
```

---

## STYLING

```css
/* Dashboard Layout */
.seo-dashboard {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Score Cards */
.score-cards {
  grid-column: 1 / -1;
  display: flex;
  gap: 20px;
}

.score-card {
  flex: 1;
  background: linear-gradient(135deg, #2E7D32, #4CAF50);
  color: white;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
}

.score-card .value {
  font-size: 2.5rem;
  font-weight: bold;
}

.score-card .trend.positive {
  color: #C8E6C9;
}

/* Rankings Table */
.rankings-section {
  grid-column: 1 / -1;
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.rankings-table {
  width: 100%;
  border-collapse: collapse;
}

.rankings-table td {
  padding: 12px;
  border-bottom: 1px solid #eee;
}

.rank {
  font-weight: bold;
  font-size: 1.2rem;
}

.positive { color: #2E7D32; }
.negative { color: #C62828; }

/* Progress Bars */
.progress-bar-container {
  background: #e0e0e0;
  border-radius: 10px;
  height: 10px;
  width: 200px;
}

.progress-bar {
  background: linear-gradient(90deg, #4CAF50, #2E7D32);
  height: 100%;
  border-radius: 10px;
  transition: width 0.5s ease;
}

/* Review Cards */
.review-card {
  background: #f9f9f9;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 10px;
  border-left: 4px solid #4CAF50;
}

.review-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.badge.responded {
  background: #C8E6C9;
  color: #2E7D32;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
}

/* Action Items */
.action-items .item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #eee;
}

.action-items .item.high {
  background: #FFEBEE;
}

.action-items .icon {
  margin-right: 10px;
}

/* Responsive */
@media (max-width: 1024px) {
  .seo-dashboard {
    grid-template-columns: 1fr;
  }

  .score-cards {
    flex-direction: column;
  }
}
```

---

## FILE LOCATION

Create the dashboard at:
`/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/seo_dashboard.html`

---

## INTEGRATION WITH MASTER DASHBOARD

Add link to master dashboard navigation:
```html
<a href="seo_dashboard.html" class="nav-item">
  <span class="icon">🏆</span>
  <span class="label">SEO Domination</span>
</a>
```

---

*Last Updated: 2026-01-20*
*Status: SPECIFICATION COMPLETE - READY FOR IMPLEMENTATION*

# ADMIN QUICK START GUIDE
## Tiny Seed Farm - System Administrator Guide

---

## Your Role

You have full access to everything: operations, financials, user management, and system settings.

---

## YOUR APPS

### Administration
| App | URL | Purpose |
|-----|-----|---------|
| Admin Panel | `web_app/admin.html` | User management, system status |
| Master Dashboard | `index.html` | Full operations overview |

### Financial
| App | URL | Purpose |
|-----|-----|---------|
| Financial Dashboard | `web_app/financial-dashboard.html` | Bank accounts, cash flow |
| Wealth Builder | `web_app/wealth-builder.html` | Investment tracking |

### Operations (You Have Full Access)
| App | URL | Purpose |
|-----|-----|---------|
| Planning View | `planning.html` | Create/edit crop plans |
| Succession Planner | `succession.html` | Batch planting creation |
| Bed Assignment | `bed_assignment_COMPLETE.html` | Field allocation |
| Greenhouse | `greenhouse.html` | Seedling tracking |
| Gantt Chart | `gantt_FINAL.html` | Timeline view |

### Sales & Customers
| App | URL | Purpose |
|-----|-----|---------|
| Sales Dashboard | `web_app/sales.html` | Orders, revenue |
| Customer Portal | `web_app/customer.html` | Customer view |
| Marketing | `web_app/marketing-command-center.html` | Campaigns |

### Tools
| App | URL | Purpose |
|-----|-----|---------|
| Seed Inventory | `seed_inventory_PRODUCTION.html` | Track seeds |
| Soil Tests | `soil-tests.html` | Soil analysis |
| Labels | `labels.html` | Print labels |
| Visual Calendar | `visual_calendar_PRODUCTION (1).html` | Calendar view |

---

## ADMIN PANEL

### Accessing Admin Panel
1. Go to `web_app/admin.html`
2. Must be logged in as Admin
3. Full dashboard appears

### User Management
**View Users:**
- See all users in the system
- View their roles and status
- Last login information

**Create New User:**
1. Click **Add User**
2. Enter name, email, PIN
3. Select role
4. Save

**Edit User:**
1. Click on user row
2. Change role or status
3. Save changes

**Deactivate User:**
- Use status toggle
- Deactivated users can't log in
- Can reactivate later

### System Status
- View API health
- Check data sync status
- Monitor active sessions (planned)

---

## FINANCIAL DASHBOARDS

### Financial Dashboard
- Connected bank accounts
- Real-time balances
- Cash flow tracking
- Transaction history
- Revenue vs expenses

### Wealth Builder
- Investment tracking
- Portfolio overview
- Performance metrics

**Security Note:** Only Admin role can access these. Always log out when done.

---

## SPECIAL PERMISSIONS

As Admin, you have:
- **Geofence Bypass** - Clock in from anywhere
- **All Data Access** - No restrictions
- **User Management** - Create/edit all users
- **Financial Access** - Bank accounts, investments
- **System Settings** - Configure the system

---

## DAILY ADMIN TASKS

### Morning Check
1. Review **Admin Panel** system status
2. Check **Financial Dashboard** for alerts
3. Skim **Sales Dashboard** for issues
4. Review **Master Dashboard** operations

### Weekly Tasks
1. Review user access and activity
2. Check financial reconciliation
3. Review system logs (when available)
4. Update any system settings

### Monthly Tasks
1. Audit user accounts
2. Review permissions
3. Financial review
4. System performance check

---

## DELEGATION

### What Managers Can Handle
- Day-to-day operations
- Crop planning
- Order management
- Team coordination

### What You Should Handle
- Financial decisions
- User access issues
- System problems
- Major planning changes

---

## TROUBLESHOOTING

### User Can't Log In
1. Check Admin Panel for user status
2. Verify correct PIN
3. Check role permissions
4. Reset PIN if needed

### Data Not Loading
1. Check API status in Admin Panel
2. Verify internet connection
3. Check browser console for errors
4. Clear cache and retry

### Financial Data Issues
1. Check Plaid connection status
2. Re-authenticate if needed
3. Verify account is still linked

---

## EMERGENCY PROCEDURES

### Data Issues
- Don't panic
- Check backups (Google Sheets)
- Contact developer if needed

### Security Concerns
- Deactivate suspicious users immediately
- Change PINs if compromised
- Review access logs

### System Down
- Check API status
- Check GitHub Pages status
- Verify Google Apps Script quotas

---

## SUPPORT CONTACTS

### Development Team
- For system bugs
- Feature requests
- Technical issues

### Financial Services
- Plaid support for bank connections
- API issues with financial data

---

*You're the captain of the ship - keep it running smooth!*

# Call-Off Registry — Changelog & Problem Log

This document tracks every meaningful change made to the app, why it was made, and how problems were solved. Entries are ordered from earliest to most recent.

---

## v1 — Initial Build
**What was built:**
The first version of the app was a single `index.html` file with all HTML, CSS, and JavaScript embedded together. It used the browser's `localStorage` to save call-off data, meaning all data lived in the browser on one machine.

**Features:**
- 4-digit PIN screen to lock and unlock the app
- Log a call-off with employee name, department, reason, date, shift, logged-by, and notes
- Filter log by reason type and current week
- Metrics: total, this week, no-shows, employees
- Export log as CSV
- Delete entries

**Limitations identified:**
- Data was tied to one browser — clearing browser data wiped everything
- No real security — anyone with access to the machine could see and delete data
- No way to access the app from another device

---

## v2 — Cloud Database + Authentication
**Problem:** Data stored in `localStorage` was fragile and not secure. Any browser clear would wipe all records permanently.

**Solution:** Migrated data storage from `localStorage` to **Supabase**, a hosted PostgreSQL database. Replaced the PIN screen with real **email and password authentication** via Supabase Auth.

**Changes made:**
- Created `calloffs` table in Supabase with Row Level Security (RLS) enabled
- All four operations (read, write, edit, delete) restricted to authenticated users only
- Replaced PIN screen with an email/password login form
- App now fetches all data from Supabase on login instead of reading from `localStorage`
- Added session persistence — if you're already logged in, the app skips the login screen
- Added a Lock/Sign Out button
- Added toast notifications for save and delete confirmations

**SQL run:**
```sql
create table calloffs (...);
alter table calloffs enable row level security;
-- policies for select, insert, update, delete
```

---

## v3 — Employee Profiles + Navigation + UI Improvements
**Problem:** There was no way to view an employee's full history or track patterns per person. The app was also a flat list with no structure for navigating between different sections.

**Solution:** Added a multi-view navigation system and a dedicated employee management section.

**Changes made:**
- Added three views: Dashboard, Employees, Profile — navigated via a top tab bar
- Added bottom navigation bar for mobile
- **Employees tab** — lists all employees with call-off count and last call-off date
- **Employee profile** — shows total, this month, no-show stats, reason breakdown bar chart, manager notes, and full call-off history
- Employee names in the log are now clickable links to their profile
- Added flag/unflag toggle on profiles — flagged employees appear with a red badge everywhere
- Added manager notes per employee saved to Supabase
- Added edit entries — a modal lets managers correct any field on a logged entry
- Added repeat offender alert — fires when an employee hits 3+ call-offs in 30 days
- Added By Day grouping on the dashboard — groups entries under date headers
- Added By Dept grouping on the employees tab
- Added real-time search on the employees tab
- Added + Add Employee button — employees can now be created without logging a call-off
- Added Delete Employee button on profiles
- Created `employees` table in Supabase with RLS

**SQL run:**
```sql
create table employees (...);
alter table employees enable row level security;
-- policies for select, insert, update, delete
create trigger employees_updated_at ...;
```

---

## v4 — Audit Log + Auto-Logout + Print
**Problem:** There was no way to know who made changes or when. If a record was deleted or edited, there was no trail. There was also no protection against leaving the app open and unattended, and no way to produce a physical record of an employee's history.

**Solution:** Added three independent features addressing accountability, security, and usability.

**Changes made:**

### Audit Log
- Added a new **Audit Log tab** recording every action taken in the app
- Every add, edit, delete, flag, notes save, profile update, and sign-in/sign-out is recorded
- Each record stores: user email, action type, target name, description of change, and timestamp
- Audit log is filterable by entries, employees, time-off, or auth events
- Created `audit_log` table in Supabase

**SQL run:**
```sql
create table audit_log (...);
alter table audit_log enable row level security;
-- policies for select, insert
```

### Auto-Logout on Inactivity
- After 30 minutes of no mouse, keyboard, or touch activity a warning modal appears
- A 2-minute countdown gives the user a chance to stay signed in
- If no action is taken the user is automatically signed out
- An Active/Idle dot indicator added to the topbar
- Sign-out due to inactivity is recorded in the audit log

### Print Employee Profile
- Added a Print button on every employee profile
- On print: navigation, buttons, and forms are hidden via CSS `@media print`
- A clean header with employee name and print date appears at the top
- Manager notes render as read-only text in the printout
- Edit and remove buttons are hidden from the printed page

---

## v5 — Arriving Late + Time-Off Requests with Image Upload
**Problem:** Managers needed to track incidents beyond full call-offs — specifically employees arriving late or leaving early. There was also no place to log and store time-off requests, which were being handled informally with no paper trail.

**Solution:** Added Arrived Late as a new reason type and built a dedicated Time Off tab with image attachment support.

**Changes made:**

### Arrived Late reason
- Added `late` as a sixth reason option in the log form, edit modal, filter bar, and profile breakdown chart
- Displayed with a teal badge to distinguish from Left Early (purple)

### Time Off Tab
- New dedicated tab for logging time-off requests
- Fields: employee name, department, type (vacation, personal, medical, other), from date, to date, logged by, notes
- Image attachment with two options:
  - **Take photo** — opens device camera directly (uses `capture="environment"` attribute)
  - **Choose photo** — opens photo library
- Images are uploaded to a private Supabase Storage bucket (`timeoff-requests`)
- Thumbnails load via signed URLs with a client-side cache to avoid redundant requests
- Tap any thumbnail to view the full-size image in an overlay
- Each request can be marked as **Approved**, **Denied**, or reset to **Pending**
- All status changes are recorded in the audit log
- Requests can be deleted — the associated image is also removed from storage

**SQL run:**
```sql
create table timeoff_requests (...);
alter table timeoff_requests enable row level security;
-- policies for select, insert, update, delete
-- storage bucket policies for timeoff-requests
```

---

## v6 — Employee Autofill on Name Selection
**Problem:** When logging a call-off or time-off request for an existing employee, the manager had to manually re-select the department even though it was already stored on the employee's record.

**Solution:** Added a `change` event listener on the employee name fields. When a name is typed or selected that matches an existing employee, the department field automatically populates with their saved department.

**Where it applies:**
- Log a call-off form on the Dashboard
- Log a time-off request form on the Time Off tab

---

## v7 — Restructure: Single HTML to Modular Vite Project
**Problem:** The entire app was one `index.html` file with all HTML, CSS, and JavaScript mixed together. This raised concerns about maintainability as the app grew, and the Supabase keys were visible in plain text to anyone who viewed the page source.

**Solution:** Restructured the app as a **Vite vanilla JavaScript project** with separated files and environment variable support.

**Changes made:**
- Set up Vite with Node.js v22
- Moved all HTML markup to `index.html`
- Moved all styles to `src/style.css`
- Split JavaScript into eight focused modules:
  - `supabase.js` — client initialization using `import.meta.env`
  - `main.js` — app entry point, view routing, session handling
  - `auth.js` — sign in and sign out
  - `dashboard.js` — call-off log and entry management
  - `employees.js` — employee list and management
  - `profile.js` — employee profile rendering and actions
  - `timeoff.js` — time-off request management
  - `audit.js` — audit log writing and rendering
  - `inactivity.js` — idle timeout logic
  - `utils.js` — shared constants, helpers, toast, screen switching
- Moved Supabase keys to `.env` file — injected at build time by Vite, never committed to Git
- Added `.gitignore` to exclude `.env`, `node_modules`, and `dist`
- Connected project to a **private GitHub repository**
- Connected GitHub to **Netlify** for automatic CI/CD deployment
- Supabase keys stored as environment variables in Netlify dashboard

**Result:** Every `git push` to the main branch automatically triggers a Netlify build and deploys the updated app. Keys are no longer visible in the browser source.

---

## Bug Fix — Employee Call-Off Count Wrong on First Load
**Problem:** When navigating to the Employees tab for the first time, all employees showed a call-off count of 1 regardless of their actual history.

**Root cause:** The `renderEmployees` function was being called with an empty array `[]` for entries instead of the actual loaded entries array.

**Fix:** Updated `main.js` to import and pass the live `entries` array from `dashboard.js` when calling `renderEmployees`. Also updated `initEmployees` to accept a `getEntries` callback so search and view toggle always use current data.

---

## Bug Fix — App Stuck on Loading Screen When Switching Browser Tabs
**Problem:** When navigating away to a different browser tab and returning, the app would display the loading screen and never recover.

**Root cause:** Supabase fires a `SIGNED_IN` event on `onAuthStateChange` every time the tab regains focus and the token is refreshed. The listener was calling `startApp` every time this happened, which set the screen back to loading and re-fetched all data from scratch.

**Fix:** Added an `appStarted` boolean flag in `main.js`. The flag is set to `true` the first time `startApp` runs successfully. The `onAuthStateChange` listener now only calls `startApp` if `appStarted` is `false`. The flag resets to `false` on sign-out so the next genuine login works correctly.

```javascript
let appStarted = false;

async function startApp(user) {
  if (appStarted) return;
  appStarted = true;
  // ...
}

sb.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && !appStarted) {
    await startApp(session.user);
  } else if (event === 'SIGNED_OUT') {
    appStarted = false;
    // ...
  }
});
```

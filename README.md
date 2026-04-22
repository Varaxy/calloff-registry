# 📋 Call-Off Registry

A full-stack web app for managing employee call-offs, time-off requests, and attendance records in retail and grocery store environments. Built to replace paper logs, group chats, and memory with a single, searchable, auditable source of truth.

> Built and deployed by a working department manager solving a real operational problem.

---

## The Problem

Managing employee attendance in a grocery store means juggling paper logs, group chats, text threads, and memory. Patterns go unnoticed. Time-off requests get lost. Documentation is inconsistent — and when HR or upper management asks for history, nothing is easy to pull.

## The Solution

A multi-view, multi-user web app that any manager can open on a phone or desktop, log a call-off in under 30 seconds, track time-off requests with photo attachments, review employee patterns at a glance, and pull a complete audit trail at any time — with real cloud sync across devices and managers.

---

## Features

### Dashboard
- Log call-offs with employee name, department, shift, reason, and notes
- Smart repeat-offender alerts when an employee has 3+ call-offs in 30 days
- Filter pills: reason type, date range, this week
- List and "by day" view toggles
- Live metrics: total entries, this week, no-shows, unique employees

### Employees
- Searchable employee directory with department grouping
- Flag employees for manager attention (flagged employees sort to top)
- Employee profiles with call-off history, reason breakdowns, and monthly stats
- Persistent manager notes per employee
- Editable profiles with name-change propagation across all records
- Print-friendly profile view for HR documentation

### Time Off
- Log vacation, personal, medical, or other time-off types
- Date range support for multi-day requests
- Photo attachments via camera or library (stored in Supabase Storage, viewed via signed URLs)
- Approve / deny / pending status workflow
- Filter by status

### Audit Log
- Full activity trail: entries, employees, time-off requests, and auth events
- Every action logged with user email, timestamp, target, and details
- Filterable by event type
- Persisted to the database for compliance-grade record-keeping

### Auth & Security
- Email and password authentication via Supabase Auth
- Session persistence with auth state listener
- 30-minute inactivity timeout with 2-minute warning countdown
- Live idle/active status indicator
- All actions attributed to the signed-in user

### Utilities
- CSV export for all call-off entries
- Toast notifications for every action
- Mobile-first responsive design with bottom navigation on small screens
- Print stylesheet for employee profiles

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Vanilla JS (ES modules), HTML, CSS |
| Build tool | Vite |
| Backend / DB | Supabase (Postgres) |
| Auth | Supabase Auth |
| File storage | Supabase Storage (signed URLs) |
| Fonts | DM Sans + DM Mono |
| Deployment | Netlify |

### Why vanilla JS instead of React?

This started as a simple localStorage prototype, and as it grew I wanted to keep load times instant and the bundle size small — managers open this on old phones in the back room. Vanilla ES modules gave me real separation of concerns (8 focused modules) without framework overhead. A full React rewrite is on the roadmap once feature growth justifies it.

---

## Live Demo

🔗 [View Live App](#) ← *(replace with your Netlify URL)*

---

## Architecture

```
calloff-registry/
├── index.html                  # App shell: auth, loading, 5 views, 2 modals, image viewer
├── package.json                # Vite + Supabase JS client
├── public/
│   ├── favicon.svg
│   └── icons.svg
└── src/
    ├── main.js                 # App orchestration, routing, session lifecycle
    ├── supabase.js             # Supabase client (uses VITE_ env vars)
    ├── style.css               # Full design system
    └── modules/
        ├── auth.js             # Sign in / sign out, session handling
        ├── dashboard.js        # Call-off logging, filtering, CSV export
        ├── employees.js        # Directory, search, add/edit
        ├── profile.js          # Employee profiles, notes, flagging, print
        ├── timeoff.js          # Time-off requests, photo uploads, approvals
        ├── audit.js            # Activity logging and display
        ├── inactivity.js       # Idle detection and auto sign-out
        └── utils.js            # Constants, formatters, toast, helpers
```

### Database Tables

- `calloffs` — call-off entries
- `employees` — employee records with flags and notes
- `timeoff_requests` — time-off requests with status and image paths
- `audit_log` — immutable activity trail

### Storage Buckets

- `timeoff-requests` — image attachments, served via short-lived signed URLs

---

## Getting Started

### Prerequisites
- Node.js 20+
- A Supabase project with the tables and storage bucket set up

### Setup

```bash
git clone https://github.com/Varaxy/calloff-registry.git
cd calloff-registry
npm install
```

Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_KEY=your_supabase_anon_key
```

### Run locally

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Deploy to Netlify

1. Connect the repo to [Netlify](https://netlify.com)
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` as environment variables
5. Auto-deploys on every push to main

---

## Screenshots

> *(Add 3–4 screenshots here: dashboard, employee profile, time-off view, audit log)*

---

## Why This Project

I built this while managing a grocery department because the tools available were either overkill (enterprise HR systems) or too informal (group chats and sticky notes). I wanted something a non-technical manager could use on their phone between tasks, that would still hold up as real operational documentation.

The project evolved in meaningful ways. It started as a single-file localStorage prototype to prove the core idea. Once managers started using it, I hit real limitations — data was trapped on one device, there was no way to attribute actions to specific managers, and photos of doctor's notes had nowhere to live. That's when I rebuilt it on Supabase: Postgres for real data, Supabase Auth for per-manager attribution, and Supabase Storage for image attachments with signed URL access.

The architecture decisions in this project — when to use a backend, how to split vanilla JS into modules, how to design an audit log that actually gets used — came from solving problems I was living with, not from a tutorial.

---

## Roadmap

- [ ] React rewrite with proper routing and state management
- [ ] Multi-location / multi-store support
- [ ] Push notifications for pending time-off requests
- [ ] PDF export for HR documentation
- [ ] Attendance analytics (trends, department comparisons)
- [ ] Role-based access (manager vs. supervisor vs. HR)

---

## License

MIT

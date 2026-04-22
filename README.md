# Call-Off Registry

A web app for tracking employee call-offs and time-off requests in grocery and retail stores.

Built by a department manager to replace paper logs, group chats, and memory with one simple tool.

## Features

- Log call-offs with name, department, shift, and reason
- Employee profiles with history, notes, and flagging
- Time-off requests with photo attachments and approval workflow
- Full audit log of every action
- CSV export
- Works on mobile and desktop

## Tech Stack

- Vanilla JS (ES modules) + Vite
- Supabase (Postgres, Auth, Storage)
- Netlify for deployment

## Live Demo

[View Live App](#) *https://https://costlesslogoff.netlify.app/*

## Getting Started

```bash
git clone https://github.com/Varaxy/calloff-registry.git
cd calloff-registry
npm install
npm run dev
```

Create a `.env` file with your Supabase credentials:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_KEY=your_supabase_anon_key
```

## License

MIT

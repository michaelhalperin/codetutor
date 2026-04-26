# CodeTutor — AI-Powered Coding Practice App

A full-stack web app that helps students learn coding by practicing with AI-generated questions and exercises. Built with React, Express, Supabase, and GPT-4o (OpenAI).

---

## Features

- **5 question types**: Multiple choice, True/False, Fill in the blank, Open-ended, and Coding exercises (with VS Code-style editor)
- **18+ coding topics** (Python, JS, SQL, Algorithms, Git, Docker, and more) + custom topic input
- **Difficulty levels**: Beginner, Intermediate, Advanced
- **AI feedback**: GPT-4o evaluates every answer and gives specific, encouraging feedback
- **Progress tracking**: Score history, topic stats, streaks, dashboard
- **User accounts**: Sign up / log in via Supabase Auth
- **Responsive**: Works on mobile and desktop

---

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React + Vite + Tailwind CSS         |
| Code Editor | Monaco Editor (@monaco-editor/react) |
| Backend  | Node.js + Express                   |
| Auth + DB | Supabase (PostgreSQL + Auth)        |
| AI       | OpenAI API (gpt-4o)                  |

---

## Project Structure

```
coding-tutor/
├── client/               # React frontend
│   ├── src/
│   │   ├── pages/        # Login, Signup, Dashboard, Topics, Session, Results
│   │   ├── components/   # Navbar, ProtectedRoute
│   │   ├── context/      # AuthContext
│   │   └── lib/          # supabase.js, api.js
│   └── .env.example
├── server/               # Express backend
│   ├── index.js
│   ├── routes/           # questions.js, sessions.js, dashboard.js
│   ├── services/         # claude.js, db.js
│   ├── middleware/        # auth.js
│   └── .env.example
└── supabase/
    └── schema.sql        # Database schema — run this in Supabase
```

---

## Setup Instructions

### Step 1 — Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **SQL Editor** in your dashboard
4. Copy and paste the contents of `supabase/schema.sql` and run it
5. Go to **Project Settings → API** and copy:
   - **Project URL**
   - **anon/public key**
   - **service_role key** (keep this secret!)

### Step 2 — OpenAI API Key

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create an API key (requires an OpenAI account with billing enabled)

### Step 3 — Server Setup

```bash
cd server
cp .env.example .env
# Fill in your values in .env
npm install
npm run dev
```

The server will start on `http://localhost:3001`

### Step 4 — Client Setup

```bash
cd client
cp .env.example .env
# Fill in your Supabase URL and anon key in .env
npm install
npm run dev
```

The app will open at `http://localhost:5173`

---

## Environment Variables

### `server/.env`

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 3001) |
| `CLIENT_URL` | Frontend URL for CORS |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only, keep secret) |
| `OPENAI_API_KEY` | Your OpenAI API key |

### `client/.env`

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_API_URL` | Backend server URL |

---

## Running in Production

For production deployment:
- Host the **client** on Vercel or Netlify (set env variables in their dashboard)
- Host the **server** on Railway, Render, or Fly.io
- Update `CLIENT_URL` on the server and `VITE_API_URL` on the client to your production URLs
- In Supabase, add your production domain to the **Auth → URL Configuration → Allowed Redirect URLs**

---

## How It Works

1. Student signs up / logs in
2. Picks a coding topic + difficulty + number of questions
3. The app creates a session and calls the server
4. The server calls Claude, which generates a tailored mix of questions
5. Student answers each question (multiple choice, typed text, or actual code)
6. Claude evaluates each answer and gives immediate feedback
7. At the end, results are saved to Supabase and shown on the dashboard

---

AI-powered by OpenAI `gpt-4o`

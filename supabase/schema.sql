-- ============================================================
-- Coding Tutor App - Supabase Schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- Extended user data beyond Supabase Auth
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique,
  full_name   text,
  avatar_url  text,
  role        text default 'student' check (role in ('student', 'teacher')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- SESSIONS
-- Each practice session a student starts
-- ============================================================
create table if not exists public.sessions (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references public.profiles(id) on delete cascade not null,
  topic         text not null,
  difficulty    text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  total_questions int default 0,
  correct_answers int default 0,
  score_percent   numeric(5,2) default 0,
  completed       boolean default false,
  started_at      timestamptz default now(),
  completed_at    timestamptz
);

-- ============================================================
-- QUESTIONS
-- Each question generated for a session
-- ============================================================
create table if not exists public.questions (
  id            uuid primary key default uuid_generate_v4(),
  session_id    uuid references public.sessions(id) on delete cascade not null,
  user_id       uuid references public.profiles(id) on delete cascade not null,
  question_type text not null check (question_type in ('multiple_choice', 'true_false', 'fill_blank', 'open_ended', 'coding')),
  question_text text not null,
  options       jsonb,           -- for multiple choice: ["A","B","C","D"]
  correct_answer text,           -- the correct answer
  user_answer   text,            -- what the student submitted
  is_correct    boolean,
  ai_feedback   text,            -- Claude's explanation / feedback
  code_language text,            -- for coding questions: 'python', 'javascript', etc.
  created_at    timestamptz default now(),
  answered_at   timestamptz
);

-- ============================================================
-- QUESTION BANK
-- Shared pool of questions (seeded + AI-generated over time)
-- NOT user-specific — grows as students exhaust the bank
-- ============================================================
create table if not exists public.question_bank (
  id             uuid primary key default uuid_generate_v4(),
  topic          text not null,
  difficulty     text not null default 'mixed',
  question_type  text not null check (question_type in ('multiple_choice', 'true_false', 'fill_blank', 'open_ended', 'coding')),
  question_text  text not null,
  options        jsonb,
  correct_answer text,
  explanation    text,
  code_language  text,
  source         text not null default 'seed' check (source in ('seed', 'ai_generated')),
  created_at     timestamptz default now()
);

-- ============================================================
-- USER QUESTION SEEN
-- Tracks which bank questions each user has already seen
-- Used to avoid repeating questions until the bank is exhausted
-- ============================================================
create table if not exists public.user_question_seen (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid references public.profiles(id) on delete cascade not null,
  topic            text not null,
  question_bank_id uuid references public.question_bank(id) on delete cascade not null,
  seen_at          timestamptz default now(),
  unique (user_id, question_bank_id)
);

-- ============================================================
-- TOPIC STATS
-- Aggregated per-topic performance per user
-- ============================================================
create table if not exists public.topic_stats (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references public.profiles(id) on delete cascade not null,
  topic           text not null,
  sessions_count  int default 0,
  total_questions int default 0,
  correct_answers int default 0,
  avg_score       numeric(5,2) default 0,
  last_practiced  timestamptz default now(),
  unique (user_id, topic)
);

-- ============================================================
-- Row Level Security (RLS)
-- Users can only see their own data
-- ============================================================
alter table public.profiles          enable row level security;
alter table public.sessions          enable row level security;
alter table public.questions         enable row level security;
alter table public.topic_stats       enable row level security;
alter table public.question_bank     enable row level security;
alter table public.user_question_seen enable row level security;

-- Profiles: users can read/update their own
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"   on public.profiles for select using (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Sessions: users can crud their own
drop policy if exists "Users can view own sessions" on public.sessions;
create policy "Users can view own sessions"   on public.sessions for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own sessions" on public.sessions;
create policy "Users can insert own sessions" on public.sessions for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own sessions" on public.sessions;
create policy "Users can update own sessions" on public.sessions for update using (auth.uid() = user_id);

-- Questions: users can crud their own
drop policy if exists "Users can view own questions" on public.questions;
create policy "Users can view own questions"   on public.questions for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own questions" on public.questions;
create policy "Users can insert own questions" on public.questions for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own questions" on public.questions;
create policy "Users can update own questions" on public.questions for update using (auth.uid() = user_id);

-- Topic stats: users can crud their own
drop policy if exists "Users can view own topic_stats" on public.topic_stats;
create policy "Users can view own topic_stats"   on public.topic_stats for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own topic_stats" on public.topic_stats;
create policy "Users can insert own topic_stats" on public.topic_stats for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own topic_stats" on public.topic_stats;
create policy "Users can update own topic_stats" on public.topic_stats for update using (auth.uid() = user_id);

-- Question bank: all authenticated users can read (shared pool)
drop policy if exists "Anyone can view question bank" on public.question_bank;
create policy "Anyone can view question bank" on public.question_bank for select using (auth.role() = 'authenticated');
-- Only service role inserts into the bank (done server-side via service key)

-- User question seen: users manage their own records
drop policy if exists "Users can view own seen questions" on public.user_question_seen;
create policy "Users can view own seen questions"   on public.user_question_seen for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own seen questions" on public.user_question_seen;
create policy "Users can insert own seen questions" on public.user_question_seen for insert with check (auth.uid() = user_id);

-- ============================================================
-- INDEXES for performance
-- ============================================================
create index if not exists idx_sessions_user_id        on public.sessions(user_id);
create index if not exists idx_questions_session_id    on public.questions(session_id);
create index if not exists idx_topic_stats_user_id     on public.topic_stats(user_id);
create index if not exists idx_question_bank_topic     on public.question_bank(topic);
create index if not exists idx_user_seen_user_topic    on public.user_question_seen(user_id, topic);
create index if not exists idx_user_seen_bank_id       on public.user_question_seen(question_bank_id);

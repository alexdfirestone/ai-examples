-- Initial schema for Competitor Downtime Tracker
-- Run in Supabase SQL Editor or via `supabase db push`

-- Snapshots: one row per status check per resource
create table snapshots (
  id bigint generated always as identity primary key,
  competitor_name text not null,
  resource_name text not null,
  status text not null,
  incident_description text,
  checked_at timestamptz not null default now()
);

alter table snapshots enable row level security;
create policy "Public read snapshots" on snapshots for select using (true);
create policy "Service insert snapshots" on snapshots for insert with check (true);

create index idx_snapshots_competitor on snapshots (competitor_name, checked_at desc);

-- Registrations: accounts people want to be pinged about
create table registrations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  competitor_name text not null,
  slack_user_id text,
  sfdc_account_url text,
  shared_channel_url text,
  created_at timestamptz not null default now()
);

alter table registrations enable row level security;
create policy "Public read registrations" on registrations for select using (true);
create policy "Public insert registrations" on registrations for insert with check (true);
create policy "Public delete registrations" on registrations for delete using (true);

-- Alert threads: track active Slack alert threads
create table alert_threads (
  id uuid primary key default gen_random_uuid(),
  competitor_name text not null,
  slack_thread_ts text not null,
  slack_channel_id text not null,
  status text not null,
  started_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table alert_threads enable row level security;
create policy "Public read alert_threads" on alert_threads for select using (true);
create policy "Service insert alert_threads" on alert_threads for insert with check (true);
create policy "Service update alert_threads" on alert_threads for update using (true);

create index idx_alert_threads_active on alert_threads (competitor_name)
  where resolved_at is null;

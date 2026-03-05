-- Add resource-level tracking support
-- Adds resource_id to existing tables and creates tracked_resources table

-- Add resource_id column to snapshots
alter table snapshots add column resource_id text;

-- Add index for per-resource queries
create index idx_snapshots_resource on snapshots (competitor_name, resource_id, checked_at desc);

-- Add resource_id column to alert_threads
alter table alert_threads add column resource_id text;

-- Update the active threads index to include resource_id
drop index if exists idx_alert_threads_active;
create index idx_alert_threads_active on alert_threads (competitor_name, resource_id)
  where resolved_at is null;

-- Tracked resources: which resources are enabled for monitoring
create table tracked_resources (
  id uuid primary key default gen_random_uuid(),
  competitor_name text not null,
  resource_id text not null,
  resource_name text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique(competitor_name, resource_id)
);

alter table tracked_resources enable row level security;
create policy "Public read tracked_resources" on tracked_resources for select using (true);
create policy "Public insert tracked_resources" on tracked_resources for insert with check (true);
create policy "Public update tracked_resources" on tracked_resources for update using (true);

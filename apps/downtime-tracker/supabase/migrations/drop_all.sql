-- Drop everything and start fresh
-- Run this first, then run 00001 and 00002 in order

drop table if exists tracked_resources cascade;
drop table if exists alert_threads cascade;
drop table if exists registrations cascade;
drop table if exists snapshots cascade;

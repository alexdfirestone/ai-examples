import { createClient } from "@supabase/supabase-js";

// Browser client (anon key, subject to RLS)
export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Server client (service role key, bypasses RLS — for cron route only)
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// --- Row types ---

export type Snapshot = {
  id: number;
  competitor_name: string;
  resource_id: string | null;
  resource_name: string;
  status: string;
  incident_description: string | null;
  checked_at: string;
};

export type Registration = {
  id: string;
  name: string;
  competitor_name: string;
  slack_user_id: string | null;
  sfdc_account_url: string | null;
  shared_channel_url: string | null;
  created_at: string;
};

export type AlertThread = {
  id: string;
  competitor_name: string;
  resource_id: string | null;
  slack_thread_ts: string;
  slack_channel_id: string;
  status: string;
  started_at: string;
  resolved_at: string | null;
};

export type TrackedResource = {
  id: string;
  competitor_name: string;
  resource_id: string;
  resource_name: string;
  enabled: boolean;
  created_at: string;
};

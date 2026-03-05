import { createServerClient } from "@/lib/supabase";
import type { AlertThread, Registration, TrackedResource } from "@/lib/supabase";
import { competitors } from "@/lib/competitors";

// --- BetterStack feed types ---

type StatusPageResource = {
  type: "status_page_resource";
  id: string;
  attributes: { public_name: string; status: string };
};

type StatusUpdate = {
  type: "status_update";
  id: string;
  attributes: { message: string; published_at: string };
};

type StatusReport = {
  type: "status_report";
  id: string;
  attributes: { title: string; status_page_url: string };
};

type IncludedItem = StatusPageResource | StatusUpdate | StatusReport;

type FeedResponse = {
  data: unknown;
  included?: IncludedItem[];
};

type ResourceCheckResult = {
  competitorName: string;
  resourceId: string;
  resourceName: string;
  statusPageUrl: string;
  status: string | null;
  incidentDescription: string | null;
};

// --- Feed fetching (one fetch per competitor, extract per resource) ---

async function fetchFeed(feedUrl: string): Promise<FeedResponse | null> {
  try {
    const res = await fetch(feedUrl, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      console.error(`Failed to fetch feed ${feedUrl}: ${res.status}`);
      return null;
    }
    return (await res.json()) as FeedResponse;
  } catch (error) {
    console.error(`Error fetching feed ${feedUrl}:`, error);
    return null;
  }
}

function extractResourceStatus(
  feed: FeedResponse,
  resourceId: string
): { status: string; incidentDescription: string | null } | null {
  const resource = feed.included?.find(
    (item): item is StatusPageResource =>
      item.type === "status_page_resource" && item.id === resourceId
  );

  if (!resource) return null;

  let incidentDescription: string | null = null;
  if (resource.attributes.status !== "operational") {
    const latestUpdate = feed.included?.find(
      (item): item is StatusUpdate => item.type === "status_update"
    );
    if (latestUpdate) {
      incidentDescription = latestUpdate.attributes.message;
    } else {
      const report = feed.included?.find(
        (item): item is StatusReport => item.type === "status_report"
      );
      if (report) {
        incidentDescription = report.attributes.title;
      }
    }
  }

  return { status: resource.attributes.status, incidentDescription };
}

// --- Slack helpers ---

function isAlertWorthy(status: string): boolean {
  return status === "downtime" || status === "degraded";
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) return `${hours}h ${remainingMinutes}m`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
}

function statusEmoji(status: string): string {
  switch (status) {
    case "operational":
      return "\u{1F7E2}";
    case "degraded":
      return "\u{1F7E1}";
    case "downtime":
      return "\u{1F534}";
    case "maintenance":
      return "\u{1F535}";
    default:
      return "\u26AA";
  }
}

type SlackBlock =
  | { type: "section"; text: { type: "mrkdwn"; text: string } }
  | { type: "context"; elements: Array<{ type: "mrkdwn"; text: string }> };

async function postSlackMessage(opts: {
  channel: string;
  text: string;
  blocks: SlackBlock[];
  threadTs?: string;
}): Promise<{ ts: string } | null> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.log("[Slack message (no token)]", opts.text);
    return null;
  }

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: opts.channel,
      text: opts.text,
      blocks: opts.blocks,
      ...(opts.threadTs ? { thread_ts: opts.threadTs } : {}),
    }),
  });

  const data = await res.json();
  if (!data.ok) {
    console.error("Slack API error:", data.error);
    return null;
  }
  return { ts: data.ts };
}

// --- Supabase-backed alert handlers ---

type SupabaseClient = ReturnType<typeof createServerClient>;

async function handleNewOutage(
  supabase: SupabaseClient,
  result: ResourceCheckResult,
  channelId: string | undefined
) {
  if (!channelId) return;

  const emoji = statusEmoji(result.status!);
  const text = `${emoji} ${result.competitorName} ${result.resourceName} \u2192 ${result.status}`;

  const blocks: SlackBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${emoji} *${result.competitorName}* ${result.resourceName} \u2192 *${result.status}*`,
      },
    },
  ];

  if (result.incidentDescription) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `> ${result.incidentDescription}` },
    });
  }

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `<${result.statusPageUrl}|View status page>`,
      },
    ],
  });

  const mainMessage = await postSlackMessage({
    channel: channelId,
    text,
    blocks,
  });

  if (!mainMessage) return;

  await supabase.from("alert_threads").insert({
    competitor_name: result.competitorName,
    resource_id: result.resourceId,
    slack_thread_ts: mainMessage.ts,
    slack_channel_id: channelId,
    status: result.status!,
    started_at: new Date().toISOString(),
  });

  await pingRegistrations(
    supabase,
    result.competitorName,
    channelId,
    mainMessage.ts
  );
}

async function handleRecovery(
  supabase: SupabaseClient,
  result: ResourceCheckResult,
  channelId: string | undefined
) {
  if (!channelId) return;

  const { data: activeThread } = await supabase
    .from("alert_threads")
    .select("*")
    .eq("competitor_name", result.competitorName)
    .eq("resource_id", result.resourceId)
    .is("resolved_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const thread = activeThread as AlertThread | null;
  const durationMs = thread
    ? Date.now() - new Date(thread.started_at).getTime()
    : null;
  const durationText = durationMs
    ? ` after ${formatDuration(durationMs)}`
    : "";

  const text = `\u{1F7E2} ${result.competitorName} ${result.resourceName} \u2192 operational${durationText}`;
  const blocks: SlackBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `\u{1F7E2} *${result.competitorName}* ${result.resourceName} \u2192 *operational*${durationText}`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `<${result.statusPageUrl}|View status page>`,
        },
      ],
    },
  ];

  await postSlackMessage({
    channel: channelId,
    text,
    blocks,
    threadTs: thread?.slack_thread_ts,
  });

  if (thread) {
    await supabase
      .from("alert_threads")
      .update({ resolved_at: new Date().toISOString() })
      .eq("id", thread.id);
  }
}

async function handleEscalation(
  supabase: SupabaseClient,
  result: ResourceCheckResult,
  channelId: string | undefined
) {
  if (!channelId) return;

  const { data: activeThread } = await supabase
    .from("alert_threads")
    .select("*")
    .eq("competitor_name", result.competitorName)
    .eq("resource_id", result.resourceId)
    .is("resolved_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const thread = activeThread as AlertThread | null;
  const emoji = statusEmoji(result.status!);
  const text = `${emoji} ${result.competitorName} ${result.resourceName} escalated to ${result.status}`;
  const blocks: SlackBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${emoji} *${result.competitorName}* ${result.resourceName} escalated to *${result.status}*`,
      },
    },
  ];

  if (result.incidentDescription) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `> ${result.incidentDescription}` },
    });
  }

  await postSlackMessage({
    channel: channelId,
    text,
    blocks,
    threadTs: thread?.slack_thread_ts,
  });
}

async function pingRegistrations(
  supabase: SupabaseClient,
  competitorName: string,
  channelId: string,
  threadTs: string
) {
  const { data: registrations } = await supabase
    .from("registrations")
    .select("*")
    .eq("competitor_name", competitorName);

  const regs = (registrations ?? []) as Registration[];
  if (regs.length === 0) return;

  const lines = regs.map((reg) => {
    const mention = reg.slack_user_id ? `<@${reg.slack_user_id}>` : reg.name;
    const parts = [mention];
    if (reg.sfdc_account_url)
      parts.push(`<${reg.sfdc_account_url}|SFDC Account>`);
    if (reg.shared_channel_url)
      parts.push(`<${reg.shared_channel_url}|Shared Channel>`);
    return parts.join(" | ");
  });

  const text = `Accounts on ${competitorName}:\n${lines.join("\n")}`;

  await postSlackMessage({
    channel: channelId,
    text,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text },
      },
    ],
    threadTs,
  });
}

// --- Exported core logic ---

export async function runStatusCheck(): Promise<{
  ok: boolean;
  checked: number;
  stored: number;
}> {
  const supabase = createServerClient();
  const now = new Date().toISOString();

  // 1. Get enabled tracked resources from Supabase
  const { data: trackedRows } = await supabase
    .from("tracked_resources")
    .select("*")
    .eq("enabled", true);

  const tracked = (trackedRows ?? []) as TrackedResource[];

  if (tracked.length === 0) {
    console.log("No tracked resources enabled — skipping check.");
    return { ok: true, checked: 0, stored: 0 };
  }

  // 2. Group tracked resources by competitor so we fetch each feed only once
  const byCompetitor = new Map<string, TrackedResource[]>();
  for (const tr of tracked) {
    const list = byCompetitor.get(tr.competitor_name) ?? [];
    list.push(tr);
    byCompetitor.set(tr.competitor_name, list);
  }

  // Build a lookup from competitor name → feed URL / status page URL
  const competitorMap = new Map(competitors.map((c) => [c.name, c]));

  // 3. Fetch all feeds in parallel
  const feedEntries = Array.from(byCompetitor.keys()).map((name) => {
    const comp = competitorMap.get(name);
    return { name, feedUrl: comp?.feedUrl ?? "", statusPageUrl: comp?.statusPageUrl ?? "" };
  });

  const feeds = await Promise.all(
    feedEntries.map(async (entry) => ({
      name: entry.name,
      statusPageUrl: entry.statusPageUrl,
      feed: entry.feedUrl ? await fetchFeed(entry.feedUrl) : null,
    }))
  );

  const feedByName = new Map(feeds.map((f) => [f.name, f]));

  // 4. Extract status for each tracked resource
  const results: ResourceCheckResult[] = [];

  for (const [competitorName, resources] of byCompetitor) {
    const feedEntry = feedByName.get(competitorName);
    if (!feedEntry?.feed) {
      // Feed failed — mark all resources as unknown
      for (const tr of resources) {
        results.push({
          competitorName,
          resourceId: tr.resource_id,
          resourceName: tr.resource_name,
          statusPageUrl: feedEntry?.statusPageUrl ?? "",
          status: null,
          incidentDescription: null,
        });
      }
      continue;
    }

    for (const tr of resources) {
      const extracted = extractResourceStatus(feedEntry.feed, tr.resource_id);
      results.push({
        competitorName,
        resourceId: tr.resource_id,
        resourceName: tr.resource_name,
        statusPageUrl: feedEntry.statusPageUrl,
        status: extracted?.status ?? null,
        incidentDescription: extracted?.incidentDescription ?? null,
      });
    }
  }

  // 5. Store snapshots
  const snapshots = results
    .filter((r) => r.status !== null)
    .map((r) => ({
      competitor_name: r.competitorName,
      resource_id: r.resourceId,
      resource_name: r.resourceName,
      status: r.status!,
      incident_description: r.incidentDescription,
      checked_at: now,
    }));

  if (snapshots.length > 0) {
    const { error } = await supabase.from("snapshots").insert(snapshots);
    if (error) console.error("Failed to insert snapshots:", error);
  }

  // 6. Compare with previous snapshot per resource and handle alerts
  const channelId = process.env.SLACK_ALERTS_CHANNEL_ID;

  for (const result of results) {
    if (result.status === null) continue;

    const { data: previous } = await supabase
      .from("snapshots")
      .select("*")
      .eq("competitor_name", result.competitorName)
      .eq("resource_id", result.resourceId)
      .lt("checked_at", now)
      .order("checked_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!previous) continue;
    if (previous.status === result.status) continue;

    // Status changed
    if (result.status === "operational" && previous.status !== "operational") {
      await handleRecovery(supabase, result, channelId);
    } else if (
      isAlertWorthy(result.status) &&
      previous.status === "operational"
    ) {
      await handleNewOutage(supabase, result, channelId);
    } else if (
      isAlertWorthy(result.status) &&
      previous.status !== "operational"
    ) {
      await handleEscalation(supabase, result, channelId);
    }
  }

  return { ok: true, checked: results.length, stored: snapshots.length };
}

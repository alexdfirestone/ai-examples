"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// --- Competitor config (canonical source, duplicated from lib/competitors.ts) ---

type Competitor = {
  name: string;
  feedUrl: string;
  resourceId: string;
  resourceName: string;
  statusPageUrl: string;
};

const COMPETITORS: Competitor[] = [
  {
    name: "E2B",
    feedUrl: "https://status.e2b.dev/index.json",
    resourceId: "8408369",
    resourceName: "Sandbox Infrastructure",
    statusPageUrl: "https://status.e2b.dev",
  },
  {
    name: "Daytona",
    feedUrl: "https://status.app.daytona.io/index.json",
    resourceId: "8572666",
    resourceName: "Sandbox creation",
    statusPageUrl: "https://status.app.daytona.io",
  },
  {
    name: "Modal",
    feedUrl: "https://status.modal.com/index.json",
    resourceId: "8470789",
    resourceName: "Sandboxes",
    statusPageUrl: "https://status.modal.com",
  },
];

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

type FetchResult = {
  competitor: Competitor;
  status: string | null;
  incidentDescription: string | null;
};

// --- Status feed fetching ---

async function fetchCompetitorStatus(
  competitor: Competitor
): Promise<FetchResult> {
  try {
    const res = await fetch(competitor.feedUrl, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error(
        `Failed to fetch ${competitor.name} status: ${res.status}`
      );
      return { competitor, status: null, incidentDescription: null };
    }

    const data: FeedResponse = await res.json();
    const resource = data.included?.find(
      (item): item is StatusPageResource =>
        item.type === "status_page_resource" &&
        item.id === competitor.resourceId
    );

    if (!resource) {
      console.error(
        `Resource ${competitor.resourceId} not found for ${competitor.name}`
      );
      return { competitor, status: null, incidentDescription: null };
    }

    let incidentDescription: string | null = null;
    if (resource.attributes.status !== "operational") {
      const latestUpdate = data.included?.find(
        (item): item is StatusUpdate => item.type === "status_update"
      );
      if (latestUpdate) {
        incidentDescription = latestUpdate.attributes.message;
      } else {
        const report = data.included?.find(
          (item): item is StatusReport => item.type === "status_report"
        );
        if (report) {
          incidentDescription = report.attributes.title;
        }
      }
    }

    return {
      competitor,
      status: resource.attributes.status,
      incidentDescription,
    };
  } catch (error) {
    console.error(`Error fetching ${competitor.name} status:`, error);
    return { competitor, status: null, incidentDescription: null };
  }
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
      return "\u{1F7E2}"; // green circle
    case "degraded":
      return "\u{1F7E1}"; // yellow circle
    case "downtime":
      return "\u{1F534}"; // red circle
    case "maintenance":
      return "\u{1F535}"; // blue circle
    default:
      return "\u26AA"; // white circle
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

// --- Main cron action ---

export const checkAll = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // 1. Fetch all competitor statuses in parallel
    const results = await Promise.all(COMPETITORS.map(fetchCompetitorStatus));

    // 2. Store snapshots
    const snapshots = results
      .filter((r) => r.status !== null)
      .map((r) => ({
        competitorName: r.competitor.name,
        resourceName: r.competitor.resourceName,
        status: r.status!,
        ...(r.incidentDescription
          ? { incidentDescription: r.incidentDescription }
          : {}),
        checkedAt: now,
      }));

    if (snapshots.length > 0) {
      await ctx.runMutation(internal.mutations.insertSnapshots, { snapshots });
    }

    // 3. For each result, compare with previous snapshot and handle alerts
    const channelId = process.env.SLACK_ALERTS_CHANNEL_ID;

    for (const result of results) {
      if (result.status === null) continue;

      const previous = await ctx.runQuery(
        internal.queries.getPreviousSnapshot,
        { competitorName: result.competitor.name, beforeTimestamp: now }
      );

      // First run — no previous snapshot, nothing to compare
      if (!previous) continue;

      // No change — skip
      if (previous.status === result.status) continue;

      // --- Status changed ---

      if (
        result.status === "operational" &&
        previous.status !== "operational"
      ) {
        // Recovery
        await handleRecovery(ctx, result, channelId);
      } else if (
        isAlertWorthy(result.status) &&
        previous.status === "operational"
      ) {
        // New outage/degradation from operational
        await handleNewOutage(ctx, result, channelId);
      } else if (
        isAlertWorthy(result.status) &&
        previous.status !== "operational"
      ) {
        // Escalation (e.g., degraded → downtime) — update in existing thread
        await handleEscalation(ctx, result, channelId);
      }
    }

    return { checked: results.length, stored: snapshots.length };
  },
});

async function handleNewOutage(
  ctx: { runQuery: Function; runMutation: Function },
  result: FetchResult,
  channelId: string | undefined
) {
  if (!channelId) return;

  const emoji = statusEmoji(result.status!);
  const text = `${emoji} ${result.competitor.name} ${result.competitor.resourceName} → ${result.status}`;

  const blocks: SlackBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${emoji} *${result.competitor.name}* ${result.competitor.resourceName} → *${result.status}*`,
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
        text: `<${result.competitor.statusPageUrl}|View status page>`,
      },
    ],
  });

  // Post main message
  const mainMessage = await postSlackMessage({
    channel: channelId,
    text,
    blocks,
  });

  if (!mainMessage) return;

  // Store the thread
  await ctx.runMutation(internal.mutations.createAlertThread, {
    competitorName: result.competitor.name,
    slackThreadTs: mainMessage.ts,
    slackChannelId: channelId,
    status: result.status!,
    startedAt: Date.now(),
  });

  // Ping registered people in a thread
  await pingRegistrations(ctx, result.competitor.name, channelId, mainMessage.ts);
}

async function handleRecovery(
  ctx: { runQuery: Function; runMutation: Function },
  result: FetchResult,
  channelId: string | undefined
) {
  if (!channelId) return;

  const activeThread = await ctx.runQuery(
    internal.queries.getActiveAlertThread,
    { competitorName: result.competitor.name }
  );

  const durationMs = activeThread
    ? Date.now() - activeThread.startedAt
    : null;
  const durationText = durationMs ? ` after ${formatDuration(durationMs)}` : "";

  const text = `\u{1F7E2} ${result.competitor.name} ${result.competitor.resourceName} → operational${durationText}`;
  const blocks: SlackBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `\u{1F7E2} *${result.competitor.name}* ${result.competitor.resourceName} → *operational*${durationText}`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `<${result.competitor.statusPageUrl}|View status page>`,
        },
      ],
    },
  ];

  await postSlackMessage({
    channel: channelId,
    text,
    blocks,
    threadTs: activeThread?.slackThreadTs,
  });

  if (activeThread) {
    await ctx.runMutation(internal.mutations.resolveAlertThread, {
      id: activeThread._id,
      resolvedAt: Date.now(),
    });
  }
}

async function handleEscalation(
  ctx: { runQuery: Function; runMutation: Function },
  result: FetchResult,
  channelId: string | undefined
) {
  if (!channelId) return;

  const activeThread = await ctx.runQuery(
    internal.queries.getActiveAlertThread,
    { competitorName: result.competitor.name }
  );

  const emoji = statusEmoji(result.status!);
  const text = `${emoji} ${result.competitor.name} escalated to ${result.status}`;
  const blocks: SlackBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${emoji} *${result.competitor.name}* escalated to *${result.status}*`,
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
    threadTs: activeThread?.slackThreadTs,
  });
}

async function pingRegistrations(
  ctx: { runQuery: Function },
  competitorName: string,
  channelId: string,
  threadTs: string
) {
  const registrations = await ctx.runQuery(
    internal.queries.getRegistrationsByCompetitor,
    { competitorName }
  );

  if (registrations.length === 0) return;

  // Build a single thread reply with all registered people
  const lines = registrations.map(
    (reg: {
      name: string;
      slackUserId?: string;
      sfdcAccountUrl?: string;
      sharedChannelUrl?: string;
    }) => {
      const mention = reg.slackUserId ? `<@${reg.slackUserId}>` : reg.name;
      const parts = [mention];
      if (reg.sfdcAccountUrl)
        parts.push(`<${reg.sfdcAccountUrl}|SFDC Account>`);
      if (reg.sharedChannelUrl)
        parts.push(`<${reg.sharedChannelUrl}|Shared Channel>`);
      return parts.join(" | ");
    }
  );

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

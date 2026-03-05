// Canonical competitor list — feed URLs and metadata.
// Which resources to track per competitor is stored in Supabase `tracked_resources`.

export type Competitor = {
  name: string;
  feedUrl: string;
  statusPageUrl: string;
};

export const competitors: Competitor[] = [
  {
    name: "E2B",
    feedUrl: "https://status.e2b.dev/index.json",
    statusPageUrl: "https://status.e2b.dev",
  },
  {
    name: "Daytona",
    feedUrl: "https://status.app.daytona.io/index.json",
    statusPageUrl: "https://status.app.daytona.io",
  },
  {
    name: "Modal",
    feedUrl: "https://status.modal.com/index.json",
    statusPageUrl: "https://status.modal.com",
  },
];

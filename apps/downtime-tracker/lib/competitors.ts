// NOTE: The canonical competitor list used by the cron is in convex/statusCheck.ts
// This file is kept for the type export and as a reference.

export type Competitor = {
  name: string;
  feedUrl: string;
  resourceId: string;
  resourceName: string;
  statusPageUrl: string;
};

export const competitors: Competitor[] = [
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

// Mocked web search tool

import type { SearchResult } from "../types";

export async function webSearch(args: {
  query: string;
}): Promise<SearchResult[]> {
  "use step";

  // Mock search results - in production would use real search API
  // (Google Custom Search, Bing Search API, etc.)
  return [
    {
      title: "Talk: Next.js Performance Optimization",
      url: "https://example.com/jsconf-2023-nextjs-talk",
      snippet:
        "Speaker at JSConf 2023, discussing advanced Next.js optimization techniques...",
    },
    {
      title: "Open-source Project: data-utils",
      url: "https://github.com/mock/data-utils",
      snippet:
        "TypeScript utilities for ETL pipelines with 150+ stars. Active maintainer.",
    },
    {
      title: "Conference Presentation: Real-time Features in React",
      url: "https://example.com/reactconf-2022",
      snippet:
        "Presented at ReactConf 2022 on building real-time collaboration features...",
    },
  ];
}


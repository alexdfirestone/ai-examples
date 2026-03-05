import { NextResponse } from "next/server";
import { competitors } from "@/lib/competitors";

type StatusPageResource = {
  type: "status_page_resource";
  id: string;
  attributes: { public_name: string; status: string };
};

type FeedResponse = {
  data: unknown;
  included?: Array<{ type: string; id: string; attributes: Record<string, unknown> }>;
};

export type DiscoveredResource = {
  id: string;
  name: string;
  status: string;
};

export type CompetitorResources = {
  competitorName: string;
  statusPageUrl: string;
  resources: DiscoveredResource[];
};

export async function GET() {
  const results: CompetitorResources[] = await Promise.all(
    competitors.map(async (competitor) => {
      try {
        const res = await fetch(competitor.feedUrl, {
          signal: AbortSignal.timeout(10_000),
          next: { revalidate: 0 },
        });

        if (!res.ok) {
          console.error(
            `Failed to fetch ${competitor.name} feed: ${res.status}`
          );
          return {
            competitorName: competitor.name,
            statusPageUrl: competitor.statusPageUrl,
            resources: [],
          };
        }

        const data: FeedResponse = await res.json();
        const resources = (data.included ?? [])
          .filter(
            (item): item is StatusPageResource =>
              item.type === "status_page_resource"
          )
          .map((item) => ({
            id: item.id,
            name: item.attributes.public_name,
            status: item.attributes.status,
          }));

        return {
          competitorName: competitor.name,
          statusPageUrl: competitor.statusPageUrl,
          resources,
        };
      } catch (error) {
        console.error(`Error fetching ${competitor.name} feed:`, error);
        return {
          competitorName: competitor.name,
          statusPageUrl: competitor.statusPageUrl,
          resources: [],
        };
      }
    })
  );

  return NextResponse.json(results);
}

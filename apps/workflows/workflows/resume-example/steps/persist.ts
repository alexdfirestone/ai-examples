// Mock database persistence

import type { EnrichedProfile, Snippets } from "../types";

export async function persistProfile(args: {
  enriched: EnrichedProfile;
  snippets: Snippets;
  approved: boolean;
  candidateId: string;
}): Promise<void> {
  "use step";

  // Mock database write
  await mockDbWrite({
    key: `candidate:${args.candidateId}`,
    value: {
      ...args,
      ts: Date.now(),
    },
  });
}

async function mockDbWrite(record: {
  key: string;
  value: any;
}): Promise<void> {
  console.log(`[mock-db] upsert ${record.key}`);
  // In production: await db.put(record.key, record.value);
}


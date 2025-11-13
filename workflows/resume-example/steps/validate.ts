// Input validation step

import type { CandidateInput } from "../types";

export async function validateInput(
  input: CandidateInput
): Promise<CandidateInput> {
  "use step";

  if (!input.candidateId) {
    throw new Error("candidateId is required");
  }

  // When using mocks, we don't need actual data sources
  const useMocks = process.env.MOCK_SOURCES !== "false";
  
  // Only require data sources if not using mocks
  if (!useMocks && !input.uploadUrl && !input.linkedInUrl && !input.githubUrl) {
    throw new Error(
      "At least one data source is required (uploadUrl, linkedInUrl, or githubUrl)"
    );
  }

  return input;
}


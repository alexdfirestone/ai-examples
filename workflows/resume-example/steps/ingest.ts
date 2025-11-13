// Data ingestion step with mocked external fetches

import type { CandidateInput, RawSources } from "../types";
import {
  mockResumeText,
  mockLinkedInHtml,
  mockGithubReadme,
} from "../utils/mocks";

export async function ingestSources(
  input: CandidateInput
): Promise<RawSources> {
  "use step";

  const useMocks = process.env.MOCK_SOURCES !== "false";

  if (useMocks) {
    // Return mock data for POC - always return mock data regardless of URLs
    return {
      resumeText: mockResumeText(),
      linkedInHtml: mockLinkedInHtml(),
      githubReadme: mockGithubReadme(),
    };
  }

  // Real fetches would go here
  const resumeText = input.uploadUrl
    ? await ocrFromUpload(input.uploadUrl)
    : undefined;
  const linkedInHtml = input.linkedInUrl
    ? await httpGet(input.linkedInUrl)
    : undefined;
  const githubReadme = input.githubUrl
    ? await fetchGithubReadme(input.githubUrl)
    : undefined;

  return { resumeText, linkedInHtml, githubReadme };
}

// Placeholder functions for real implementations
async function ocrFromUpload(url: string): Promise<string> {
  // Would use OCR service like AWS Textract, Google Vision, etc.
  return `OCR TEXT for ${url}`;
}

async function httpGet(url: string): Promise<string> {
  // Would fetch actual HTML
  return `<html><body>Fetched ${url}</body></html>`;
}

async function fetchGithubReadme(url: string): Promise<string> {
  // Would use GitHub API
  return `# README for ${url}`;
}


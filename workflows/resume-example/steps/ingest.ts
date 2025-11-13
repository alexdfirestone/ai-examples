// Data ingestion step with mocked external fetches

import type { CandidateInput, RawSources, ToolCall } from "../types";
import {
  mockResumeText,
  mockLinkedInHtml,
  mockGithubReadme,
} from "../utils/mocks";
import { writeStreamUpdate } from "./stream-writer";

export async function ingestSources(
  input: CandidateInput,
  writable?: WritableStream
): Promise<RawSources> {
  "use step";

  const toolCalls: ToolCall[] = [];
  const useMocks = process.env.MOCK_SOURCES !== "false";

  if (useMocks) {
    // Track mock data sources
    if (input.uploadUrl || true) {
      const tool1 = {
        name: "fetchResume",
        description: "Fetch resume from upload (mocked)",
        timestamp: Date.now(),
      };
      toolCalls.push(tool1);
      if (writable) {
        await writeStreamUpdate(writable, {
          step: "ingest",
          status: "tool-call",
          data: { toolCalls },
          timestamp: Date.now(),
        });
      }
    }

    if (input.linkedInUrl || true) {
      const tool2 = {
        name: "fetchLinkedIn",
        description: "Scrape LinkedIn profile (mocked)",
        timestamp: Date.now(),
      };
      toolCalls.push(tool2);
      if (writable) {
        await writeStreamUpdate(writable, {
          step: "ingest",
          status: "tool-call",
          data: { toolCalls },
          timestamp: Date.now(),
        });
      }
    }

    if (input.githubUrl || true) {
      const tool3 = {
        name: "fetchGitHub",
        description: "Fetch GitHub profile README (mocked)",
        timestamp: Date.now(),
      };
      toolCalls.push(tool3);
      if (writable) {
        await writeStreamUpdate(writable, {
          step: "ingest",
          status: "tool-call",
          data: { toolCalls },
          timestamp: Date.now(),
        });
      }
    }

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


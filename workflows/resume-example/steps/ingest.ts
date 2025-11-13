// Data ingestion step with mocked external fetches

import type { CandidateInput, RawSources, ToolCall } from "../types";
import {
  mockResumeText,
  mockLinkedInHtml,
  mockGithubReadme,
} from "../utils/mocks";
import { writeStreamUpdate } from "./stream-writer";
import { generateText, tool, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Define tools for LLM to call
const tools = {
  fetchResume: tool({
    description: 'Fetch and extract text from a candidate resume PDF or document upload',
    inputSchema: z.object({
      uploadUrl: z.string().describe('The URL of the uploaded resume file'),
      candidateId: z.string().describe('The candidate identifier'),
    }),
    execute: async function ({ uploadUrl, candidateId }: { uploadUrl: string; candidateId: string }) {
      // Return mock data for now
      return {
        success: true,
        text: mockResumeText(),
        source: 'resume',
        uploadUrl,
        candidateId,
      };
    },
  }),

  fetchLinkedIn: tool({
    description: 'Scrape and extract data from a candidate LinkedIn profile',
    inputSchema: z.object({
      linkedInUrl: z.string().describe('The LinkedIn profile URL'),
      candidateId: z.string().describe('The candidate identifier'),
    }),
    execute: async function ({ linkedInUrl, candidateId }: { linkedInUrl: string; candidateId: string }) {
      return {
        success: true,
        html: mockLinkedInHtml(),
        source: 'linkedin',
        linkedInUrl,
        candidateId,
      };
    },
  }),

  fetchGitHub: tool({
    description: 'Fetch README and profile data from a candidate GitHub account',
    inputSchema: z.object({
      githubUrl: z.string().describe('The GitHub profile or username URL'),
      candidateId: z.string().describe('The candidate identifier'),
    }),
    execute: async function ({ githubUrl, candidateId }: { githubUrl: string; candidateId: string }) {
      return {
        success: true,
        readme: mockGithubReadme(),
        source: 'github',
        githubUrl,
        candidateId,
      };
    },
  }),
};

// Build the prompt to instruct LLM to call all three tools
function buildIngestionPrompt(input: CandidateInput): string {
  const urls = [];
  if (input.uploadUrl) urls.push(`Resume: ${input.uploadUrl}`);
  if (input.linkedInUrl) urls.push(`LinkedIn: ${input.linkedInUrl}`);
  if (input.githubUrl) urls.push(`GitHub: ${input.githubUrl}`);

  return `You are a data ingestion agent for a candidate review system. Your job is to fetch ALL available data sources for candidate ${input.candidateId}.

You MUST call the following tools to gather complete candidate information:
1. fetchResume - to get the resume text${input.uploadUrl ? ` from: ${input.uploadUrl}` : ' (use a placeholder URL if not provided)'}
2. fetchLinkedIn - to get LinkedIn profile data${input.linkedInUrl ? ` from: ${input.linkedInUrl}` : ' (use a placeholder URL if not provided)'}
3. fetchGitHub - to get GitHub profile data${input.githubUrl ? ` from: ${input.githubUrl}` : ' (use a placeholder URL if not provided)'}

Available sources:
${urls.length > 0 ? urls.join('\n') : 'No specific URLs provided - use placeholder URLs'}

Call all three tools to gather complete candidate data. Pass the candidateId "${input.candidateId}" to each tool.`;
}

export async function ingestSources(
  input: CandidateInput,
  writable?: WritableStream
): Promise<RawSources> {
  "use step";

  const useMocks = process.env.MOCK_SOURCES !== "false";

  if (!useMocks) {
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

  // LLM-based tool calling approach - call each tool explicitly
  const allToolResults = [];
  const allToolCalls: ToolCall[] = [];

  // Helper function to call a specific tool and collect results
  const callTool = async (toolName: 'fetchResume' | 'fetchLinkedIn' | 'fetchGitHub') => {
    const result = await generateText({
      model: 'openai/gpt-5-nano',
      tools,
      toolChoice: { type: 'tool', toolName }, // Force this specific tool
      prompt: buildIngestionPrompt(input),

      // Stream tool calls as they happen, but send accumulated array
      onStepFinish: async (step) => {
        console.log(`[ingest] onStepFinish for ${toolName}:`, {
          hasToolCalls: !!step.toolCalls,
          toolCallCount: step.toolCalls?.length || 0,
        });
        
        if (step.toolCalls && step.toolCalls.length > 0) {
          const formattedCalls: ToolCall[] = step.toolCalls.map((tc) => ({
            name: tc.toolName,
            description: `Called ${tc.toolName}`,
            timestamp: Date.now(),
          }));
          
          // Accumulate tool calls
          allToolCalls.push(...formattedCalls);
          
          // Send the accumulated array (so UI shows all tool calls so far)
          if (writable) {
            console.log(`[ingest] Streaming ${allToolCalls.length} total tool call(s) to UI`);
            await writeStreamUpdate(writable, {
              step: "ingest",
              status: "tool-call",
              data: { toolCalls: allToolCalls }, // Send ALL accumulated calls
              timestamp: Date.now(),
            });
          }
        }
      },
    });

    // Extract tool results from this call
    const toolResults = result.steps.flatMap(step => step.toolResults || []);
    return toolResults;
  };

  // Call all three tools
  console.log('[ingest] Calling fetchResume...');
  const resumeResults = await callTool('fetchResume');
  allToolResults.push(...resumeResults);

  console.log('[ingest] Calling fetchLinkedIn...');
  const linkedInResults = await callTool('fetchLinkedIn');
  allToolResults.push(...linkedInResults);

  console.log('[ingest] Calling fetchGitHub...');
  const githubResults = await callTool('fetchGitHub');
  allToolResults.push(...githubResults);

  console.log('[ingest] allToolResults:', JSON.stringify(allToolResults, null, 2));
  
  const resumeResult = allToolResults.find(
    (tr) => tr.toolName === "fetchResume"
  );

  const linkedInResult = allToolResults.find(
    (tr) => tr.toolName === "fetchLinkedIn"
  );

  const githubResult = allToolResults.find(
    (tr) => tr.toolName === "fetchGitHub"
  );

  console.log('[ingest] resumeResult:', resumeResult);
  console.log('[ingest] linkedInResult:', linkedInResult);
  console.log('[ingest] githubResult:', githubResult);

  // Tool results contain the execute function return value in the 'output' property
  const resumeData = resumeResult as any;
  const linkedInData = linkedInResult as any;
  const githubData = githubResult as any;

  return {
    resumeText: resumeData?.output?.text,
    linkedInHtml: linkedInData?.output?.html,
    githubReadme: githubData?.output?.readme,
  };
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


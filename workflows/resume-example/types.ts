// Shared TypeScript types for resume review workflow

export type CandidateInput = {
  candidateId: string;
  uploadUrl?: string; // PDF/Doc resume upload
  linkedInUrl?: string;
  githubUrl?: string;
  jobContext?: { role: string; seniority?: string; skills?: string[] };
};

export type RawSources = {
  resumeText?: string;
  linkedInHtml?: string;
  githubReadme?: string;
};

export type ExtractedData = {
  text: string;
  tokens: number;
};

export type CanonicalProfile = {
  name?: string;
  headline?: string;
  location?: string;
  emails?: string[];
  urls?: string[];
  skills?: string[];
  experience?: Array<{
    company: string;
    title: string;
    dates?: string;
    bullets?: string[];
  }>;
  education?: Array<{
    school: string;
    degree?: string;
    dates?: string;
  }>;
};

export type EnrichedProfile = {
  canonical: CanonicalProfile;
  gaps: string[]; // missing info the agent identifies
  riskFlags: string[]; // e.g., job hopping, unexplained gaps
  overallScore: number; // 0-100
  rationale: string; // model's high-level reasoning (keep concise)
};

export type Snippets = {
  headline: string;
  bio: string;
  highlights: string[];
};

export type ApprovalResult = {
  approved: boolean;
  reason?: string;
};

export type WorkflowResult = {
  status: "completed" | "failed";
  candidateId: string;
  approved: boolean;
  enriched?: EnrichedProfile;
  snippets?: Snippets;
};

export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
};

export type ScoringResult = {
  score: number;
  rationale: string;
  riskFlags: string[];
};


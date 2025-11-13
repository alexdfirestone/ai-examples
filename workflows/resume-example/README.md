# Resume Review Workflow Example

A complete AI-powered resume review system built with Vercel Workflows and the AI SDK.

## Structure

```
workflows/resume-example/
├── index.ts                 # Main workflow orchestrator
├── types.ts                 # TypeScript type definitions
├── steps/                   # Workflow steps
│   ├── validate.ts         # Input validation
│   ├── ingest.ts           # Data ingestion (mocked)
│   ├── extract.ts          # Text extraction & normalization
│   ├── agent-enrich.ts     # AI profile enrichment with tools
│   ├── generate-snippets.ts # Generate recruiter snippets
│   ├── human-approval.ts   # Webhook-based approval
│   ├── persist.ts          # Database persistence (mocked)
│   └── notify.ts           # Team notifications (mocked)
├── tools/                   # Agent tools
│   ├── web-search.ts       # Web search (mocked)
│   ├── schema-check.ts     # Profile validation
│   └── score-rubric.ts     # Candidate scoring
└── utils/                   # Utilities
    ├── llm.ts              # AI SDK integration
    └── mocks.ts            # Mock data generators
```

## Features

- **Vercel Workflows**: Uses `"use workflow"` and `"use step"` directives for durable execution
- **AI SDK Integration**: Real `generateObject` calls with OpenAI for profile extraction
- **Mocked Tools**: Web search, schema validation, and scoring with proper step directives
- **Real-time Progress**: Step-by-step UI updates showing workflow progress
- **Human-in-the-loop**: Webhook-based approval with timeout fallback

## Environment Variables

```bash
# Required for real AI calls
OPENAI_API_KEY=your_key_here

# Optional: Use mocked data (defaults to true)
MOCK_LLM=true           # Use mock LLM responses
MOCK_SOURCES=true       # Use mock data sources
MOCK_NOTIFICATIONS=true # Use mock notifications
```

## Frontend

Navigate to `/resume-review` to access the UI:

- Upload resume or provide LinkedIn/GitHub URLs
- "Auto-fill with Mock Data" button for quick testing
- Real-time workflow progress tracking
- Detailed results with candidate profile, score, and insights

## API Endpoint

`POST /api/resume-review`

**Request:**
```json
{
  "candidateId": "candidate-123",
  "uploadUrl": "https://example.com/resume.pdf",
  "linkedInUrl": "https://linkedin.com/in/user",
  "githubUrl": "https://github.com/user",
  "jobContext": {
    "role": "Senior Full-Stack Engineer",
    "seniority": "Senior",
    "skills": ["TypeScript", "React", "Node.js"]
  }
}
```

**Response:**
```json
{
  "status": "completed",
  "candidateId": "candidate-123",
  "approved": true,
  "enriched": {
    "canonical": { /* profile data */ },
    "gaps": ["email"],
    "riskFlags": [],
    "overallScore": 85,
    "rationale": "Matched 5/5 target skills..."
  },
  "snippets": {
    "headline": "Senior Full-Stack Engineer • 8 key skills • Score 85/100",
    "bio": "Impact-focused Senior Full-Stack Engineer...",
    "highlights": ["• Senior Engineer @ Acme", "• Engineer @ Globex"]
  }
}
```

## Workflow Steps

1. **Validate Input** - Ensures required fields are present
2. **Ingest Sources** - Fetches resume, LinkedIn, and GitHub data (mocked)
3. **Extract & Normalize** - Combines and cleans text from all sources
4. **Agent Enrichment** - AI extracts structured profile using tools:
   - `webSearch` - Finds additional candidate information
   - `schemaCheck` - Validates profile structure
   - `scoreWithRubric` - Scores against job requirements
5. **Generate Snippets** - Creates recruiter-facing summaries
6. **Human Approval** - Webhook with 2-hour timeout (auto-approve)
7. **Persist Profile** - Saves to database (mocked)
8. **Notify Teams** - Sends notifications (mocked)

## Usage

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Visit the resume review page
open http://localhost:3000/resume-review
```

## Testing

1. Click "Auto-fill with Mock Data" to populate the form
2. Click "Start Review" to trigger the workflow
3. Watch real-time progress updates
4. View the enriched candidate profile and score

## Notes

- Mock mode is enabled by default for easy testing
- Set `MOCK_LLM=false` to use real OpenAI API calls
- The workflow includes error handling and retry logic via Vercel Workflows
- Human approval step uses webhooks for async approval flow


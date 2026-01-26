# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Examples is a Next.js repository showcasing various capabilities of the Vercel AI SDK. It contains multiple isolated examples demonstrating different AI patterns including chat interfaces, workflows, sandbox execution, and AI Gateway integration.

## Development Commands

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
next build

# Start production server
pnpm start

# Lint code
pnpm lint
```

## Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Required for Gemini AI models
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_key_here

# Required for Blob storage (automatically provided on Vercel)
BLOB_READ_WRITE_TOKEN=your_blob_token_here

# Required for OpenAI models
OPENAI_API_KEY=your_openai_key_here

# Optional: Workflow configuration
MOCK_LLM=true           # Use mock LLM responses
MOCK_SOURCES=true       # Use mock data sources
MOCK_NOTIFICATIONS=true # Use mock notifications

# Optional: Langfuse for observability
LANGFUSE_SECRET_KEY=your_key
LANGFUSE_PUBLIC_KEY=your_key
LANGFUSE_HOST=https://cloud.langfuse.com
```

## Architecture

### Core Structure

```
app/
├── api/                    # Next.js API routes
│   ├── chat/              # Basic chat with tools and streaming
│   ├── sandbox-chat/      # Todo recitation pattern with @vercel/sandbox
│   ├── schedule-planner/  # Schedule planning with sandbox integration
│   ├── workflows/         # Vercel Workflows endpoint
│   ├── gateway/           # AI Gateway dynamic model loading
│   ├── analyze/           # Video/audio AI analysis
│   └── upload/            # Blob storage upload
├── basic-chat/            # Simple chat UI
├── sandbox-chat/          # Todo recitation demo UI
├── planner/               # Schedule planner UI
├── gateway-playground/    # AI Gateway playground UI
└── workflows/             # Workflow demo UI

workflows/
├── resume-example/        # Complete workflow implementation
│   ├── index.ts          # Workflow orchestrator with "use workflow"
│   ├── steps/            # Individual workflow steps with "use step"
│   ├── tools/            # AI agent tools (web search, scoring, validation)
│   └── utils/            # LLM integration and mocks

components/                # Shared UI components (shadcn/ui)
lib/                       # Utility functions
```

### Key Patterns

#### AI SDK Streaming with Tools

The chat endpoints (`app/api/chat/route.ts`) demonstrate:
- Using `streamText()` with tools and `convertToModelMessages()`
- Tool calling with multi-step agentic behavior
- Streaming responses with `toUIMessageStreamResponse()`
- Model selection via request parameter (defaults to `claude-sonnet-4.5`)
- Integration with Langfuse for observability via `@langfuse/tracing`

#### Vercel Workflows

The workflows pattern (`workflows/resume-example/`) shows:
- `"use workflow"` directive for durable function execution
- `"use step"` directive for individual resumable steps
- Real-time progress updates via `getWritable()` stream
- Human-in-the-loop approval with `createWebhook()` and timeouts
- Tool calling within workflow steps using AI SDK `generateObject()`
- Error handling and retry logic built into workflow primitives

#### Sandbox Execution

The sandbox endpoints (`app/api/sandbox-chat/`, `app/api/schedule-planner/`) demonstrate:
- Using `@vercel/sandbox` for secure code execution
- File system operations in isolated environment
- Todo recitation pattern: agent creates `todo.md`, executes tasks, marks complete, reads file again (recitation) to stay focused
- Sandbox instance reuse with TTL for performance
- Dynamic sandbox initialization with directories

#### AI Gateway Integration

Gateway examples (`app/api/gateway/`, `app/gateway-playground/`) show:
- Dynamic model loading from AI Gateway endpoints
- Using `@ai-sdk/gateway` for provider-agnostic model access
- Runtime model switching in chat interfaces

#### Observability with Langfuse

The repository uses Langfuse for tracing AI calls:
- `instrumentation.ts` sets up global OpenTelemetry tracing
- `@langfuse/tracing` decorators (`observe()`, `updateActiveObservation()`)
- Manual span ending for streaming responses
- `after()` hook to flush traces before serverless termination
- Filtering out Next.js infrastructure spans

### Important Implementation Details

**Streaming Response Handling**: When using `streamText()` with Langfuse tracing, manually end spans in `onFinish` callback and use `endOnExit: false` in the `observe()` decorator to prevent premature trace completion.

**Serverless Trace Flushing**: Always use `after(async () => await langfuseSpanProcessor.forceFlush())` to ensure traces are sent before serverless functions terminate.

**Sandbox TTL**: Sandbox instances are cached for 5 minutes to improve performance. Reset logic clears the instance when starting new conversations.

**Todo Recitation Pattern**: The sandbox-chat implementation uses a todo.md file to track multi-step tasks. The agent creates the file, executes each task, marks it complete, then reads the file again (recitation). This pattern keeps goals in recent context and prevents drift.

**Model Provider Format**: Models are referenced as `provider/model-name` (e.g., `anthropic/claude-sonnet-4.5`, `openai/gpt-5-mini`).

**Workflow Directives**: Functions with `"use workflow"` and `"use step"` are compiled specially by Vercel and support durable execution with automatic retries and state persistence.

## Testing Workflows

Use the workflows UI at `/workflows`:
1. Click "Auto-fill with Mock Data" for quick testing
2. Start the workflow and watch real-time progress
3. Human approval steps auto-approve after timeout
4. View enriched results with scoring and snippets

## Key Dependencies

- `ai` & `@ai-sdk/*`: Vercel AI SDK for LLM interactions
- `workflow` & `@workflow/ai`: Vercel Workflows for durable execution
- `@vercel/sandbox`: Isolated code execution environment
- `@langfuse/tracing`: Observability and tracing
- `@vercel/blob`: File upload and storage
- `next`: Next.js 16 with App Router
- `zod`: Schema validation

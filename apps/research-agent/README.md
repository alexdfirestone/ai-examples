# Research Agent - Durable AI Workflow Demo

A complete example of a durable AI agent built with Vercel Workflow DevKit, AI SDK, and Next.js. This demo showcases:

- **Durable execution** with automatic retries and resumption
- **Streaming progress** from tools to the UI in real-time
- **Human-in-the-loop** approval using webhooks
- **Resumable streams** that reconnect after page refresh or network drops
- **Clean, simple code** that's easy to understand and extend

## Use Case

The Research Agent helps you create comprehensive research reports:

1. User enters a research topic
2. Agent searches for information (with streaming progress)
3. Agent generates a structured outline
4. **Human approval required** - workflow pauses with no compute cost
5. After approval, agent generates each section (streaming progress)
6. Agent compiles the final report

## Key Files

```
workflows/research/
├── workflow.ts    # Main workflow with DurableAgent ("use workflow")
├── tools.ts       # All tools with "use step" for durability
└── types.ts       # Data part types for streaming

app/api/chat/
├── route.ts              # Starts workflow, returns run.readable
├── [id]/stream/route.ts  # Reconnection endpoint for resumption
└── approve/route.ts      # Webhook endpoint for human approval

app/research-agent/
├── page.tsx                        # UI with useChat & WorkflowChatTransport
└── components/DataPartRenderer.tsx # Renders streaming data parts
```

## How It Works

### 1. Workflow with DurableAgent

```typescript
export async function researchWorkflow(messages: ModelMessage[]) {
  "use workflow"; // Makes execution durable

  const writable = getWritable();
  const agent = new DurableAgent({ model, system, tools });

  await agent.stream({ messages, writable });

  // Create webhook for human approval (workflow level only)
  const webhook = createWebhook();
  await webhook; // Pauses here with no compute
}
```

### 2. Tools with Streaming

```typescript
export async function researchTopic(input, { toolCallId }) {
  "use step"; // Automatic retries and observability

  const writer = getWritable().getWriter();

  // Stream progress to UI
  await writer.write({
    type: "data-research-progress",
    id: toolCallId,
    data: { status: "searching" }
  });

  // Do work...

  writer.releaseLock();
  return result;
}
```

### 3. API Routes

```typescript
// Start workflow
export async function POST(req: Request) {
  const run = await start(researchWorkflow, [messages]);
  return createUIMessageStreamResponse({
    stream: run.readable, // Always return run.readable
    headers: { "x-workflow-run-id": run.runId }
  });
}

// Reconnection for resumption
export async function GET(req, { params }) {
  const run = getRun(params.id);
  return createUIMessageStreamResponse({
    stream: run.getReadable({ startIndex })
  });
}
```

### 4. UI with Resumption

```typescript
useChat({
  api: "/api/chat",
  resume: true,
  transport: new WorkflowChatTransport({
    api: "/api/chat",
    prepareReconnectToStreamRequest: ({ api }) => ({
      api: `/api/chat/${runId}/stream`
    }),
    onChatSendMessage: (r) =>
      localStorage.setItem("runId", r.headers.get("x-workflow-run-id")),
    onChatEnd: () => localStorage.removeItem("runId")
  })
});
```

## Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set environment variable:**
   Create `.env.local`:
   ```bash
   ANTHROPIC_API_KEY=your_key_here
   ```

3. **Run development server:**
   ```bash
   pnpm dev
   ```

4. **Open browser:**
   Navigate to http://localhost:3007

## Testing Resumption

1. Start a research request
2. Refresh the page while it's running
3. The workflow automatically reconnects and continues from where it left off

## Key Concepts

### "use workflow" vs "use step"

| Feature | "use workflow" | "use step" |
|---------|----------------|------------|
| Retries | ❌ | ✅ |
| getWritable | ✅ | ✅ |
| sleep | ✅ | ❌ |
| createWebhook | ✅ | ❌ |

### Data Parts

All streaming progress uses data parts with `type: "data-*"`:

```typescript
{
  type: "data-research-progress",
  id: toolCallId,
  data: { status: "searching", query: "AI" }
}
```

The UI receives these via `message.parts` and renders them with custom components.

### Human-in-the-Loop

Webhooks pause workflow execution with **zero compute cost**:

```typescript
const webhook = createWebhook();
// Workflow pauses here
const request = await webhook;
const data = await request.json();
// Workflow continues
```

## Observability

View workflow execution details:

```bash
npx workflow web
```

This shows:
- All workflow runs
- Individual steps with timing
- Retries and errors
- Streamed data parts

## Learn More

- [Workflow DevKit Docs](https://vercel.com/docs/workflow)
- [AI SDK Docs](https://sdk.vercel.ai)
- [Durable Agent Patterns](https://vercel.com/docs/workflow/ai-agent)

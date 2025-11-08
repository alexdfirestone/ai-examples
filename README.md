# AI Examples

A collection of isolated AI examples demonstrating various capabilities of the Vercel AI SDK.

## Examples

### Video AI Summary

Upload video or audio files and get an AI-generated TL;DR using the Vercel AI SDK with Gemini 2.0 Flash.

**Features:**
- Direct video/audio file upload to Vercel Blob
- AI analysis using Gemini 2.0 Flash via the Vercel AI SDK
- Minimal, customer-facing UI
- Demonstrates AI SDK's file input capabilities

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun
- A Google AI API key (for Gemini)
- A Vercel account (for Blob storage)

### Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Required for Gemini AI models
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_key_here

# Required for Blob storage (automatically provided on Vercel)
BLOB_READ_WRITE_TOKEN=your_blob_token_here
```

**Get your API keys:**
- Google AI: [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
- Vercel Blob: [https://vercel.com/docs/storage/vercel-blob](https://vercel.com/docs/storage/vercel-blob)

### Installation

```bash
npm install
# or
pnpm install
```

### Run Development Server

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## How It Works

### Video Summary Flow

1. **Upload**: User selects a video/audio file
2. **Blob Storage**: File is uploaded to Vercel Blob via client upload
3. **AI Analysis**: Server fetches the file and sends it to Gemini 2.0 Flash using the AI SDK's file input
4. **Summary**: AI generates and returns a TL;DR

### Code Structure

```
app/
├── api/
│   ├── upload/route.ts       # Blob upload token handler
│   └── analyze/route.ts      # AI video analysis endpoint
└── page.tsx                  # Main UI component
```

## AI SDK Media Support

The Vercel AI SDK supports different media types depending on the model:

- **Images**: Fully supported across most providers (OpenAI, Anthropic, Google)
- **Video/Audio**: Supported by Gemini 2.0 Flash and other Google models
- **File Input**: Pass files as `{ type: 'file', data: Uint8Array, mimeType: string }`

### Example: Sending a file to AI

```typescript
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

const result = await generateText({
  model: google('gemini-2.0-flash-exp'),
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Summarize this video' },
        { type: 'file', data: videoBytes, mimeType: 'video/mp4' },
      ],
    },
  ],
});
```

## Deploy on Vercel

The easiest way to deploy this app is to use the [Vercel Platform](https://vercel.com/new).

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add your environment variables
4. Deploy!

Remember to add `GOOGLE_GENERATIVE_AI_API_KEY` in your Vercel project settings. The `BLOB_READ_WRITE_TOKEN` will be automatically provided.

## Learn More

- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Vercel Blob Documentation](https://vercel.com/docs/storage/vercel-blob)
- [Next.js Documentation](https://nextjs.org/docs)

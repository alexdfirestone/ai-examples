import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { url, mediaType, question } = (await req.json()) as {
      url: string;
      mediaType: string;
      question?: string;
    };

    if (!url || !mediaType) {
      return NextResponse.json(
        { error: 'Missing url or mediaType' },
        { status: 400 }
      );
    }

    // Fetch the video from Blob storage
    const blobResponse = await fetch(url);
    if (!blobResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch media: ${blobResponse.status}` },
        { status: 400 }
      );
    }

    const bytes = new Uint8Array(await blobResponse.arrayBuffer());

    // Send to Gemini for analysis

    const result = await generateText({
      model: "google/gemini-2.5-pro",
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                question ||
                'Please provide a short TL;DR summary of this video/audio content.',
            },
            {
              type: 'file',
              data: bytes,
              mediaType: mediaType,
            },
          ],
        },
      ],
    });

    return NextResponse.json({ text: result.text });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}


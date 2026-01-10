// AI SDK integration for LLM calls

import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { CanonicalProfile } from "../types";

// Schema for canonical profile extraction
const canonicalProfileSchema = z.object({
  name: z.string().optional(),
  headline: z.string().optional(),
  location: z.string().optional(),
  emails: z.array(z.string()).optional(),
  urls: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  experience: z
    .array(
      z.object({
        company: z.string(),
        title: z.string(),
        dates: z.string().optional(),
        bullets: z.array(z.string()).optional(),
      })
    )
    .optional(),
  education: z
    .array(
      z.object({
        school: z.string(),
        degree: z.string().optional(),
        dates: z.string().optional(),
      })
    )
    .optional(),
});

export async function extractCanonicalProfile(
  text: string
): Promise<CanonicalProfile> {
  "use step";

  const useMock = process.env.MOCK_LLM === "true";

  if (useMock) {
    // Return deterministic mock for testing
    return {
      name: "Taylor Doe",
      headline: "Senior Full-Stack Engineer",
      location: "New York, NY",
      emails: ["taylor@example.com"],
      urls: [
        "https://github.com/mock-user",
        "https://linkedin.com/in/mock-user",
      ],
      skills: [
        "TypeScript",
        "React",
        "Node.js",
        "PostgreSQL",
        "Next.js",
        "Docker",
        "AWS",
        "Redis",
      ],
      experience: [
        {
          company: "Acme Inc.",
          title: "Senior Full-Stack Engineer",
          dates: "2021–present",
          bullets: [
            "Led migration to Next.js, improving performance by 60%",
            "Built real-time collaboration features",
            "Mentored 3 junior engineers",
          ],
        },
        {
          company: "Globex Corporation",
          title: "Software Engineer",
          dates: "2018–2021",
          bullets: [
            "Built ETL pipelines processing 10M+ records daily",
            "Developed REST APIs serving 500K+ users",
          ],
        },
      ],
      education: [
        {
          school: "State University",
          degree: "BS Computer Science",
          dates: "2014–2018",
        },
      ],
    };
  }

  // Real AI SDK call
  const { object } = await generateObject({
    model: 'openai/gpt-5-mini',
    schema: canonicalProfileSchema,
    prompt: `Extract a structured candidate profile from the following resume/profile text.
    
Include:
- Name, headline, location
- Contact emails
- URLs (LinkedIn, GitHub, portfolio, etc.)
- Technical skills
- Work experience with company, title, dates, and key accomplishments
- Education with school, degree, and dates

Resume text:
${text}`,
  });

  return object;
}


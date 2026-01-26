import { z } from "zod";
import { getWritable, defineHook } from "workflow";
import type { CustomDataPart } from "./types";

// Helper for delays within step context (sleep from workflow only works at workflow level)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Define the approval hook with typed schema
export const outlineApprovalHook = defineHook({
  schema: z.object({
    approved: z.boolean(),
  }),
});

// Tool to research a topic (simulates web search with streaming progress)
export async function researchTopic(
  { topic, focusAreas }: { topic: string; focusAreas?: string[] },
  { toolCallId }: { toolCallId: string }
) {
  "use step";

    const writer = getWritable<CustomDataPart>().getWriter();

    try {
      // Stream: Starting search
      await writer.write({
        type: "data-research-progress",
        id: toolCallId,
        data: {
          query: topic,
          status: "searching",
        },
      });

      // Simulate search delay
      await delay(1500);

      // Stream: Found results
      await writer.write({
        type: "data-research-progress",
        id: toolCallId,
        data: {
          query: topic,
          status: "found",
          resultCount: 5,
        },
      });

      await delay(1000);

      // Simulate research findings (in real app, this would be actual web search)
      const findings = {
        summary: `Research on "${topic}" reveals significant insights.`,
        keyPoints: [
          `Current trends in ${topic} show rapid evolution`,
          `Industry experts emphasize the importance of ${focusAreas?.[0] || "innovation"}`,
          `Recent studies indicate growing adoption and impact`,
        ],
        sources: [
          "Academic Journal on Technology (2024)",
          "Industry Report Q4 2024",
          "Expert Analysis",
        ],
      };

      // Stream: Complete
      await writer.write({
        type: "data-research-progress",
        id: toolCallId,
        data: {
          query: topic,
          status: "complete",
          resultCount: 5,
        },
      });

    return findings;
  } finally {
    writer.releaseLock();
  }
}

// Tool to generate an outline based on research
export async function generateOutline(
  { topic, researchFindings }: { topic: string; researchFindings: string },
  { toolCallId }: { toolCallId: string }
) {
  "use step";

    const writer = getWritable<CustomDataPart>().getWriter();

    try {
      await delay(1000);

      const outline = {
        title: `Comprehensive Report: ${topic}`,
        sections: [
          {
            title: "Introduction",
            description: `Overview of ${topic} and its significance`,
          },
          {
            title: "Current Landscape",
            description: "Analysis of the current state and trends",
          },
          {
            title: "Key Insights",
            description: "Deep dive into findings from research",
          },
          {
            title: "Implications",
            description: "Practical implications and recommendations",
          },
          {
            title: "Conclusion",
            description: "Summary and future outlook",
          },
        ],
      };

      // Stream the outline to UI
      await writer.write({
        type: "data-outline",
        id: toolCallId,
        data: {
          sections: outline.sections,
        },
      });

    return outline;
  } finally {
    writer.releaseLock();
  }
}

// Tool to generate a section of the report
export async function generateSection(
  {
    sectionTitle,
    sectionDescription,
    topic,
    researchContext,
  }: {
    sectionTitle: string;
    sectionDescription: string;
    topic: string;
    researchContext: string;
  },
  { toolCallId }: { toolCallId: string }
) {
  "use step";

    const writer = getWritable<CustomDataPart>().getWriter();

    try {
      // Stream: Starting to write
      await writer.write({
        type: "data-section-progress",
        id: toolCallId,
        data: {
          sectionTitle,
          status: "writing",
        },
      });

      await delay(1500);

      // Generate section content (in real app, use LLM here)
      const content = `
## ${sectionTitle}

${sectionDescription}

In the context of ${topic}, this section explores ${sectionDescription.toLowerCase()}. Based on our research, several key factors emerge:

1. **Primary Finding**: The landscape of ${topic} continues to evolve rapidly, with new developments emerging regularly.

2. **Critical Analysis**: ${researchContext}

3. **Evidence-Based Insights**: Our research indicates that ${topic} has far-reaching implications across multiple domains.

The data suggests that stakeholders should pay close attention to these trends and adapt their strategies accordingly.
      `.trim();

      // Stream: Complete
      await writer.write({
        type: "data-section-progress",
        id: toolCallId,
        data: {
          sectionTitle,
          status: "complete",
          content,
        },
      });

    return { sectionTitle, content };
  } finally {
    writer.releaseLock();
  }
}

// Tool that requests approval - uses hook to pause workflow
// Note: No "use step" here - hooks are workflow-level primitives
async function executeRequestOutlineApproval(
  {
    outlineTitle,
    sectionCount,
  }: {
    outlineTitle: string;
    sectionCount: number;
  },
  { toolCallId }: { toolCallId: string }
) {
  // Use the toolCallId as the hook token so the UI can reference it
  const hook = outlineApprovalHook.create({ token: toolCallId });

  // Workflow pauses here until the hook is resolved
  const { approved } = await hook;

  if (!approved) {
    return {
      approved: false,
      message: "Outline was rejected. Please provide feedback on what you'd like changed.",
    };
  }

  return {
    approved: true,
    message: `Outline "${outlineTitle}" with ${sectionCount} sections has been approved. Proceed with generating all sections.`,
  };
}

// Tool to finalize the complete report
export async function finalizeReport(
  {
    title,
    sections,
  }: {
    title: string;
    sections: Array<{ sectionTitle: string; content: string }>;
  },
  { toolCallId }: { toolCallId: string }
) {
  "use step";

    const writer = getWritable<CustomDataPart>().getWriter();

    try {
      await delay(800);

      const fullReport = `
# ${title}

*Generated by Research Agent*
*Date: ${new Date().toLocaleDateString()}*

---

${sections.map((s) => s.content).join("\n\n---\n\n")}

---

*End of Report*
      `.trim();

      const wordCount = fullReport.split(/\s+/).length;

      // Stream: Report complete
      await writer.write({
        type: "data-report-complete",
        id: toolCallId,
        data: {
          title,
          fullReport,
          wordCount,
        },
      });

    return { title, fullReport, wordCount };
  } finally {
    writer.releaseLock();
  }
}

// Define schemas once for reuse
const researchTopicSchema = z.object({
  topic: z.string().describe("The topic to research"),
  focusAreas: z
    .array(z.string())
    .optional()
    .describe("Specific areas to focus on"),
});

const generateOutlineSchema = z.object({
  topic: z.string().describe("The main topic"),
  researchFindings: z.string().describe("Summary of research findings"),
});

const generateSectionSchema = z.object({
  sectionTitle: z.string().describe("The section title"),
  sectionDescription: z.string().describe("What this section should cover"),
  topic: z.string().describe("The main topic"),
  researchContext: z.string().describe("Research context for this section"),
});

const finalizeReportSchema = z.object({
  title: z.string().describe("Report title"),
  sections: z
    .array(
      z.object({
        sectionTitle: z.string(),
        content: z.string(),
      })
    )
    .describe("All report sections"),
});

const requestOutlineApprovalSchema = z.object({
  outlineTitle: z.string().describe("Title of the outline being approved"),
  sectionCount: z.number().describe("Number of sections in the outline"),
});

// Export tools with both inputSchema (runtime) and parameters (TypeScript types)
export const tools = {
  researchTopic: {
    description:
      "Research a topic by searching the web for information. Returns key findings and sources.",
    inputSchema: researchTopicSchema,
    parameters: researchTopicSchema,
    execute: researchTopic,
  },
  generateOutline: {
    description:
      "Generate a structured outline for the report based on research findings.",
    inputSchema: generateOutlineSchema,
    parameters: generateOutlineSchema,
    execute: generateOutline,
  },
  requestOutlineApproval: {
    description:
      "Request human approval for the outline before proceeding. MUST be called after generateOutline and before generating any sections. The workflow will pause until the human approves or rejects.",
    inputSchema: requestOutlineApprovalSchema,
    parameters: requestOutlineApprovalSchema,
    execute: executeRequestOutlineApproval,
  },
  generateSection: {
    description:
      "Generate content for a specific section of the report. Only use after outline is approved via requestOutlineApproval.",
    inputSchema: generateSectionSchema,
    parameters: generateSectionSchema,
    execute: generateSection,
  },
  finalizeReport: {
    description:
      "Finalize the complete report by combining all sections and adding metadata.",
    inputSchema: finalizeReportSchema,
    parameters: finalizeReportSchema,
    execute: finalizeReport,
  },
};

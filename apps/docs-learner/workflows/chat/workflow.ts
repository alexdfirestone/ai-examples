import { DurableAgent } from "@workflow/ai/agent";
import { getWritable } from "workflow";
import { convertToModelMessages, type UIMessage } from "ai";
import {
  tools,
  initializeSandboxChanges,
  initializeSandboxBrowse,
  initializeSandboxFocused,
} from "./tools";
import { getSystemPrompt, type ExplanationMode, type ChatMode } from "@/lib/system-prompts";
import type { SectionChange } from "@/convex/queries";
import type { BrowseSection, FocusedChange } from "./docs-data";

interface ChatInput {
  messages: UIMessage[];
  mode: ExplanationMode;
  chatMode: ChatMode;
  // For "changes" mode
  changedSections?: SectionChange[];
  // For "browse" mode
  browseSections?: BrowseSection[];
}

// Regex to find embedded change content in user messages
const CHANGE_CONTENT_RE =
  /\n\n---CHANGE_CONTENT_START---\n([\s\S]*?)\n---CHANGE_CONTENT_END---/;

/**
 * Extract embedded change content from the last user message (if any),
 * and strip the markers so the agent sees a clean question.
 *
 * Handles both `parts`-based UIMessages (AI SDK v6) and plain `content`
 * string messages (wire format fallback).
 */
function extractFocusedChange(messages: UIMessage[]): FocusedChange | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i] as any;
    if (msg.role !== "user") continue;

    // Try parts array first (AI SDK v6 UIMessage)
    if (Array.isArray(msg.parts)) {
      for (const part of msg.parts) {
        if (part.type !== "text" || !part.text) continue;
        const match = part.text.match(CHANGE_CONTENT_RE);
        if (match) {
          try {
            const parsed = JSON.parse(match[1]) as FocusedChange;
            part.text = part.text.replace(CHANGE_CONTENT_RE, "").trim();
            return parsed;
          } catch {
            /* malformed JSON */
          }
        }
      }
    }

    // Fallback: plain content string (wire format)
    if (typeof msg.content === "string") {
      const match = msg.content.match(CHANGE_CONTENT_RE);
      if (match) {
        try {
          const parsed = JSON.parse(match[1]) as FocusedChange;
          msg.content = msg.content.replace(CHANGE_CONTENT_RE, "").trim();
          return parsed;
        } catch {
          /* malformed JSON */
        }
      }
    }

    // Fallback: content array with text parts
    if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        const text = typeof part === "string" ? part : part?.text;
        if (!text || typeof text !== "string") continue;
        const match = text.match(CHANGE_CONTENT_RE);
        if (match) {
          try {
            const parsed = JSON.parse(match[1]) as FocusedChange;
            if (typeof part === "string") {
              const idx = msg.content.indexOf(part);
              if (idx >= 0)
                msg.content[idx] = text.replace(CHANGE_CONTENT_RE, "").trim();
            } else if (part.text) {
              part.text = text.replace(CHANGE_CONTENT_RE, "").trim();
            }
            return parsed;
          } catch {
            /* malformed JSON */
          }
        }
      }
    }
  }
  return null;
}

export async function chatWorkflow(input: ChatInput) {
  "use workflow";

  const { messages, mode, chatMode, changedSections, browseSections } = input;
  const writable = getWritable();

  // Extract focused change content from user message BEFORE converting
  // to model messages — this also strips the markers from the message text.
  const focused = extractFocusedChange(messages);

  const modelMessages = await convertToModelMessages(messages);

  // ── Set pending sandbox files (module-level state) ───────────────────
  // These get picked up by the lazy sandbox creation in the bash tool.
  if (chatMode === "browse" && browseSections) {
    initializeSandboxBrowse(browseSections);
  } else if (focused) {
    initializeSandboxFocused(focused, changedSections ?? []);
  } else if (changedSections) {
    initializeSandboxChanges(changedSections);
  }

  // ── Build system prompt ──────────────────────────────────────────────
  // Always inject the focused content directly into the prompt so the
  // agent has it regardless of whether sandbox files are available.
  let system = getSystemPrompt(mode, chatMode);
  if (focused) {
    system += `\n\n${"=".repeat(60)}\nFOCUSED CHANGE CONTENT\n${"=".repeat(60)}\n`;
    system += `Title: ${focused.title}\nSource: ${focused.source}\nType: ${focused.type}\n`;
    if (focused.type === "modified" && focused.oldContent && focused.newContent) {
      system += `\n--- OLD VERSION ---\n${focused.oldContent}\n\n--- NEW VERSION ---\n${focused.newContent}\n`;
    } else if (focused.type === "added" && focused.newContent) {
      system += `\n--- NEW CONTENT ---\n${focused.newContent}\n`;
    } else if (focused.type === "removed" && focused.oldContent) {
      system += `\n--- REMOVED CONTENT ---\n${focused.oldContent}\n`;
    }
    system += `\n${"=".repeat(60)}\n`;
    system += `The content above is also written to sandbox files at docs/focused/old.md and docs/focused/new.md.\n`;
    system += `You can use "diff docs/focused/old.md docs/focused/new.md" for a line-by-line diff.\n`;
    system += `If sandbox files are not available, analyze the content provided above directly.\n`;
  }

  const agent = new DurableAgent({
    model: "anthropic/claude-sonnet-4.5",
    system,
    tools,
  });

  await agent.stream({ messages: modelMessages, writable });
}

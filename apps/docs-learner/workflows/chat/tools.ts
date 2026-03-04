import { z } from "zod";
import { Sandbox } from "@vercel/sandbox";
import type { SectionChange } from "@/convex/queries";
import {
  generateChangesSandboxFiles,
  generateBrowseSandboxFiles,
  generateFocusedSandboxFiles,
  type BrowseSection,
  type FocusedChange,
} from "./docs-data";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sandboxInstance: any = null;
let sandboxReady = false;
let pendingFiles: { path: string; content: string }[] = [];

function resetSandbox() {
  sandboxInstance = null;
  sandboxReady = false;
}

async function createFreshSandbox() {
  const sandbox = await Sandbox.create({ timeout: 5 * 60 * 1000 });

  if (pendingFiles.length > 0) {
    await sandbox.writeFiles(
      pendingFiles.map((f) => ({
        path: f.path,
        content: Buffer.from(f.content, "utf-8"),
      }))
    );
  }

  sandboxInstance = sandbox;
  sandboxReady = true;
  return sandbox;
}

async function getSandbox() {
  if (sandboxInstance && sandboxReady) {
    return sandboxInstance;
  }
  return createFreshSandbox();
}

/**
 * Initialize sandbox for "changes" mode (old vs new content).
 */
export function initializeSandboxChanges(changes: SectionChange[]) {
  pendingFiles = generateChangesSandboxFiles(changes);
  resetSandbox();
}

/**
 * Initialize sandbox for a single focused change (clicked by user).
 * Writes old/new content + lightweight summary of all changes.
 */
export function initializeSandboxFocused(
  focused: FocusedChange,
  changesSummary: SectionChange[]
) {
  pendingFiles = generateFocusedSandboxFiles(focused, changesSummary);
  resetSandbox();
}

/**
 * Initialize sandbox for "browse" mode (selected doc sections).
 */
export function initializeSandboxBrowse(sections: BrowseSection[]) {
  pendingFiles = generateBrowseSandboxFiles(sections);
  resetSandbox();
}

// The bash tool — uses "use step" for durability
export async function bashCommand(
  { command }: { command: string },
  { toolCallId }: { toolCallId: string }
) {
  "use step";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function runOnSandbox(sandbox: any) {
    let result;
    if (
      command.includes("|") ||
      command.includes(">") ||
      command.includes("&&") ||
      command.includes(";") ||
      command.includes("$(")
    ) {
      result = await sandbox.runCommand("sh", ["-c", command]);
    } else {
      const parts = command.split(" ");
      result = await sandbox.runCommand(parts[0], parts.slice(1));
    }

    const stdout = await result.stdout();
    const stderr = await result.stderr();

    return {
      success: result.exitCode === 0,
      stdout: stdout ? stdout.substring(0, 10000) : "",
      stderr: stderr ? stderr.substring(0, 2000) : "",
      exitCode: result.exitCode,
    };
  }

  let sandbox = await getSandbox();

  try {
    return await runOnSandbox(sandbox);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);

    if (msg.includes("410")) {
      resetSandbox();
      sandbox = await createFreshSandbox();
      try {
        return await runOnSandbox(sandbox);
      } catch (retryError) {
        return {
          success: false,
          stdout: "",
          stderr:
            retryError instanceof Error
              ? retryError.message
              : "Unknown error on retry",
          exitCode: 1,
        };
      }
    }

    return {
      success: false,
      stdout: "",
      stderr: msg,
      exitCode: 1,
    };
  }
}

const bashCommandSchema = z.object({
  command: z
    .string()
    .describe("The bash command to execute in the sandbox environment"),
});

export const tools = {
  bash_command: {
    description: `Execute a bash command in the sandbox to explore Vercel documentation files.

The docs/ directory contains documentation files. Use these commands:
- ls docs/                       List top-level contents
- cat docs/<file>                Read a file
- grep -r "pattern" docs/       Search across all docs
- diff <file1> <file2>          Compare two files
- head -20 docs/<file>          Preview a file`,
    inputSchema: bashCommandSchema,
    parameters: bashCommandSchema,
    execute: bashCommand,
  },
};

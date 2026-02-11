import { z } from "zod";
import { Sandbox } from "@vercel/sandbox";
import { NFL_FILES } from "./nfl-data";

// Sandbox instance cache (module-level, reused across step invocations)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sandboxInstance: any = null;
let sandboxReady = false;

function resetSandbox() {
  sandboxInstance = null;
  sandboxReady = false;
}

async function createFreshSandbox() {
  const sandbox = await Sandbox.create({ timeout: 5 * 60 * 1000 });

  await sandbox.writeFiles(
    NFL_FILES.map((f) => ({
      path: f.path,
      content: Buffer.from(f.content, "utf-8"),
    }))
  );

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

// The single bash tool — uses "use step" for durability
export async function bashCommand(
  { command }: { command: string },
  { toolCallId }: { toolCallId: string }
) {
  "use step";

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

    // If sandbox expired (410 Gone), recreate and retry once
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

// Tool schema
const bashCommandSchema = z.object({
  command: z
    .string()
    .describe("The bash command to execute in the sandbox environment"),
});

// Export tools map for DurableAgent
export const tools = {
  bash_command: {
    description: `Execute a bash command in the sandbox environment to explore NFL data files.

Available files in the nfl/ directory:
- nfl/README.txt                - Directory overview
- nfl/2024-season-standings.txt - Final regular season standings by division
- nfl/super-bowl-lix.txt        - Super Bowl LIX full recap and box score
- nfl/playoff-bracket-2025.txt  - Complete playoff bracket and results
- nfl/top-performers-2024.txt   - Season stat leaders and award winners

Useful commands:
- ls nfl/                          List available files
- cat nfl/<filename>               Read a file
- grep "pattern" nfl/*.txt         Search across files
- grep -i "pattern" nfl/*.txt      Case-insensitive search
- head -20 nfl/<filename>          First 20 lines
- wc -l nfl/<filename>             Line count`,
    inputSchema: bashCommandSchema,
    parameters: bashCommandSchema,
    execute: bashCommand,
  },
};

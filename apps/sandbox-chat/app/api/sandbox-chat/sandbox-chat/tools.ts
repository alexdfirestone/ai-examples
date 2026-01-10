import { tool as createTool, zodSchema } from 'ai';
import { z } from 'zod';

// Sandbox type - will be provided by @vercel/sandbox when installed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SandboxInstance = any;

// Track recitation count across tool calls
let recitationCount = 0;
let stepNumber = 0;

export function getRecitationCount() {
  return recitationCount;
}

export function resetRecitationCount() {
  recitationCount = 0;
  stepNumber = 0;
}

const executeCommandInputSchema = z.object({
  command: z.string().describe('The bash command to execute'),
});

export function createSandboxTools(sandbox: SandboxInstance) {
  const executeCommand = createTool({
    description: `Execute a bash command in the sandbox environment.
Use this for ALL operations:
- Create/update todo.md with: echo "content" > todo.md
- Read files with: cat filename
- List files with: ls directory/
- Search with: grep pattern file
- Sort/filter with: sort, head, tail, wc, awk

The sandbox has example files in files/:
- company-data.txt - Q4 company metrics and revenue data
- meeting-notes.txt - Weekly leadership meeting notes
- project-status.txt - Project Phoenix status report

Always maintain and update todo.md to track progress through tasks.`,
    inputSchema: zodSchema(executeCommandInputSchema),
    execute: async ({ command }) => {
      stepNumber++;
      
      // Detect todo recitation (reading the todo file)
      const isTodoRead = command.includes('cat todo.md');
      const isTodoWrite = command.includes('todo.md') && (command.includes('echo') || command.includes('>'));
      
      if (isTodoRead) {
        recitationCount++;
        console.log(`\n[Step ${stepNumber}] 🔄 RECITATION #${recitationCount}`);
      } else if (isTodoWrite) {
        console.log(`\n[Step ${stepNumber}] 📝 Updating Todo`);
      } else {
        console.log(`\n[Step ${stepNumber}] 🔧 Executing: ${command.substring(0, 60)}...`);
      }

      try {
        // Handle complex commands with pipes/redirects via sh -c
        let result;
        if (command.includes('|') || command.includes('>') || command.includes('&&') || command.includes(';') || command.includes('$(')) {
          result = await sandbox.runCommand('sh', ['-c', command]);
        } else {
          const parts = command.split(' ');
          const cmd = parts[0];
          const args = parts.slice(1);
          result = await sandbox.runCommand(cmd, args);
        }

        // stdout and stderr are async functions in @vercel/sandbox
        const stdout = await result.stdout();
        const stderr = await result.stderr();
        const exitCode = result.exitCode;

        if (stdout) {
          console.log(`  Output: ${stdout.substring(0, 200)}${stdout.length > 200 ? '...' : ''}`);
        }
        if (stderr) {
          console.log(`  Error: ${stderr.substring(0, 200)}`);
        }

        return {
          success: exitCode === 0,
          stdout: stdout ? stdout.substring(0, 10000) : '', // Limit output size
          stderr: stderr ? stderr.substring(0, 2000) : '',
          exitCode,
          command,
          isRecitation: isTodoRead,
          recitationNumber: isTodoRead ? recitationCount : undefined,
        };
      } catch (error) {
        console.log(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return {
          success: false,
          stdout: '',
          stderr: error instanceof Error ? error.message : 'Unknown error',
          exitCode: 1,
          command,
          isRecitation: isTodoRead,
          recitationNumber: isTodoRead ? recitationCount : undefined,
        };
      }
    },
  });

  return {
    execute_command: executeCommand,
  };
}

export type SandboxToolResult = {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  command: string;
  isRecitation: boolean;
  recitationNumber?: number;
};

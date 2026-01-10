import { tool as createTool, zodSchema } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';

// In-memory state for the schedule (per-request context in this simple version)
export interface ScheduleWindow {
  start?: string;
  end?: string;
  tz?: string;
}

export interface ScheduleBlock {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  notes?: string;
  category?: string;
}

export interface ScheduleState {
  window: ScheduleWindow;
  blocks: ScheduleBlock[];
}

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

// Helper to generate unique block IDs
let blockCounter = 0;
function generateBlockId(): string {
  return `blk_${String(++blockCounter).padStart(2, '0')}`;
}

// Helper to sync schedule state to sandbox as read-only reference
// This allows the agent to read schedule.json via bash while mutations go through dedicated tools
export async function syncScheduleToSandbox(sandbox: SandboxInstance, state: ScheduleState): Promise<void> {
  try {
    // Sort blocks by start time for consistent output
    const sortedBlocks = [...state.blocks].sort((a, b) => 
      new Date(a.start).getTime() - new Date(b.start).getTime()
    );
    
    const scheduleData = {
      window: state.window,
      blocks: sortedBlocks,
      _meta: {
        syncedAt: new Date().toISOString(),
        note: 'READ-ONLY: Use mutate_timeline/mutate_blocks tools to modify schedule'
      }
    };
    
    // Escape single quotes in JSON for shell safety
    const jsonString = JSON.stringify(scheduleData, null, 2).replace(/'/g, "'\\''");
    
    await sandbox.runCommand('sh', ['-c', `echo '${jsonString}' > schedule.json`]);
    console.log(`📅 Synced schedule.json (${sortedBlocks.length} blocks)`);
  } catch (error) {
    console.error('Failed to sync schedule to sandbox:', error);
  }
}

// Schema for execute_command
const executeCommandInputSchema = z.object({
  command: z.string().describe('The bash command to execute'),
});

export function createPlannerTools(sandbox: SandboxInstance, state: ScheduleState) {
  
  // SANDBOX TOOL: For todo.md, research storage, and schedule reference
  const executeCommand = createTool({
    description: `Execute bash commands in the sandbox for planning workflow management:

**Primary Uses:**
- Create/update todo.md to track planning progress with checkboxes
- Save web search results to research/ directory for later reference
- Read stored research when planning activities
- Read schedule.json to see current schedule state (READ-ONLY reference)
- List files and explore stored information

**Schedule Reference (READ-ONLY):**
- schedule.json contains current schedule (auto-synced after mutations)
- Read: cat schedule.json
- Query: cat schedule.json | jq '.blocks[] | select(.start | startswith("2025-05-06"))'
- NOTE: To MODIFY the schedule, use mutate_timeline/mutate_blocks tools

**Todo Pattern (CRITICAL):**
- Create: echo "# Planning Task\\n- [ ] Step 1\\n- [ ] Step 2" > todo.md
- Read (RECITE): cat todo.md
- Update: Use sed to mark items complete, then cat todo.md again

**Research Storage:**
- Save: echo "Research findings..." > research/topic.md
- Read: cat research/topic.md
- List: ls research/

Always maintain todo.md with checkboxes. After completing each task, mark it done and read todo.md again - this recitation keeps you focused!`,
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

  // Tool: Ask follow-up questions (ONCE per response, max 3-4 questions)
  const askFollowup = createTool({
    description: `Ask the user clarifying questions when you need more information to proceed.

CRITICAL CONSTRAINTS:
- Call this tool AT MOST ONCE per response
- Maximum 3-4 questions total
- Only ask when CRITICAL information is missing
- Do NOT ask about timezone (infer from location)
- Do NOT ask about booking/reservations (you cannot book)
- Prefer making reasonable assumptions over asking

Use sparingly - bias toward action!`,
    inputSchema: zodSchema(z.object({
      questions: z.array(z.string()).max(4).describe('Array of 1-4 follow-up questions. Be selective - only ask what is truly critical.'),
    })),
    execute: async ({ questions }) => {
      // Enforce max 4 questions
      const limitedQuestions = questions.slice(0, 4);
      return { 
        questions: limitedQuestions,
        count: limitedQuestions.length
      };
    },
  });

  // Tool: Mutate timeline
  const mutateTimeline = createTool({
    description: 'Create or update the trip/event timeline window. Set the start date, end date, and timezone for the schedule. This updates the UI schedule view and syncs to schedule.json.',
    inputSchema: zodSchema(z.object({
      startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().optional().describe('End date in YYYY-MM-DD format'),
      timezone: z.string().optional().describe('Timezone (e.g., America/Los_Angeles, America/New_York)'),
    })),
    execute: async ({ startDate, endDate, timezone }) => {
      // Build update details for display
      const updates: string[] = [];
      
      // Update window with provided fields (only overwrite what's provided)
      if (startDate) {
        state.window.start = startDate;
        updates.push(`Start: ${startDate}`);
      }
      if (endDate) {
        state.window.end = endDate;
        updates.push(`End: ${endDate}`);
      }
      if (timezone) {
        state.window.tz = timezone;
        updates.push(`Timezone: ${timezone}`);
      }
      
      // Sync updated state to sandbox
      await syncScheduleToSandbox(sandbox, state);
      
      return { 
        window: state.window,
        message: 'Timeline updated successfully',
        displayMessage: updates.length > 0 ? updates.join(' • ') : 'Timeline updated'
      };
    },
  });

  // Tool: Mutate blocks
  const mutateBlocks = createTool({
    description: 'Add, update, or delete schedule blocks (activities, meetings, meals, etc.). For new blocks, omit the id. For updates, include the id. For deletion, include id and set delete to true. This updates the UI schedule view and syncs to schedule.json.',
    inputSchema: zodSchema(z.object({
      id: z.string().optional().describe('Block ID (required for update/delete, omit for create)'),
      title: z.string().optional().describe('Block title/name'),
      start: z.string().optional().describe('Start time in ISO 8601 format (e.g., 2025-05-06T09:00:00-07:00)'),
      end: z.string().optional().describe('End time in ISO 8601 format'),
      location: z.string().optional().describe('Location/venue'),
      notes: z.string().optional().describe('Additional notes'),
      category: z.string().optional().describe('Category: meeting, meal, activity, travel, etc.'),
      delete: z.boolean().optional().describe('Set to true to delete this block'),
    })),
    execute: async (input) => {
      // DELETE operation
      if (input.delete && input.id) {
        state.blocks = state.blocks.filter(b => b.id !== input.id);
        // Sync updated state to sandbox
        await syncScheduleToSandbox(sandbox, state);
        return {
          blocks: state.blocks,
          window: state.window,
          message: `Block deleted successfully`
        };
      }
      
      // UPDATE operation
      if (input.id) {
        const blockIndex = state.blocks.findIndex(b => b.id === input.id);
        if (blockIndex === -1) {
          throw new Error(`Block with id ${input.id} not found`);
        }
        
        // Update only provided fields
        const block = state.blocks[blockIndex];
        if (input.title !== undefined) block.title = input.title;
        if (input.start !== undefined) block.start = input.start;
        if (input.end !== undefined) block.end = input.end;
        if (input.location !== undefined) block.location = input.location;
        if (input.notes !== undefined) block.notes = input.notes;
        if (input.category !== undefined) block.category = input.category;
        
        // Sync updated state to sandbox
        await syncScheduleToSandbox(sandbox, state);
        
        return {
          blocks: state.blocks,
          window: state.window,
          message: `Block "${block.title}" updated successfully`
        };
      }
      
      // CREATE operation
      if (!input.title || !input.start || !input.end) {
        throw new Error('Title, start, and end are required for new blocks');
      }
      
      const newBlock: ScheduleBlock = {
        id: generateBlockId(),
        title: input.title,
        start: input.start,
        end: input.end,
        location: input.location,
        notes: input.notes,
        category: input.category,
      };
      
      state.blocks.push(newBlock);
      
      // Sync updated state to sandbox
      await syncScheduleToSandbox(sandbox, state);
      
      return {
        blocks: state.blocks,
        window: state.window,
        message: `Block "${newBlock.title}" added successfully`
      };
    },
  });

  // Tool: Read schedule
  const readSchedule = createTool({
    description: 'Read the current schedule state, including the timeline window and all blocks. Use this to understand what is currently planned before making modifications or when answering questions about the schedule. Returns blocks with their IDs, which are required for updates and deletions.',
    inputSchema: zodSchema(z.object({})),
    execute: async () => {
      // Sort blocks by start time for consistent reading
      const sortedBlocks = [...state.blocks].sort((a, b) => 
        new Date(a.start).getTime() - new Date(b.start).getTime()
      );

      return {
        window: state.window,
        blocks: sortedBlocks,
        summary: `Read ${sortedBlocks.length} blocks. Timeline: ${state.window.start || 'Unset'} to ${state.window.end || 'Unset'} (${state.window.tz || 'No timezone set'})`
      };
    },
  });

  return {
    execute_command: executeCommand,
    ask_followup: askFollowup,
    web_search: openai.tools.webSearch(),
    mutate_timeline: mutateTimeline,
    mutate_blocks: mutateBlocks,
    read_schedule: readSchedule,
  };
}

// Export type for tool result
export type SandboxToolResult = {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  command: string;
  isRecitation: boolean;
  recitationNumber?: number;
};

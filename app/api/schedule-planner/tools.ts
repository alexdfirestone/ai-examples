import { tool as createTool } from 'ai';
import { z } from 'zod';

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

// Helper to generate unique block IDs
let blockCounter = 0;
function generateBlockId(): string {
  return `blk_${String(++blockCounter).padStart(2, '0')}`;
}

// Tool 1: Ask follow-up questions
export const askFollowupTool = createTool({
  description: 'Ask the user a clarifying question when you need more information to proceed. Use this when the user request is unclear or missing important details.',
  inputSchema: z.object({
    message: z.string().describe('The follow-up question to ask the user'),
  }),
  execute: async function ({ message }) {
    // Simply return the message - the AI will use this to ask clarifying questions
    return { question: message };
  },
});

// Tool 2: Web research (mocked for PoC)
export const webResearchTool = createTool({
  description: 'Search the web for information about places, activities, restaurants, etc. Returns plain text search results.',
  inputSchema: z.object({
    query: z.string().describe('The search query'),
  }),
  execute: async function ({ query }) {
    // Mock search results for the PoC
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const mockResults = [
      `${query} - Top rated on TripAdvisor with 4.8 stars. Known for authentic experience and great atmosphere.`,
      `Best times to visit: Weekday evenings are less crowded. Weekend brunch is highly recommended.`,
      `Location tips: Located in the downtown area, easily accessible by public transit. Parking available nearby.`,
      `Insider recommendation: Try the chef's special and arrive early to avoid wait times.`,
      `Reviews mention excellent service, reasonable prices, and memorable experience.`
    ];
    
    return { 
      query,
      results: mockResults.join('\n\n')
    };
  },
});

// Tool 3: Mutate timeline
export const mutateTimelineTool = createTool({
  description: 'Create or update the trip/event timeline window. Set the start date, end date, and timezone for the schedule.',
  inputSchema: z.object({
    startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
    endDate: z.string().optional().describe('End date in YYYY-MM-DD format'),
    timezone: z.string().optional().describe('Timezone (e.g., America/Los_Angeles, America/New_York)'),
  }),
  execute: async function ({ startDate, endDate, timezone }, { toolCallId, abortSignal }) {
    // Get current state from context (passed via metadata)
    const state = (this as any).state as ScheduleState;
    
    // Update window with provided fields (only overwrite what's provided)
    if (startDate) state.window.start = startDate;
    if (endDate) state.window.end = endDate;
    if (timezone) state.window.tz = timezone;
    
    return { 
      window: state.window,
      message: 'Timeline updated successfully'
    };
  },
});

// Tool 4: Mutate blocks
export const mutateBlocksTool = createTool({
  description: 'Add, update, or delete schedule blocks (activities, meetings, meals, etc.). For new blocks, omit the id. For updates, include the id. For deletion, include id and set delete to true.',
  inputSchema: z.object({
    id: z.string().optional().describe('Block ID (required for update/delete, omit for create)'),
    title: z.string().optional().describe('Block title/name'),
    start: z.string().optional().describe('Start time in ISO 8601 format (e.g., 2025-05-06T09:00:00-07:00)'),
    end: z.string().optional().describe('End time in ISO 8601 format'),
    location: z.string().optional().describe('Location/venue'),
    notes: z.string().optional().describe('Additional notes'),
    category: z.string().optional().describe('Category: meeting, meal, activity, travel, etc.'),
    delete: z.boolean().optional().describe('Set to true to delete this block'),
  }),
  execute: async function (input, { toolCallId, abortSignal }) {
    const state = (this as any).state as ScheduleState;
    
    // DELETE operation
    if (input.delete && input.id) {
      state.blocks = state.blocks.filter(b => b.id !== input.id);
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
    
    return {
      blocks: state.blocks,
      window: state.window,
      message: `Block "${newBlock.title}" added successfully`
    };
  },
});

export const tools = {
  ask_followup: askFollowupTool,
  web_research: webResearchTool,
  mutate_timeline: mutateTimelineTool,
  mutate_blocks: mutateBlocksTool,
};


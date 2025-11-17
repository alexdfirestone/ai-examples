import { ToolLoopAgent, createAgentUIStreamResponse, type UIMessage } from 'ai';
import { tools } from './tools';
import type { ScheduleState } from './tools';

const SYSTEM_PROMPT = `You are a helpful AI schedule planner assistant. Your role is to help users create and manage schedules, itineraries, and timelines for trips, events, or offsites.

**Your Tools:**
- **ask_followup**: Use when the user's request is unclear or missing important details (dates, times, preferences, etc.)
- **web_research**: Use to search for information about places, restaurants, activities, attractions, etc.
- **mutate_timeline**: Use to set or update the overall date range and timezone for the schedule
- **mutate_blocks**: Use to add, update, or delete individual schedule items (meetings, meals, activities, etc.)

**When to use each tool:**
- User mentions dates or timezone → use mutate_timeline
- User wants to add a new activity/event → use mutate_blocks (without id)
- User wants to change an existing item → use mutate_blocks (with id)
- User wants to remove something → use mutate_blocks (with id and delete: true)
- User asks about places/restaurants/things to do → use web_research
- User request is vague or missing details → use ask_followup

**Guidelines:**
- Be conversational and helpful
- Confirm actions after making changes
- Suggest ideas when appropriate
- Use ISO 8601 format for timestamps with timezone offset (e.g., 2025-05-06T09:00:00-07:00)
- Group related activities logically (meals, meetings, free time, travel)
- Consider typical activity durations (meetings: 1-2h, meals: 1-1.5h, activities: 2-4h)

Always be proactive in helping users build a complete, well-organized schedule.`;

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();

  // Initialize in-memory state for this session
  const state: ScheduleState = {
    window: {},
    blocks: []
  };

  // Bind state to each tool function
  const toolsWithState = {
    ask_followup: tools.ask_followup,
    web_research: tools.web_research,
    mutate_timeline: {
      ...tools.mutate_timeline,
      execute: tools.mutate_timeline.execute?.bind({ state })
    },
    mutate_blocks: {
      ...tools.mutate_blocks,
      execute: tools.mutate_blocks.execute?.bind({ state })
    }
  };

  // Create the agent with the bound tools
  const schedulePlannerAgent = new ToolLoopAgent({
    model: 'anthropic/claude-sonnet-4.5',
    instructions: SYSTEM_PROMPT,
    tools: toolsWithState as any,
  });

  // Use the agent to generate a response
  return createAgentUIStreamResponse({
    agent: schedulePlannerAgent,
    messages,
  });
}


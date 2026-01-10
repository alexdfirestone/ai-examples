import { streamText, convertToModelMessages, UIMessage, stepCountIs } from 'ai';
import { createSandboxTools, getRecitationCount, resetRecitationCount } from './tools';
import { SANDBOX_SYSTEM_PROMPT } from './prompt';

// Dynamic import for @vercel/sandbox - allows TS to compile before package is installed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Sandbox: any;

async function loadSandbox() {
  if (!Sandbox) {
    const module = await import('@vercel/sandbox');
    Sandbox = module.Sandbox;
  }
  return Sandbox;
}

// Store sandbox instance for reuse within a session
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sandboxInstance: any = null;
let sandboxCreatedAt: number = 0;
const SANDBOX_TTL = 5 * 60 * 1000; // 5 minutes

function createFileBuffer(content: string): Buffer {
  return Buffer.from(content, 'utf-8');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSandbox(): Promise<any> {
  const now = Date.now();
  
  // Reuse existing sandbox if still fresh
  if (sandboxInstance && (now - sandboxCreatedAt) < SANDBOX_TTL) {
    return sandboxInstance;
  }

  // Load Sandbox class dynamically
  const SandboxClass = await loadSandbox();

  // Create new sandbox
  console.log('Creating new sandbox instance...');
  sandboxInstance = await SandboxClass.create({
    timeout: 5 * 60 * 1000, // 5 minute timeout
  });

  // Write sample files using writeFiles API
  const sampleFiles = getSampleFiles();
  
  await sandboxInstance.writeFiles([
    { path: 'files/company-data.txt', content: createFileBuffer(sampleFiles['company-data.txt']) },
    { path: 'files/meeting-notes.txt', content: createFileBuffer(sampleFiles['meeting-notes.txt']) },
    { path: 'files/project-status.txt', content: createFileBuffer(sampleFiles['project-status.txt']) },
  ]);

  sandboxCreatedAt = now;
  console.log('Sandbox created and files initialized');
  
  return sandboxInstance;
}

// Sample file contents
function getSampleFiles(): Record<string, string> {
  return {
    'company-data.txt': `ACME CORPORATION - Q4 2025 METRICS
===================================

Revenue Summary
---------------
- Total Revenue: $4.2M (up 23% YoY)
- Recurring Revenue: $3.1M (74% of total)
- New Contracts: $890K
- Expansion Revenue: $210K

Customer Metrics
----------------
- Total Customers: 342
- Enterprise Accounts: 28
- Mid-Market: 156
- SMB: 158
- Net Revenue Retention: 118%
- Logo Churn: 2.1%

Product Usage
-------------
- Monthly Active Users: 12,847
- Daily Active Users: 4,231
- Average Session Duration: 18 minutes
- Feature Adoption Rate: 67%

Top Performing Regions
----------------------
1. North America: $2.4M (57%)
2. Europe: $1.2M (29%)
3. Asia Pacific: $420K (10%)
4. Latin America: $180K (4%)

Key Initiatives Status
----------------------
- Product Launch v3.0: ON TRACK (Feb 2026)
- Enterprise Security Cert: COMPLETED
- Mobile App Beta: DELAYED (was Dec, now Mar)
- Partner Program: IN PROGRESS (40% complete)`,
    
    'meeting-notes.txt': `WEEKLY LEADERSHIP SYNC - January 3, 2026
=========================================

Attendees: Sarah (CEO), Mike (CTO), Lisa (VP Sales), Tom (VP Product)

AGENDA ITEMS
------------

1. Q4 Review & Q1 Planning
   - Sarah: Q4 exceeded targets by 8%. Board is pleased.
   - Focus for Q1: Enterprise expansion and product stability
   - ACTION: Lisa to present enterprise pipeline next week

2. Engineering Update
   - Mike: Completed migration to new infrastructure
   - Performance improved 40% across all services
   - Hiring: 3 senior engineers starting in January
   - CONCERN: Technical debt in payment module needs addressing

3. Product Roadmap
   - Tom: v3.0 feature freeze scheduled for Jan 15
   - Customer feedback: Top requests are:
     * Real-time collaboration (HIGH)
     * Mobile offline mode (MEDIUM)
     * API rate limit increases (MEDIUM)
   - Deprioritized: Advanced analytics dashboard (moved to Q2)

4. Sales Pipeline
   - Lisa: $1.8M in qualified pipeline for Q1
   - 3 enterprise deals expected to close in January
   - New vertical: Healthcare showing strong interest
   - Challenge: Longer sales cycles in government sector

DECISIONS MADE
--------------
- Approved: 2 additional headcount for customer success
- Approved: Budget for SOC 2 Type II audit
- Deferred: Office expansion discussion to February

NEXT MEETING: January 10, 2026 at 9:00 AM`,

    'project-status.txt': `PROJECT PHOENIX - STATUS REPORT
================================
Report Date: January 5, 2026
Project Lead: Jordan Chen
Sprint: 14 of 18

EXECUTIVE SUMMARY
-----------------
Project Phoenix is the company's flagship platform modernization initiative.
Overall status: YELLOW (was GREEN last week)
Reason: Integration testing revealed performance issues requiring attention.

MILESTONE PROGRESS
------------------
[x] Phase 1: Architecture Design (Complete)
[x] Phase 2: Core Services Migration (Complete)
[x] Phase 3: Data Layer Refactoring (Complete)
[ ] Phase 4: UI/UX Overhaul (85% complete)
[ ] Phase 5: Integration Testing (60% complete)
[ ] Phase 6: Beta Release (Not started - Feb 15 target)
[ ] Phase 7: Production Rollout (Not started - Mar 1 target)

CURRENT BLOCKERS
----------------
1. CRITICAL: Database query optimization needed for dashboard
   - Owner: Database Team
   - ETA: Jan 8
   
2. HIGH: Third-party API rate limiting causing test failures
   - Owner: Platform Team
   - ETA: Jan 10
   
3. MEDIUM: Documentation gaps in new API endpoints
   - Owner: Technical Writing
   - ETA: Jan 12

RESOURCE ALLOCATION
-------------------
- Engineering: 12 FTE (need 2 more for testing phase)
- QA: 4 FTE (adequate)
- DevOps: 2 FTE (adequate)
- Design: 1 FTE (wrapping up, transitioning off)

RISKS & MITIGATIONS
-------------------
Risk: Performance regression in high-traffic scenarios
Mitigation: Added load testing to CI pipeline, scheduled capacity review

Risk: Team burnout due to aggressive timeline
Mitigation: Approved comp time after launch, hired contractor support

BUDGET STATUS
-------------
Allocated: $450,000
Spent: $312,000 (69%)
Forecast: $420,000 (under budget by $30K)

NEXT STEPS
----------
1. Complete performance optimization by Jan 8
2. Finalize beta user list by Jan 10
3. Begin beta documentation prep
4. Schedule stakeholder demo for Jan 20`,
  };
}

export async function POST(request: Request) {
  const { messages, resetSandbox }: { messages: UIMessage[]; resetSandbox?: boolean } = await request.json();

  // Reset sandbox if requested
  if (resetSandbox) {
    sandboxInstance = null;
    resetRecitationCount();
  }

  // Reset recitation count for new conversations
  if (messages.length <= 1) {
    resetRecitationCount();
  }

  const sandbox = await getSandbox();
  const tools = createSandboxTools(sandbox);

  const result = streamText({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: 'anthropic/claude-sonnet-4.5' as any,
    system: SANDBOX_SYSTEM_PROMPT,
    messages: convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(50), // Allow many steps for recitation pattern
    onFinish: async (result) => {
      console.log(`
========== SANDBOX CHAT COMPLETE ==========
Total Steps: ${result.steps.length}
Tool Calls: ${result.toolCalls?.length || 0}
Recitation Count: ${getRecitationCount()}
Finish Reason: ${result.finishReason}
===========================================
      `);
    },
  });

  return result.toUIMessageStreamResponse();
}

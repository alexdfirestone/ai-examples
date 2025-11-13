// Scoring tool with rubric

import type { CanonicalProfile, ScoringResult } from "../types";
import type { CandidateInput } from "../types";

export async function scoreWithRubric(args: {
  canonical: CanonicalProfile;
  job?: CandidateInput["jobContext"];
}): Promise<ScoringResult> {
  "use step";

  const { canonical, job } = args;
  const riskFlags: string[] = [];

  // Default job requirements if not provided
  const targetSkills = job?.skills || ["typescript", "react", "node.js"];
  const needed = new Set(targetSkills.map((s) => s.toLowerCase()));
  const has = new Set((canonical.skills || []).map((s) => s.toLowerCase()));

  // Calculate skill match
  let matchCount = 0;
  needed.forEach((skill) => {
    if (has.has(skill)) matchCount += 1;
  });

  const skillScore = Math.round((matchCount / Math.max(1, needed.size)) * 100);

  // Check experience level
  const experienceYears = canonical.experience?.length || 0;
  if (experienceYears < 2) {
    riskFlags.push("limited_experience");
  }

  // Check for gaps in profile
  if (!canonical.emails || canonical.emails.length === 0) {
    riskFlags.push("missing_contact_info");
  }

  // Check job hopping (average tenure)
  if (experienceYears >= 3) {
    const avgTenure = 3 / experienceYears; // simplified calculation
    if (avgTenure < 1.5) {
      riskFlags.push("potential_job_hopping");
    }
  }

  // Overall score combines skill match with experience level
  let score = skillScore;
  if (experienceYears >= 3) score = Math.min(100, score + 10);
  if (experienceYears >= 5) score = Math.min(100, score + 5);
  if (riskFlags.length > 0) score = Math.max(0, score - riskFlags.length * 5);

  const rationale = `Matched ${matchCount}/${needed.size} target skills (${Array.from(needed).join(", ")}). 
Experience: ${experienceYears} positions. 
${riskFlags.length > 0 ? `Risk flags: ${riskFlags.join(", ")}.` : "No significant risk flags."}`;

  return {
    score: Math.round(score),
    rationale: rationale.trim(),
    riskFlags,
  };
}


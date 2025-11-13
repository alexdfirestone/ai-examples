"use client";

import type { WorkflowResult } from "@/workflows/resume-example/types";

interface ProfileResultsProps {
  result: WorkflowResult;
}

export function ProfileResults({ result }: ProfileResultsProps) {
  if (result.status === "failed") {
    return (
      <div className="border border-zinc-800 bg-zinc-950 p-8 text-center">
        <div className="w-12 h-12 border border-zinc-700 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-5 h-5 text-zinc-600"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h2 className="text-sm font-light text-zinc-400 tracking-wide uppercase mb-2">
          Workflow Failed
        </h2>
        <p className="text-xs text-zinc-600 font-light">
          The review workflow encountered an error. Please try again.
        </p>
      </div>
    );
  }

  if (!result.enriched || !result.snippets) {
    return null;
  }

  const { enriched, snippets } = result;

  return (
    <div className="space-y-8">
      {/* Overall Score */}
      <div className="border border-zinc-800 bg-zinc-950 p-8">
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-widest">
            Evaluation Complete
          </h2>
          <div className="text-right">
            <div className="text-5xl font-extralight text-white tracking-tighter">
              {enriched.overallScore}
            </div>
            <div className="text-xs text-zinc-600 font-mono mt-1">/ 100</div>
          </div>
        </div>

        <div className="mb-6 pb-6 border-b border-zinc-900">
          <h3 className="text-xs font-light text-zinc-500 mb-2 tracking-wide">
            HEADLINE
          </h3>
          <p className="text-sm text-zinc-300 font-light leading-relaxed">
            {snippets.headline}
          </p>
        </div>

        <div>
          <h3 className="text-xs font-light text-zinc-500 mb-2 tracking-wide">
            BIO
          </h3>
          <p className="text-sm text-zinc-400 font-light leading-relaxed">
            {snippets.bio}
          </p>
        </div>
      </div>

      {/* Highlights */}
      <div className="border border-zinc-800 bg-zinc-950 p-8">
        <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-4">
          Key Highlights
        </h3>
        <ul className="space-y-3">
          {snippets.highlights.map((highlight, index) => (
            <li key={index} className="flex items-start gap-3 text-sm text-zinc-400 font-light">
              <span className="text-zinc-700 font-mono text-xs mt-0.5">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Rationale */}
      <div className="border border-zinc-800 bg-zinc-950 p-8">
        <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-4">
          AI Analysis
        </h3>
        <p className="text-sm text-zinc-500 font-light leading-relaxed whitespace-pre-line">
          {enriched.rationale}
        </p>
      </div>

      {/* Risk Flags */}
      {enriched.riskFlags.length > 0 && (
        <div className="border border-zinc-800 bg-zinc-950 p-8">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-4">
            Risk Flags
          </h3>
          <ul className="space-y-2">
            {enriched.riskFlags.map((flag, index) => (
              <li key={index} className="flex items-start gap-3 text-sm text-zinc-500 font-light">
                <span className="text-zinc-800 mt-1">•</span>
                <span>{flag.replace(/_/g, " ")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Gaps */}
      {enriched.gaps.length > 0 && (
        <div className="border border-zinc-800 bg-zinc-950 p-8">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-4">
            Missing Information
          </h3>
          <ul className="space-y-2">
            {enriched.gaps.map((gap, index) => (
              <li key={index} className="flex items-start gap-3 text-sm text-zinc-500 font-light">
                <span className="text-zinc-800 mt-1">•</span>
                <span>{gap}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Detailed Profile */}
      <div className="border border-zinc-800 bg-zinc-950 p-8">
        <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-6">
          Candidate Profile
        </h3>

        <div className="space-y-6">
          {enriched.canonical.name && (
            <div>
              <h4 className="text-xs font-light text-zinc-600 mb-1 tracking-wide">
                NAME
              </h4>
              <p className="text-sm text-zinc-300 font-light">
                {enriched.canonical.name}
              </p>
            </div>
          )}

          {enriched.canonical.headline && (
            <div>
              <h4 className="text-xs font-light text-zinc-600 mb-1 tracking-wide">
                HEADLINE
              </h4>
              <p className="text-sm text-zinc-300 font-light">
                {enriched.canonical.headline}
              </p>
            </div>
          )}

          {enriched.canonical.location && (
            <div>
              <h4 className="text-xs font-light text-zinc-600 mb-1 tracking-wide">
                LOCATION
              </h4>
              <p className="text-sm text-zinc-300 font-light">
                {enriched.canonical.location}
              </p>
            </div>
          )}

          {enriched.canonical.skills && enriched.canonical.skills.length > 0 && (
            <div>
              <h4 className="text-xs font-light text-zinc-600 mb-3 tracking-wide">
                SKILLS
              </h4>
              <div className="flex flex-wrap gap-2">
                {enriched.canonical.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-light"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {enriched.canonical.experience &&
            enriched.canonical.experience.length > 0 && (
              <div>
                <h4 className="text-xs font-light text-zinc-600 mb-4 tracking-wide">
                  EXPERIENCE
                </h4>
                <div className="space-y-4">
                  {enriched.canonical.experience.map((exp, index) => (
                    <div
                      key={index}
                      className="border-l border-zinc-800 pl-4 pb-3"
                    >
                      <div className="font-light text-sm text-zinc-300">
                        {exp.title}
                      </div>
                      <div className="text-sm text-zinc-500 font-light">
                        {exp.company}
                      </div>
                      {exp.dates && (
                        <div className="text-xs text-zinc-700 font-mono mt-1">
                          {exp.dates}
                        </div>
                      )}
                      {exp.bullets && exp.bullets.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {exp.bullets.map((bullet, i) => (
                            <li
                              key={i}
                              className="text-xs text-zinc-600 font-light flex items-start gap-2"
                            >
                              <span className="text-zinc-800 mt-0.5">•</span>
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          {enriched.canonical.education &&
            enriched.canonical.education.length > 0 && (
              <div>
                <h4 className="text-xs font-light text-zinc-600 mb-3 tracking-wide">
                  EDUCATION
                </h4>
                <div className="space-y-3">
                  {enriched.canonical.education.map((edu, index) => (
                    <div key={index}>
                      <div className="font-light text-sm text-zinc-300">
                        {edu.school}
                      </div>
                      {edu.degree && (
                        <div className="text-sm text-zinc-500 font-light">
                          {edu.degree}
                        </div>
                      )}
                      {edu.dates && (
                        <div className="text-xs text-zinc-700 font-mono mt-1">
                          {edu.dates}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}


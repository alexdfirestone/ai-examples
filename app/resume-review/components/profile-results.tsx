"use client";

import type { WorkflowResult } from "@/workflows/resume-example/types";

interface ProfileResultsProps {
  result: WorkflowResult;
}

export function ProfileResults({ result }: ProfileResultsProps) {
  if (result.status === "failed") {
    return (
      <div className="border border-white p-12 text-center">
        <div className="w-16 h-16 border-2 border-white flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h2 className="text-sm font-mono text-white tracking-wider uppercase mb-3">
          WORKFLOW FAILED
        </h2>
        <p className="text-xs text-zinc-500 font-light">
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
    <div className="space-y-px">
      {/* Overall Score */}
      <div className="border border-white bg-black p-12">
        <div className="flex items-start justify-between mb-12">
          <div>
            <div className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-1">
              EVALUATION
            </div>
            <div className="text-xs font-mono text-white uppercase tracking-widest">
              COMPLETE
            </div>
          </div>
          <div className="text-right">
            <div className="text-7xl font-light text-white tabular-nums">
              {enriched.overallScore}
            </div>
            <div className="text-xs text-zinc-700 font-mono mt-2 tracking-wider">/ 100</div>
          </div>
        </div>

        <div className="mb-10 pb-10 border-b border-zinc-900">
          <h3 className="text-[10px] font-mono text-zinc-700 mb-4 tracking-widest">
            HEADLINE
          </h3>
          <p className="text-base text-white font-light leading-relaxed">
            {snippets.headline}
          </p>
        </div>

        <div>
          <h3 className="text-[10px] font-mono text-zinc-700 mb-4 tracking-widest">
            BIOGRAPHY
          </h3>
          <p className="text-sm text-zinc-400 font-light leading-relaxed">
            {snippets.bio}
          </p>
        </div>
      </div>

      {/* Highlights */}
      <div className="border border-white bg-black p-12">
        <h3 className="text-[10px] font-mono text-zinc-700 uppercase tracking-widest mb-6">
          KEY HIGHLIGHTS
        </h3>
        <ul className="space-y-4">
          {snippets.highlights.map((highlight, index) => (
            <li key={index} className="flex items-start gap-4 text-sm text-white font-light leading-relaxed">
              <span className="text-zinc-800 font-mono text-xs mt-1 w-6 flex-shrink-0">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Rationale */}
      <div className="border border-white bg-black p-12">
        <h3 className="text-[10px] font-mono text-zinc-700 uppercase tracking-widest mb-6">
          AI ANALYSIS
        </h3>
        <p className="text-sm text-zinc-400 font-light leading-loose whitespace-pre-line">
          {enriched.rationale}
        </p>
      </div>

      {/* Risk Flags */}
      {enriched.riskFlags.length > 0 && (
        <div className="border border-white bg-black p-12">
          <h3 className="text-[10px] font-mono text-zinc-700 uppercase tracking-widest mb-6">
            RISK FLAGS
          </h3>
          <ul className="space-y-3">
            {enriched.riskFlags.map((flag, index) => (
              <li key={index} className="flex items-start gap-3 text-sm text-zinc-500 font-light">
                <span className="w-1 h-1 bg-zinc-700 rounded-full mt-2 flex-shrink-0"></span>
                <span>{flag.replace(/_/g, " ")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Gaps */}
      {enriched.gaps.length > 0 && (
        <div className="border border-white bg-black p-12">
          <h3 className="text-[10px] font-mono text-zinc-700 uppercase tracking-widest mb-6">
            MISSING INFORMATION
          </h3>
          <ul className="space-y-3">
            {enriched.gaps.map((gap, index) => (
              <li key={index} className="flex items-start gap-3 text-sm text-zinc-500 font-light">
                <span className="w-1 h-1 bg-zinc-700 rounded-full mt-2 flex-shrink-0"></span>
                <span>{gap}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Detailed Profile */}
      <div className="border border-white bg-black p-12">
        <h3 className="text-[10px] font-mono text-zinc-700 uppercase tracking-widest mb-10">
          CANDIDATE PROFILE
        </h3>

        <div className="space-y-8">
          {enriched.canonical.name && (
            <div>
              <h4 className="text-[10px] font-mono text-zinc-800 mb-2 tracking-widest">
                NAME
              </h4>
              <p className="text-sm text-white font-light">
                {enriched.canonical.name}
              </p>
            </div>
          )}

          {enriched.canonical.headline && (
            <div>
              <h4 className="text-[10px] font-mono text-zinc-800 mb-2 tracking-widest">
                HEADLINE
              </h4>
              <p className="text-sm text-white font-light">
                {enriched.canonical.headline}
              </p>
            </div>
          )}

          {enriched.canonical.location && (
            <div>
              <h4 className="text-[10px] font-mono text-zinc-800 mb-2 tracking-widest">
                LOCATION
              </h4>
              <p className="text-sm text-zinc-400 font-light">
                {enriched.canonical.location}
              </p>
            </div>
          )}

          {enriched.canonical.skills && enriched.canonical.skills.length > 0 && (
            <div>
              <h4 className="text-[10px] font-mono text-zinc-800 mb-4 tracking-widest">
                SKILLS
              </h4>
              <div className="flex flex-wrap gap-2">
                {enriched.canonical.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 border border-zinc-800 text-zinc-500 text-xs font-light"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {enriched.canonical.experience &&
            enriched.canonical.experience.length > 0 && (
              <div className="pt-4">
                <h4 className="text-[10px] font-mono text-zinc-800 mb-6 tracking-widest">
                  EXPERIENCE
                </h4>
                <div className="space-y-8">
                  {enriched.canonical.experience.map((exp, index) => (
                    <div
                      key={index}
                      className="border-l-2 border-zinc-900 pl-6"
                    >
                      <div className="font-light text-sm text-white mb-1">
                        {exp.title}
                      </div>
                      <div className="text-sm text-zinc-600 font-light mb-2">
                        {exp.company}
                      </div>
                      {exp.dates && (
                        <div className="text-[10px] text-zinc-800 font-mono tracking-wider mb-3">
                          {exp.dates}
                        </div>
                      )}
                      {exp.bullets && exp.bullets.length > 0 && (
                        <ul className="mt-3 space-y-2">
                          {exp.bullets.map((bullet, i) => (
                            <li
                              key={i}
                              className="text-xs text-zinc-600 font-light flex items-start gap-3"
                            >
                              <span className="w-1 h-1 bg-zinc-800 rounded-full mt-1.5 flex-shrink-0"></span>
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
              <div className="pt-4">
                <h4 className="text-[10px] font-mono text-zinc-800 mb-6 tracking-widest">
                  EDUCATION
                </h4>
                <div className="space-y-6">
                  {enriched.canonical.education.map((edu, index) => (
                    <div key={index}>
                      <div className="font-light text-sm text-white mb-1">
                        {edu.school}
                      </div>
                      {edu.degree && (
                        <div className="text-sm text-zinc-600 font-light mb-2">
                          {edu.degree}
                        </div>
                      )}
                      {edu.dates && (
                        <div className="text-[10px] text-zinc-800 font-mono tracking-wider">
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


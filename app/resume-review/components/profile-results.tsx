"use client";

import type { WorkflowResult } from "@/workflows/resume-example/types";

interface ProfileResultsProps {
  result: WorkflowResult;
}

export function ProfileResults({ result }: ProfileResultsProps) {
  if (result.status === "failed") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center mb-2">
          <svg
            className="w-5 h-5 text-red-600 mr-2"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <h2 className="text-lg font-semibold text-red-900">
            Workflow Failed
          </h2>
        </div>
        <p className="text-sm text-red-700">
          The resume review workflow encountered an error. Please try again.
        </p>
      </div>
    );
  }

  if (!result.enriched || !result.snippets) {
    return null;
  }

  const { enriched, snippets } = result;

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Review Complete</h2>
          <div className="text-right">
            <div className="text-4xl font-bold text-blue-600">
              {enriched.overallScore}
            </div>
            <div className="text-sm text-gray-600">out of 100</div>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Headline</h3>
          <p className="text-base text-gray-900">{snippets.headline}</p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Bio</h3>
          <p className="text-sm text-gray-900">{snippets.bio}</p>
        </div>
      </div>

      {/* Highlights */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Key Highlights
        </h3>
        <ul className="space-y-2">
          {snippets.highlights.map((highlight, index) => (
            <li key={index} className="text-sm text-gray-700">
              {highlight}
            </li>
          ))}
        </ul>
      </div>

      {/* Rationale */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          AI Analysis
        </h3>
        <p className="text-sm text-gray-700 whitespace-pre-line">
          {enriched.rationale}
        </p>
      </div>

      {/* Risk Flags */}
      {enriched.riskFlags.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-3">
            Risk Flags
          </h3>
          <ul className="space-y-1">
            {enriched.riskFlags.map((flag, index) => (
              <li key={index} className="text-sm text-yellow-800">
                • {flag.replace(/_/g, " ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Gaps */}
      {enriched.gaps.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Missing Information
          </h3>
          <ul className="space-y-1">
            {enriched.gaps.map((gap, index) => (
              <li key={index} className="text-sm text-gray-700">
                • {gap}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Detailed Profile */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Candidate Profile
        </h3>

        {enriched.canonical.name && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700">Name</h4>
            <p className="text-sm text-gray-900">{enriched.canonical.name}</p>
          </div>
        )}

        {enriched.canonical.headline && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700">Headline</h4>
            <p className="text-sm text-gray-900">
              {enriched.canonical.headline}
            </p>
          </div>
        )}

        {enriched.canonical.location && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700">Location</h4>
            <p className="text-sm text-gray-900">
              {enriched.canonical.location}
            </p>
          </div>
        )}

        {enriched.canonical.skills && enriched.canonical.skills.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Skills</h4>
            <div className="flex flex-wrap gap-2">
              {enriched.canonical.skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {enriched.canonical.experience &&
          enriched.canonical.experience.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Experience
              </h4>
              <div className="space-y-3">
                {enriched.canonical.experience.map((exp, index) => (
                  <div
                    key={index}
                    className="border-l-2 border-blue-200 pl-4 py-1"
                  >
                    <div className="font-medium text-sm text-gray-900">
                      {exp.title}
                    </div>
                    <div className="text-sm text-gray-700">{exp.company}</div>
                    {exp.dates && (
                      <div className="text-xs text-gray-500">{exp.dates}</div>
                    )}
                    {exp.bullets && exp.bullets.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {exp.bullets.map((bullet, i) => (
                          <li key={i} className="text-xs text-gray-600">
                            • {bullet}
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
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Education
              </h4>
              <div className="space-y-2">
                {enriched.canonical.education.map((edu, index) => (
                  <div key={index}>
                    <div className="font-medium text-sm text-gray-900">
                      {edu.school}
                    </div>
                    {edu.degree && (
                      <div className="text-sm text-gray-700">{edu.degree}</div>
                    )}
                    {edu.dates && (
                      <div className="text-xs text-gray-500">{edu.dates}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}


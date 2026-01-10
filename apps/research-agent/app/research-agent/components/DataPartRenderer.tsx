"use client";

import type { CustomDataPart } from "@/workflows/research/types";

interface DataPartRendererProps {
  part: CustomDataPart;
  onApprove?: (webhookUrl: string, approved: boolean) => void;
}

export function DataPartRenderer({ part, onApprove }: DataPartRendererProps) {
  switch (part.type) {
    case "data-research-progress": {
      const { query, status, resultCount } = part.data;
      return (
        <div className="my-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2">
            {status === "searching" && (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  Searching for: <strong>{query}</strong>
                </span>
              </>
            )}
            {status === "found" && (
              <>
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  Found {resultCount} results for: <strong>{query}</strong>
                </span>
              </>
            )}
            {status === "complete" && (
              <>
                <span className="text-green-600 dark:text-green-400">✓</span>
                <span className="text-sm text-green-700 dark:text-green-300">
                  Research complete: <strong>{query}</strong>
                </span>
              </>
            )}
          </div>
        </div>
      );
    }

    case "data-outline": {
      return (
        <div className="my-4 p-5 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-3">
            Report Outline
          </h3>
          <div className="space-y-2">
            {part.data.sections.map((section, idx) => (
              <div
                key={idx}
                className="p-3 bg-white dark:bg-gray-800 rounded border border-purple-100 dark:border-purple-900"
              >
                <div className="font-medium text-purple-900 dark:text-purple-100">
                  {idx + 1}. {section.title}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {section.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "data-approval-request": {
      return (
        <div className="my-4 p-5 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-2 border-yellow-300 dark:border-yellow-700">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⏸️</span>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                Approval Required
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-4">
                {part.data.message}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => onApprove?.(part.data.webhookUrl, true)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors"
                >
                  Approve & Continue
                </button>
                <button
                  onClick={() => onApprove?.(part.data.webhookUrl, false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    case "data-section-progress": {
      const { sectionTitle, status, content } = part.data;
      return (
        <div className="my-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
          {status === "writing" && (
            <div className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full" />
              <span className="text-sm text-indigo-700 dark:text-indigo-300">
                Writing section: <strong>{sectionTitle}</strong>
              </span>
            </div>
          )}
          {status === "complete" && content && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-600 dark:text-green-400">✓</span>
                <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                  Completed: {sectionTitle}
                </span>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-3 rounded border border-indigo-100 dark:border-indigo-900 whitespace-pre-wrap">
                {content}
              </div>
            </div>
          )}
        </div>
      );
    }

    case "data-report-complete": {
      const { title, wordCount } = part.data;
      return (
        <div className="my-4 p-5 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-300 dark:border-green-700">
          <div className="flex items-start gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                Report Complete!
              </h3>
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>{title}</strong>
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                {wordCount.toLocaleString()} words
              </p>
            </div>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}

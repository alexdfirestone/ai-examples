"use client";

import { useState } from "react";
import type { CustomDataPart } from "@/workflows/research/types";
import { MessageResponse } from "@/components/ai-elements/message";

interface DataPartRendererProps {
  part: CustomDataPart;
  onApprove?: (webhookUrl: string, approved: boolean) => void;
}

function ApprovalCard({
  message,
  webhookUrl,
  onApprove,
}: {
  message: string;
  webhookUrl: string;
  onApprove?: (webhookUrl: string, approved: boolean) => void;
}) {
  const [status, setStatus] = useState<"pending" | "approving" | "rejecting" | "approved" | "rejected">("pending");

  const handleApprove = async () => {
    setStatus("approving");
    try {
      await onApprove?.(webhookUrl, true);
      setStatus("approved");
    } catch {
      setStatus("pending");
    }
  };

  const handleReject = async () => {
    setStatus("rejecting");
    try {
      await onApprove?.(webhookUrl, false);
      setStatus("rejected");
    } catch {
      setStatus("pending");
    }
  };

  if (status === "approved") {
    return (
      <div className="my-3 py-2 px-3 flex items-center gap-2 text-[13px] text-[#37352f]/70">
        <svg className="w-4 h-4 text-[#2eaadc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span>Approved — continuing workflow</span>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="my-3 py-2 px-3 flex items-center gap-2 text-[13px] text-[#37352f]/70">
        <svg className="w-4 h-4 text-[#37352f]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        <span>Rejected — workflow stopped</span>
      </div>
    );
  }

  return (
    <div className="my-4 rounded-md border border-[#e3e3e1] bg-[#fbfbfa]">
      <div className="px-4 py-3 border-b border-[#e3e3e1]">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[#9b9a97]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-[13px] font-medium text-[#37352f]">Approval required</span>
        </div>
      </div>
      <div className="px-4 py-3">
        <p className="text-[13px] text-[#37352f]/80 mb-4 leading-relaxed">
          {message}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleApprove}
            disabled={status !== "pending"}
            className="px-3 py-1.5 text-[13px] font-medium text-white bg-[#2eaadc] hover:bg-[#2898c6] disabled:opacity-50 rounded transition-colors"
          >
            {status === "approving" ? (
              <span className="flex items-center gap-1.5">
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Approving...
              </span>
            ) : (
              "Approve"
            )}
          </button>
          <button
            onClick={handleReject}
            disabled={status !== "pending"}
            className="px-3 py-1.5 text-[13px] font-medium text-[#37352f]/70 hover:bg-[#37352f]/5 disabled:opacity-50 rounded transition-colors"
          >
            {status === "rejecting" ? "Rejecting..." : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DataPartRenderer({ part, onApprove }: DataPartRendererProps) {
  switch (part.type) {
    case "data-research-progress": {
      const { query, status, resultCount } = part.data;
      return (
        <div className="my-2 flex items-center gap-2 text-[13px] text-[#37352f]/70">
          {status === "searching" && (
            <>
              <svg className="w-3.5 h-3.5 animate-spin text-[#9b9a97]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              <span>Searching: <span className="text-[#37352f]">{query}</span></span>
            </>
          )}
          {status === "found" && (
            <>
              <svg className="w-3.5 h-3.5 text-[#9b9a97]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Found {resultCount} results for <span className="text-[#37352f]">{query}</span></span>
            </>
          )}
          {status === "complete" && (
            <>
              <svg className="w-3.5 h-3.5 text-[#2eaadc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>Research complete: <span className="text-[#37352f]">{query}</span></span>
            </>
          )}
        </div>
      );
    }

    case "data-outline": {
      return (
        <div className="my-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-[#9b9a97]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            <span className="text-[13px] font-medium text-[#37352f]">Outline</span>
          </div>
          <div className="ml-6 border-l border-[#e3e3e1] pl-4">
            {part.data.sections.map((section, idx) => (
              <div key={idx} className="py-1.5">
                <div className="text-[13px] text-[#37352f]">
                  {idx + 1}. {section.title}
                </div>
                <div className="text-[12px] text-[#37352f]/50 mt-0.5">
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
        <ApprovalCard
          message={part.data.message}
          webhookUrl={part.data.webhookUrl}
          onApprove={onApprove}
        />
      );
    }

    case "data-section-progress": {
      const { sectionTitle, status, content } = part.data;
      return (
        <div className="my-2">
          {status === "writing" && (
            <div className="flex items-center gap-2 text-[13px] text-[#37352f]/70">
              <svg className="w-3.5 h-3.5 animate-spin text-[#9b9a97]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              <span>Writing: <span className="text-[#37352f]">{sectionTitle}</span></span>
            </div>
          )}
          {status === "complete" && content && (
            <div className="mt-3">
              <div className="flex items-center gap-2 text-[13px] text-[#37352f]/70 mb-2">
                <svg className="w-3.5 h-3.5 text-[#2eaadc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>{sectionTitle}</span>
              </div>
              <div className="ml-6 text-[14px] text-[#37352f]/80 leading-relaxed border-l border-[#e3e3e1] pl-4">
                <MessageResponse className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  {content}
                </MessageResponse>
              </div>
            </div>
          )}
        </div>
      );
    }

    case "data-report-complete": {
      const { title, wordCount } = part.data;
      return (
        <div className="my-4 py-3 px-4 rounded-md bg-[#f7f6f3] border border-[#e3e3e1]">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#2eaadc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <span className="text-[13px] font-medium text-[#37352f]">{title}</span>
              <span className="text-[12px] text-[#37352f]/50 ml-2">{wordCount.toLocaleString()} words</span>
            </div>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}

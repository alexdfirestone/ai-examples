"use client";

import { useState } from "react";
import type { CandidateInput } from "@/workflows/resume-example/types";

interface UploadFormProps {
  onSubmit: (input: CandidateInput) => void;
  isLoading: boolean;
}

export function UploadForm({ onSubmit, isLoading }: UploadFormProps) {
  const [candidateId, setCandidateId] = useState("");
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [uploadUrl, setUploadUrl] = useState("");
  const [role, setRole] = useState("Senior Full-Stack Engineer");
  const [skills, setSkills] = useState("TypeScript, React, Node.js, PostgreSQL, Next.js");

  const handleAutoFill = () => {
    setCandidateId(`candidate-${Date.now()}`);
    setLinkedInUrl("https://linkedin.com/in/mock-user");
    setGithubUrl("https://github.com/mock-user");
    setUploadUrl("https://example.com/resume.pdf");
    setRole("Senior Full-Stack Engineer");
    setSkills("TypeScript, React, Node.js, PostgreSQL, Next.js");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const input: CandidateInput = {
      candidateId: candidateId || `candidate-${Date.now()}`,
      linkedInUrl: linkedInUrl || undefined,
      githubUrl: githubUrl || undefined,
      uploadUrl: uploadUrl || undefined,
      jobContext: {
        role,
        seniority: "Senior",
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
      },
    };

    onSubmit(input);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Candidate Information
          </h2>
          <button
            type="button"
            onClick={handleAutoFill}
            disabled={isLoading}
            className="px-2 py-1 text-xs font-light text-zinc-400 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            AUTO-FILL
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="candidateId"
              className="block text-xs font-light text-zinc-500 mb-2 tracking-wide"
            >
              Candidate ID
            </label>
            <input
              type="text"
              id="candidateId"
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value)}
              placeholder="Auto-generated"
              disabled={isLoading}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm font-light focus:outline-none focus:border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-zinc-700 transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="uploadUrl"
              className="block text-xs font-light text-zinc-500 mb-2 tracking-wide"
            >
              Resume URL
            </label>
            <input
              type="text"
              id="uploadUrl"
              value={uploadUrl}
              onChange={(e) => setUploadUrl(e.target.value)}
              placeholder="https://example.com/resume.pdf"
              disabled={isLoading}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm font-light focus:outline-none focus:border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-zinc-700 transition-colors"
            />
            <p className="mt-1 text-xs text-zinc-700 font-light">
              Optional • PDF or DOC file URL
            </p>
          </div>

          <div>
            <label
              htmlFor="linkedInUrl"
              className="block text-xs font-light text-zinc-500 mb-2 tracking-wide"
            >
              LinkedIn URL
            </label>
            <input
              type="text"
              id="linkedInUrl"
              value={linkedInUrl}
              onChange={(e) => setLinkedInUrl(e.target.value)}
              placeholder="https://linkedin.com/in/username"
              disabled={isLoading}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm font-light focus:outline-none focus:border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-zinc-700 transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="githubUrl"
              className="block text-xs font-light text-zinc-500 mb-2 tracking-wide"
            >
              GitHub URL
            </label>
            <input
              type="text"
              id="githubUrl"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/username"
              disabled={isLoading}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm font-light focus:outline-none focus:border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-zinc-700 transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="mb-6 pt-6 border-t border-zinc-800">
        <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-4">
          Job Context
        </h2>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="role"
              className="block text-xs font-light text-zinc-500 mb-2 tracking-wide"
            >
              Target Role
            </label>
            <input
              type="text"
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Senior Full-Stack Engineer"
              disabled={isLoading}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm font-light focus:outline-none focus:border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-zinc-700 transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="skills"
              className="block text-xs font-light text-zinc-500 mb-2 tracking-wide"
            >
              Required Skills
            </label>
            <input
              type="text"
              id="skills"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="TypeScript, React, Node.js"
              disabled={isLoading}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm font-light focus:outline-none focus:border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-zinc-700 transition-colors"
            />
            <p className="mt-1 text-xs text-zinc-700 font-light">
              Comma-separated list
            </p>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-6 py-3 text-sm font-light text-black bg-white hover:bg-zinc-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors tracking-wider uppercase"
      >
        {isLoading ? "Processing..." : "Initiate Workflow"}
      </button>
    </form>
  );
}


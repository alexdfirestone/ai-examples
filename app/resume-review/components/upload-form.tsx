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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Candidate Information
          </h2>
          <button
            type="button"
            onClick={handleAutoFill}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-200"
          >
            Auto-fill with Mock Data
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="candidateId"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Candidate ID (optional)
            </label>
            <input
              type="text"
              id="candidateId"
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value)}
              placeholder="Auto-generated if empty"
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label
              htmlFor="uploadUrl"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Resume URL (optional)
            </label>
            <input
              type="text"
              id="uploadUrl"
              value={uploadUrl}
              onChange={(e) => setUploadUrl(e.target.value)}
              placeholder="https://example.com/resume.pdf"
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">
              PDF or DOC file URL (mocked for demo)
            </p>
          </div>

          <div>
            <label
              htmlFor="linkedInUrl"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              LinkedIn URL (optional)
            </label>
            <input
              type="text"
              id="linkedInUrl"
              value={linkedInUrl}
              onChange={(e) => setLinkedInUrl(e.target.value)}
              placeholder="https://linkedin.com/in/username"
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label
              htmlFor="githubUrl"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              GitHub URL (optional)
            </label>
            <input
              type="text"
              id="githubUrl"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/username"
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Job Context
        </h2>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="role"
              className="block text-sm font-medium text-gray-700 mb-1"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label
              htmlFor="skills"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Required Skills (comma-separated)
            </label>
            <input
              type="text"
              id="skills"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="TypeScript, React, Node.js"
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? "Processing..." : "Start Review"}
      </button>
    </form>
  );
}


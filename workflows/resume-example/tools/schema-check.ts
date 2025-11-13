// Profile validation tool

import type { CanonicalProfile } from "../types";

export async function schemaCheck(profile: CanonicalProfile): Promise<void> {
  "use step";

  if (!profile || typeof profile !== "object") {
    throw new Error("canonical object invalid: not an object");
  }

  // Ensure required arrays exist
  if (!profile.experience || !Array.isArray(profile.experience)) {
    profile.experience = [];
  }

  if (!profile.skills || !Array.isArray(profile.skills)) {
    profile.skills = [];
  }

  if (!profile.education || !Array.isArray(profile.education)) {
    profile.education = [];
  }

  if (!profile.emails || !Array.isArray(profile.emails)) {
    profile.emails = [];
  }

  if (!profile.urls || !Array.isArray(profile.urls)) {
    profile.urls = [];
  }

  // Validate experience entries
  profile.experience.forEach((exp, i) => {
    if (!exp.company || !exp.title) {
      throw new Error(
        `Experience entry ${i} missing required fields (company, title)`
      );
    }
  });

  console.log(`[schema-check] Profile validated successfully`);
}


// Mock data generators for testing

export function mockResumeText(): string {
  return `Taylor Doe
Senior Full-Stack Engineer
taylor@example.com | New York, NY

EXPERIENCE
Acme Inc. | Senior Full-Stack Engineer | 2021–present
• Led migration of legacy monolith to Next.js 14, improving performance by 60%
• Built real-time collaboration features using WebSockets and Redis
• Mentored 3 junior engineers and established code review practices

Globex Corporation | Software Engineer | 2018–2021
• Built ETL pipelines processing 10M+ records daily using Node.js and PostgreSQL
• Developed REST APIs serving 500K+ monthly active users
• Implemented comprehensive test coverage achieving 85%+ code coverage

EDUCATION
State University | BS Computer Science | 2014–2018
• Dean's List, GPA 3.8/4.0

SKILLS
TypeScript, React, Node.js, PostgreSQL, Next.js, Docker, AWS, Redis, GraphQL`;
}

export function mockLinkedInHtml(): string {
  return `<html>
<body>
  <h1>Taylor Doe</h1>
  <p class="headline">Senior Full-Stack Engineer at Acme Inc.</p>
  <div class="location">New York, NY</div>
  <div class="experience">
    <h2>Experience</h2>
    <div class="job">
      <h3>Senior Full-Stack Engineer</h3>
      <p>Acme Inc. • 2021–present</p>
      <p>Leading development of cloud-native applications</p>
    </div>
    <div class="job">
      <h3>Software Engineer</h3>
      <p>Globex Corporation • 2018–2021</p>
      <p>Built data pipelines and APIs</p>
    </div>
  </div>
  <div class="skills">
    <span>TypeScript</span>
    <span>React</span>
    <span>Node.js</span>
    <span>Next.js</span>
  </div>
</body>
</html>`;
}

export function mockGithubReadme(): string {
  return `# taylor-doe

Senior Full-Stack Engineer passionate about building scalable web applications.

## 🛠️ Tech Stack
- **Frontend:** React, Next.js, TypeScript
- **Backend:** Node.js, Express, NestJS
- **Database:** PostgreSQL, Redis, MongoDB
- **Cloud:** AWS (EC2, S3, Lambda), Docker

## 📚 Notable Projects
- **data-utils:** TypeScript utilities for ETL pipelines (150+ ⭐)
- **next-realtime:** Real-time collaboration framework for Next.js (80+ ⭐)

## 🎤 Speaking
- JSConf 2023: "Optimizing Next.js Performance"
- ReactConf 2022: "Building Real-time Features"`;
}

export function mockCandidateInput() {
  return {
    candidateId: `candidate-${Date.now()}`,
    linkedInUrl: "https://linkedin.com/in/mock-user",
    githubUrl: "https://github.com/mock-user",
    jobContext: {
      role: "Senior Full-Stack Engineer",
      seniority: "Senior",
      skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "Next.js"],
    },
  };
}


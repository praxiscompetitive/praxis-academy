// Seeds Praxis SE (Document 01 curriculum) + three demo users. Idempotent: wipes and recreates the SE programme.
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, competencies, lessons, missions, modules, prereqs, programmes, users } from "../src/db";

// [code, title, outcome, topics, assignment, hard prerequisites]
const M: [string, string, string, string, string, string[]][] = [
  ["M01", "Introduction to Software Engineering", "Understand the work involved in delivering software, from problem discovery through operation and maintenance.",
    "Programming versus software engineering; software product lifecycle; SDLC models; Agile, Scrum and Kanban; problem framing; stakeholders; functional and non-functional requirements; user stories and acceptance criteria; feasibility; estimation; prioritisation; risk; project planning; technical documentation.",
    "Select a real problem, identify stakeholders, define scope and constraints, and produce a concise requirements specification with acceptance criteria.", []],
  ["M02", "Programming Fundamentals", "Reason about programs and implement solutions in a general-purpose language.",
    "How programs execute; compilation and interpretation; variables, types, operators; conditionals; loops; functions; scope; collections and data structures; strings; files; exceptions; modules; OOP; basic functional concepts; recursion; algorithms; complexity; debugging; memory concepts. Suggested teaching language: Python.",
    "Build a command-line application that solves a defined problem, validates input, handles errors, stores data and includes a short explanation of its design.", []],
  ["M03", "Developer Tools and Collaborative Workflows", "Use the tools and workflows expected in a collaborative development environment.",
    "Command line and shell; filesystem navigation; editors and IDEs; Git fundamentals; commits; branches; merges; conflict resolution; remotes; GitHub or equivalent; pull requests; issue tracking; semantic versioning; package managers; dependencies; environment variables; debugging tools; reading unfamiliar code; basic Linux.",
    "Collaborate on a shared repository, complete a feature branch, open a pull request, resolve a deliberate conflict and document the workflow.", []],
  ["M04", "Software Design and Architecture", "Make reasoned design decisions and structure systems so they can evolve.",
    "Decomposition; abstraction; encapsulation; separation of concerns; cohesion and coupling; interfaces; modularity; SOLID; DRY, KISS, YAGNI; design patterns; layered architecture; MVC/MVVM; monoliths, modular monoliths, microservices; event-driven architecture; DDD foundations; architecture diagrams; trade-offs; ADRs.",
    "Design two viable architectures for the same product, compare trade-offs and defend a selected approach.", ["M02", "M03"]],
  ["M05", "Databases and Data Engineering", "Model, store, query and protect application data.",
    "Relational concepts; SQL; relationships; ER modelling; normalisation; constraints; keys; joins; indexes; query planning; transactions and ACID; concurrency; migrations; backups and recovery; access control; NoSQL models; caching; data integrity; introductory data pipelines.",
    "Design and implement the data layer for an inventory or order-management system, including schema, migrations, representative queries and integrity rules.", ["M02"]],
  ["M06", "Backend Engineering and APIs", "Build application services that expose reliable, secure and maintainable interfaces.",
    "Client-server model; HTTP/HTTPS; request/response lifecycle; REST; resource modelling; API contracts; validation; error handling; authentication; authorization; sessions and tokens; middleware; file handling; pagination; filtering; rate limiting; background jobs; async processing; WebSockets; API docs; configuration; backend security.",
    "Implement a documented API for the data model from M05, with authentication, validation, error handling and automated tests.", ["M02", "M03", "M05"]],
  ["M07", "Frontend Engineering and User Interfaces", "Build accessible, responsive and maintainable user-facing applications.",
    "HTML; CSS; JavaScript; TypeScript; browser and DOM; responsive layouts; accessibility; component-based design; frameworks; routing; forms; state management; API integration; client-side validation; loading and error states; browser storage; performance; usability and UI fundamentals.",
    "Build a responsive administrative interface that consumes the M06 API and handles realistic user workflows.", ["M02", "M03"]],
  ["M08", "Application Development Domains", "Understand the distinctive requirements and engineering approaches of different software product categories.",
    "Web (static, server-rendered, SPA, PWA); desktop; mobile; enterprise and ERP (master data, roles, workflows, audit, reporting, multi-tenancy); systems software (processes, threads, memory, filesystems, networking); distributed and real-time systems (messaging, consistency, fault tolerance, observability).",
    "Choose one domain, investigate its constraints and produce a small working vertical slice with a domain-specific design rationale.", ["M04"]],
  ["M09", "Testing, Verification and Software Quality", "Establish confidence that software behaves as intended and remains reliable as it changes.",
    "Testing principles and levels; unit, integration, system, end-to-end; test design; boundary and equivalence cases; mocks and fakes; TDD; regression; exploratory testing; static analysis; linting; coverage; performance and load testing; quality attributes; defect triage; automation.",
    "Test an existing application, identify gaps, add a balanced automated test suite and report what the tests do and do not prove.", ["M02", "M03"]],
  ["M10", "DevOps, Deployment and Operations", "Move software reliably from development into production and operate it responsibly.",
    "Dev/staging/production; Linux administration; processes and services; networking and DNS; hosting and cloud; containers and Docker; registries; reverse proxies; TLS; CI/CD; release pipelines; configuration and secrets; logging, metrics, tracing; monitoring; backups; deployment strategies; rollback; reliability and scaling.",
    "Containerise and deploy an application, configure a CI pipeline and provide a runbook covering deployment, monitoring and rollback.", ["M03"]],
  ["M11", "AI-Assisted Software Engineering", "Use AI tools effectively while retaining engineering judgement and accountability.",
    "AI coding assistants; prompting for code; context engineering; repository exploration; code generation; debugging assistance; refactoring; test and doc generation; AI code review; agentic workflows; tool use and MCP; evaluating generated code; hallucinated APIs; dependency and licensing checks; privacy; security risks; verification; when not to use AI.",
    "Deliver a small feature using an AI-assisted workflow, keep a decision and verification log, and explain the code, tests, risks and changes personally.", ["M02", "M03"]],
  ["M12", "Security and Professional Software Practice", "Build software responsibly and maintain it after release.",
    "Threat modelling; secure development lifecycle; OWASP Top 10; input validation; injection; XSS; CSRF; authentication and authorization risks; secrets management; encryption fundamentals; dependency vulnerabilities; privacy; data minimisation; access control; licensing; code review; technical debt; legacy systems; refactoring; documentation; incident response; ethics.",
    "Perform a security and maintainability review of a sample application, prioritise findings and propose fixes with evidence.", []],
  ["CAP", "Capstone", "Demonstrate end-to-end capability and defend decisions on a real project.",
    "Problem statement, users, scope, assumptions, NFRs; requirements and acceptance criteria; architecture and key decisions; data model and API design; version-controlled implementation; testing strategy and evidence; security, privacy and failure considerations; deployment or reproducible delivery package; documentation; final demonstration and defence.",
    "Select an approved project (e.g. ERP/inventory, e-commerce, booking system) and deliver a meaningful slice of the software lifecycle covering every capstone requirement, then defend your decisions.", ["M09", "M10", "M12"]],
];

const RUBRIC = [
  { name: "Correctness", description: "Does the deliverable satisfy the stated requirements and acceptance criteria?" },
  { name: "Engineering quality", description: "Is the solution understandable, appropriately structured and maintainable?" },
  { name: "Verification", description: "Is there meaningful testing or other evidence that supports the claims?" },
  { name: "Security and reliability", description: "Have relevant risks, validation, error cases and operational concerns been considered?" },
  { name: "Communication", description: "Can the learner explain the solution, decisions, limitations and how to run it?" },
];

const pw = await bcrypt.hash(process.env.SEED_PASSWORD ?? "praxis-dev-pass", 10);
for (const [email, name, role] of [["admin@praxis.test", "Ada Admin", "admin"], ["reviewer@praxis.test", "Rae Reviewer", "reviewer"], ["learner@praxis.test", "Lee Learner", "learner"]] as const)
  await db.insert(users).values({ email, name, role, passwordHash: pw }).onConflictDoNothing();

await db.delete(programmes).where(eq(programmes.slug, "praxis-se"));
const [p] = await db.insert(programmes).values({ slug: "praxis-se", title: "Praxis SE", published: true,
  summary: "Software engineering: from programming fundamentals to independently delivering substantial projects." }).returning();

const ids = new Map<string, string>();
for (const [i, [code, title, outcome, topics, assignment]] of M.entries()) {
  const [m] = await db.insert(modules).values({ programmeId: p.id, code, title, outcome, position: i }).returning();
  ids.set(code, m.id);
  await db.insert(lessons).values([
    { moduleId: m.id, title: "Core topics", body: topics, position: 0 },
    { moduleId: m.id, title: "Practice and approach", body: `Principles before tools: understand the engineering problem first, then apply tools to it.\n\nMission for this module:\n${assignment}`, position: 1 },
  ]);
  const [c] = await db.insert(competencies).values({ programmeId: p.id, name: `${code} ${title}` }).returning();
  await db.insert(missions).values({ moduleId: m.id, title: `${code} mission: ${title}`, brief: assignment, rubric: RUBRIC, competencyId: c.id,
    evidence: "Repository / PR / deployment URL, documentation, tests, and a short reflection" });
}
for (const [code, , , , , req] of M) for (const r of req) await db.insert(prereqs).values({ moduleId: ids.get(code)!, requiresId: ids.get(r)! });
console.log(`seeded ${M.length} modules`);
process.exit(0);

# AI Lead Hunter — Agent Instructions

## 1. Purpose

AI Lead Hunter helps users find companies, collect verified knowledge, receive AI recommendations, and make their own decisions.

AI assists. The user makes the final decision.

Do not turn the product into a generic CRM. Preserve its focus on research, verified knowledge, recommendations, and user-controlled decisions.

## 2. Repository Structure

The frontend is the npm package at the repository root:

- `src/app`
- `src/pages`
- `src/components`
- `src/features`
- `src/domain`
- `src/repositories`
- `src/services`
- `src/stores`
- `src/i18n`

The backend is a separate npm package under `backend/`:

- `backend/src/api`
- `backend/src/application`
- `backend/src/domain`
- `backend/src/infrastructure`
- `backend/prisma`
- `backend/scripts`
- `backend/tests`

Frontend and backend are separate npm packages. The repository does not currently use npm workspaces.

## 3. Confirmed Technology Stack

Frontend:

- React 19
- TypeScript
- Vite 6
- Tailwind CSS
- shadcn/ui
- Zustand
- LocalStorage
- Vitest

Backend:

- Fastify 5
- TypeScript
- Prisma 7
- PostgreSQL
- `@prisma/adapter-pg`
- Vitest
- A real PostgreSQL integration test database

Do not add a new framework or replace the existing stack without an explicit architectural reason and user approval.

## 4. Architecture Rules

Backend layering:

`API route → Application use case → Domain → Infrastructure / Repository → Prisma / PostgreSQL`

- Routes own HTTP transport concerns and error mapping.
- Business logic belongs in the application and domain layers.
- Prisma and PostgreSQL access belongs in infrastructure and repositories.
- Do not place Prisma queries directly in routes or `server.ts`.
- The tenant boundary is `Business`.
- Tenant-sensitive queries must include `businessId` directly where relevant.
- Cross-tenant data leakage is not acceptable.
- For concurrency-sensitive operations, use the established patterns: conditional atomic SQL or transactions with row locking.
- Application use cases must not depend on React, UI buttons, or a particular input interface.

## 5. Preserve Existing Functionality

- Do not remove existing functionality without an explicit requirement.
- Do not rewrite working architecture merely because a new tool or pattern is available.
- Integrate new functionality into the existing layers and patterns first.
- Prefer the smallest compatible change.
- Do not perform unrelated refactoring.
- Inspect an existing flow before changing it.
- Do not change approved domain semantics without an explicit decision.

## 6. Core Domain Principles

`Company` has independent dimensions:

- assessment;
- interaction stage;
- work state.

Keep these distinctions:

- `Recommendation` is not `Decision`.
- `Decision` is the user's decision.
- `Task` is not `Interaction`.
- `Interaction` is not `Outcome`.

An AI Recommendation must not independently change domain state or create a Task without the corresponding user decision and use case.

Knowledge must preserve provenance and verification semantics.

## 7. Data Integrity and Verified Facts

For production Company, Contact, and Knowledge data:

- Never invent facts.
- Never create fictional contact details.
- Never present an AI inference as a VERIFIED fact.
- Preserve source and provenance.
- Respect `verificationStatus`.
- Preserve the distinction between FACT, OBSERVATION, AI_INFERENCE, and USER_INFO where applicable.

Mock, demo, and test data are allowed only when explicitly identified as fixtures and kept separate from production data.

If a fact is not verified, represent its uncertainty instead of converting it into a confirmed fact.

## 8. Prisma and Database Rules

- Every Prisma schema change requires a migration.
- Do not rewrite previously applied migrations to alter history.
- Use the existing Prisma configuration.
- Do not create an alternative Prisma client without a concrete need.
- Preserve tenant integrity.
- Do not use destructive database operations without explicit necessity.

Test database safety:

- Integration tests use only a separate PostgreSQL test database.
- `TEST_DATABASE_URL` is mandatory for test database workflows.
- Never fall back from `TEST_DATABASE_URL` to the development `DATABASE_URL`.
- Preserve the existing test database safety guards.
- Do not use a global `TRUNCATE`.
- Use fixture-specific cleanup.
- Never run destructive tests against the development database.

## 9. Required Verification Commands

Run commands from the package they belong to.

Frontend — repository root:

- `npm run test`
- `npm run build`

There is currently no separate frontend typecheck command. TypeScript validation runs as part of the frontend build.

Backend — `backend/`:

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run prisma:validate`
- `npm run db:check`

Additional backend database and Prisma commands:

- `npm run prisma:generate`
- `npm run prisma:status`
- `npm run test:db:prepare`
- `npm run prisma:migrate`
- `npm run prisma:migrate:deploy`

Do not claim that `npm run lint` is a required successful check while no ESLint configuration is present.

Run checks appropriate to the changed scope. Do not run destructive or database commands without a concrete need.

## 10. Testing Rules

- Preserve the existing Vitest infrastructure.
- Use real PostgreSQL rather than mocks for backend integration tests that verify database, transaction, or concurrency behavior.
- Use Fastify `inject()` where it matches the existing API integration test pattern.
- Test tenant isolation and side effects for critical use cases.
- Exercise real concurrent scenarios for concurrency-sensitive flows.
- Do not change production behavior merely to simplify a test.

## 11. Secrets and Environment

- Never commit `.env`.
- Never put credentials, API keys, or passwords in `AGENTS.md`, source code, tests, or documentation.
- Use `.env.example` only for safe placeholder names and values.
- Never expose secrets in reports.

## 12. Internationalization / RU-EN

- The product's primary language is Russian.
- Part of the frontend dashboard already supports RU and EN.
- Full RU/EN localization is not yet complete.

For new user-facing functionality:

- Do not break the existing i18n architecture.
- Prefer localization keys over hardcoded UI strings where an existing i18n pattern applies.
- Do not claim that the entire product is already bilingual.

## 13. Voice-Ready Architecture

The Full Voice MVP is not currently being implemented.

New business and application commands must remain UI-independent. A single use case should eventually be callable through:

- a UI button;
- a text command;
- a voice command.

Do not place speech recognition or voice parsing inside domain or application business logic.

## 14. AI Service Layer Direction

This direction applies to new AI functionality:

- Do not couple new core business logic directly to a specific AI model.
- Place new AI functionality behind a service or interface boundary.
- Treat provider-specific implementations as adapter or infrastructure concerns.
- Keep it possible to support OpenAI or other providers without rewriting core domain and application logic.

Part of the existing frontend currently calls OpenAI directly. Do not perform a broad refactor solely to satisfy this direction. Migrate incrementally when working on the relevant flows.

## 15. Future Agent Architecture

A possible future flow is:

`Research Agent → Analysis Agent → Offer Agent → Verification Agent → User`

The first possible experiment is a Research Agent / Агент исследования компании.

- Do not build a multi-agent system prematurely.
- Do not change the current architecture to accommodate it now.
- Validate one Research Agent prototype before expanding the design.

## 16. Cursor Agents / Parallel Work

Agents may work in parallel only when tasks have clear file and scope boundaries.

Potential independent scopes include:

- Prisma and migrations;
- backend and API;
- frontend;
- tests;
- read-only review and conflict analysis.

Do not allow multiple write agents to modify the same flow or files concurrently without coordination.

Parallelism is not a reason to change the architecture.

## 17. Git and Change Control

- Do not create a commit without an explicit user instruction.
- Do not push without an explicit user instruction.
- Before committing, show or verify the exact scope of changes.
- Do not include unrelated changes.
- Do not rewrite Git history without an explicit request.
- After implementation, report changed files and verification results.

## 18. Current Known Gaps

- `README.md` is partially outdated relative to the existing backend.
- Full RU/EN localization is not complete.
- A universal AI provider abstraction is not implemented.
- Part of the frontend contains direct OpenAI integration.
- The frontend has a lint script, but no ESLint configuration was found.
- The frontend has no separate typecheck script.
- Backend integration tests run through `npm test`.

These are current facts, not instructions to fix everything immediately.

## 19. Agent Working Principle

Before implementing:

1. Inspect the existing implementation.
2. Identify the smallest compatible change.
3. Preserve approved architecture and domain semantics.
4. Implement only the requested scope.
5. Run scope-appropriate checks.
6. Report changes, tests, and risks.
7. Wait for explicit commit and push instructions.

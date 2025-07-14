# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Project Overview

This is a notification bot for the Team Mirai volunteer project that notifies about manifesto policy
updates from the main [policy repository](https://github.com/team-mirai/policy).

## Repository Structure

```
manifesto-notify-bot/
├── src/
│   ├── types/              # Type definitions
│   │   ├── api/           # API request/response types
│   │   │   └── manifesto.ts
│   │   └── models/        # Domain model types
│   │       ├── manifesto.ts
│   │       └── notification_history.ts
│   ├── handlers/          # HTTP handlers
│   │   ├── manifesto_notify.ts         # Manifesto notification handler
│   │   ├── manifesto_notify.test.ts
│   │   ├── notification_history_list.ts # Notification history list handler
│   │   └── notification_history_list.test.ts
│   ├── repositories/      # Data access layer
│   │   ├── manifesto.ts   # Manifesto repository
│   │   ├── manifesto.test.ts
│   │   ├── notification_history.ts     # Notification history repository
│   │   ├── notification_history.test.ts
│   │   └── x.ts           # X (Twitter) client
│   ├── services/          # External service integrations
│   │   ├── github.ts      # GitHub API integration
│   │   ├── github.test.ts
│   │   ├── llm.ts         # OpenAI integration
│   │   ├── llm.test.ts
│   │   ├── notification.ts # Notification service interface
│   │   └── x_notification.ts # X notification service implementation
│   ├── middleware/        # Middleware
│   │   ├── auth.ts        # Bearer authentication middleware
│   │   └── auth.test.ts
│   ├── config.ts          # Configuration management
│   ├── app.ts            # Application setup
│   └── main.ts           # Entry point
├── docs/
│   ├── architecture.md
│   └── manifesto-notify-and-registration-api.md
├── deno.json             # Deno project configuration
├── deno.lock
├── .env.example          # Environment variables sample
├── README.md
├── CONTRIBUTING.md
├── CLAUDE.md
└── LICENSE
```

## Implemented APIs

### API Endpoints

1. **Manifesto Notification API**
   - `POST /api/manifestos/notify`
   - Receives GitHub PR URL, generates summary, saves data, and sends SNS notification
   - Bearer authentication required (production environment)

2. **Notification History List API**
   - `GET /api/manifestos/notify/histories`
   - Retrieves list of notification history
   - Bearer authentication required (production environment)

3. **Manifesto List API**
   - `GET /api/manifestos`
   - Retrieves list of saved manifestos
   - Bearer authentication required (production environment)

4. **Health Check**
   - `GET /health`
   - Service health status check
   - No authentication required

## GitHub Templates and Automation

### Issue Templates

The repository provides structured issue templates in `.github/ISSUE_TEMPLATE/`:

- **Bug Report** (`bug_report.yml`): For reporting bugs with detailed reproduction steps,
  environment info, and error logs
- **Feature Request** (`feature_request.yml`): For proposing new features with priority levels and
  impact assessment

### Pull Request Template

- **File**: `.github/pull_request_template.md`
- **Language**: Japanese
- **Features**: Comprehensive checklist including build verification, testing requirements, and CLA
  agreement
- **CLA Requirement**: Contributors must agree to the Contributor License Agreement

### GitHub Actions Workflows

1. **CI Workflow** (`.github/workflows/ci.yml`)
   - Triggers: Push to main branch and pull requests
   - Actions: Code quality checks (lint, format) and test execution
   - Ensures code quality and test coverage

2. **Issue Assignment Bot** (`.github/workflows/assign-bot.yml`)
   - **Trigger**: Issue comments containing `/assign` or `/unassign`
   - **Purpose**: Allows contributors to self-assign or unassign from issues
   - **Permissions**: Requires `issues: write` permission

## Code Owners

Defined in `.github/CODEOWNERS`:

- @skanehira
- @wakanayoshizawa
- @yuki-snow1823
- @akingo55

## Development Configuration

### Dependencies

```json
{
  "imports": {
    "hono": "npm:hono@^4",
    "@std/assert": "jsr:@std/assert@^1",
    "twitter-api-v2": "npm:twitter-api-v2@^1.24.0",
    "zod": "npm:zod@^3",
    "@hono/zod-validator": "npm:@hono/zod-validator@^0.7"
  }
}
```

### Environment Variables

```bash
# Environment configuration
ENV=local|prod              # Execution environment (local/production)

# API authentication
API_TOKEN=<token>           # Bearer authentication token (required)

# OpenAI API
OPENAI_API_KEY=<key>        # OpenAI API key (required)

# GitHub API (optional)
GITHUB_TOKEN=<token>        # For private repository access

# X (Twitter) API (all required to enable)
X_API_KEY=<key>
X_API_KEY_SECRET=<secret>
X_ACCESS_TOKEN=<token>
X_ACCESS_TOKEN_SECRET=<secret>
```

### Deno Tasks

```json
{
  "tasks": {
    "dev": "deno run --unstable-kv --env-file --allow-net --allow-env --allow-read --watch src/main.ts",
    "test": "deno test --unstable-kv --allow-all",
    "check": "deno lint && deno fmt --check"
  }
}
```

### Deno Deploy Configuration

```json
{
  "deploy": {
    "project": "dad5dffa-ef78-4880-96c5-d7724fd55685",
    "exclude": ["**/node_modules"],
    "include": [],
    "entrypoint": "src/main.ts"
  }
}
```

## Architecture Patterns

### Dependency Injection Pattern

All services, repositories, and handlers are created using factory functions with injected
dependencies:

```typescript
// Example from app.ts
const llmService = createLLMService();
const githubService = createGitHubService(fetch, githubToken);
const manifestoRepo = createManifestoRepository(kvInstance);
const notifyHandler = createManifestoNotifyHandler(
  manifestoRepo,
  historyRepo,
  githubService,
  llmService,
  notificationService,
);
```

### Data Persistence with Deno KV

The project uses Deno KV for data storage with hierarchical key design:

- `["manifestos", {id}]` - Manifesto storage
- `["manifestos", "by-pr-url", {encoded_url}]` - PR URL index
- `["notifications", {id}]` - Notification history
- `["notifications", "by-manifesto", {manifesto_id}, {platform}]` - Platform-specific notifications

### Authentication Implementation

- Bearer authentication implemented as middleware
- Token validation against `API_TOKEN` environment variable
- Authentication enabled only in production (`ENV=prod`)

### Error Handling

- Consistent error response format across all endpoints
- Appropriate HTTP status codes for different error types
- Detailed error messages for debugging

## MUST Rules for Development Workflow

When working on this project, the following rules MUST be followed:

### Work Cycle

1. **One task at a time**: Work on tasks sequentially, not in parallel
2. **Create TODO.md**: Track all tasks with checkboxes in TODO.md file
3. **Verify after each task**: After completing each task, MUST run:
   - `deno task test` - Run all tests
   - `deno task lint` - Check code quality
   - `deno task fmt` - Format code
4. **Wait for approval**: After completing a task, notify completion and wait for review before
   proceeding to the next task
5. **Commit frequently**: Commit changes after each major task completion (excluding TODO.md unless
   specifically requested)

### Test-Driven Development (TDD) - MANDATORY

**ALL production code MUST be written using TDD methodology:**

1. **RED Phase (MUST)**: Write a failing test FIRST before any implementation
2. **GREEN Phase (MUST)**: Write ONLY the minimum code needed to make the test pass
3. **REFACTOR Phase (MUST)**: Improve code quality ONLY after tests are green

**Violations of TDD approach are NOT acceptable:**

- ❌ Writing production code without a failing test
- ❌ Writing more code than needed to pass the test
- ❌ Refactoring when tests are not green
- ❌ Skipping tests with the intention to "add them later"

**Remember: No test, no code. This is non-negotiable.**

### Testing Standards

- **Test Steps**: MUST use Deno's Test Steps (`t.step()`) for hierarchical test organization
  - Group related tests under main test cases
  - Use descriptive step names for better readability
  - Example: `Deno.test('Authentication', async (t) => { await t.step('Valid token', ...) })`
- **Test Naming**: Test names MUST be in Japanese for consistency
  - Use clear, descriptive names that explain the behavior being tested
  - Follow the pattern: `Feature name` → `Situation` → `Expected result`
- **Test Isolation**: Each test MUST be independent and not affect other tests
  - Use dependency injection to avoid environment variable dependencies
  - Create test-specific mock objects and data

### Code Quality Standards

- All code must pass lint checks with Deno's recommended rules
- Code formatting must follow the project's fmt configuration:
  - Single quotes for strings
  - 2 spaces indentation
  - Line width: 100 characters
- **Type Safety**: NEVER use `as` for type casting. Instead:
  - Use proper type generics for functions
  - Define explicit return types
  - Use type guards when necessary
  - Let TypeScript infer types naturally
- **Comments**: Follow "Code Tells You How, Comments Tell You Why" principle
  - Write self-documenting code with clear names and structure
  - Only add comments to explain WHY decisions were made
  - Avoid comments that describe WHAT the code does
  - Document complex business logic, edge cases, or non-obvious implementations
- **Dependencies**: NEVER use deno.land/x imports. Always use JSR (jsr:) for dependencies
  - deno.land/x is deprecated
  - JSR is the official package registry for Deno

### Code Abstraction Rules

- **Avoid Unnecessary Abstraction**: Do NOT create functions with minimal logic
  - If a function only assembles data or has trivial logic, integrate it directly
  - Only abstract when there's genuine complexity or reusability
- **Meaningful Abstractions**: Create abstractions only when they:
  - Reduce code duplication significantly
  - Encapsulate complex business logic
  - Improve testability or maintainability

### Architecture Patterns (Project-Specific)

This project follows specific patterns that MUST be maintained:

- **Dependency Injection**: Use constructor injection for all dependencies
  - Repositories, services, and external APIs must be injected
  - Never access global state or environment variables directly in business logic
- **Hono + Deno KV + OpenAI Integration**:
  - Use Hono for HTTP handling with middleware pattern
  - Deno KV for persistence with key-value structure
  - OpenAI API integration through service layer
- **Validation**: Use zod for input validation with Hono's zValidator
- **Error Handling**: Consistent error responses with proper HTTP status codes

### Environment Variables Management

- **Dependency Injection**: Environment variables MUST be read at application startup
  - Pass values through dependency injection, not environment access in business logic
  - Example: `bearerAuth(apiToken)` instead of `bearerAuth()` reading from env
- **Test Isolation**: Tests MUST NOT depend on environment variables
  - Use parameter injection to avoid test interference
  - Create test-specific configurations and mock data

## Documentation Language

All documentation in this project MUST be written in Japanese:

- README.md
- CONTRIBUTING.md
- All files in the `/docs` directory
- Code comments can remain in English for consistency with code
- Git commit messages should be in English
- Issue and PR templates should be in Japanese

## License

This project is licensed under GNU AGPL v3, which requires:

- Source code availability for network-based services
- Copyleft licensing for derivative works
- Proper attribution and license preservation

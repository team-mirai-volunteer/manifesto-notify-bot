# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Project Overview

This is a notification bot for the Team Mirai volunteer project that notifies about manifesto policy
updates from the main [policy repository](https://github.com/team-mirai/policy).

## Repository Structure

This repository is currently in its initial state with minimal files:

- `README.md` - Basic project description in Japanese
- `LICENSE` - GNU AGPL v3 license
- `.github/workflows/assign-bot.yml` - GitHub Actions workflow for issue assignment automation

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

### GitHub Actions Workflow

The repository includes an issue assignment automation workflow:

- **File**: `.github/workflows/assign-bot.yml`
- **Trigger**: Issue comments containing `/assign` or `/unassign`
- **Purpose**: Allows contributors to self-assign or unassign from issues
- **Permissions**: Requires `issues: write` permission

## Development Notes

This project appears to be in early development stages with no source code yet implemented. The
notification bot functionality for manifesto policy updates is yet to be developed.

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
  - Example: `Deno.test('認証機能', async (t) => { await t.step('正常なトークン', ...) })`
- **Test Naming**: Test names MUST be in Japanese for consistency
  - Use clear, descriptive names that explain the behavior being tested
  - Follow the pattern: `機能名` → `状況` → `期待される結果`
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

## License

This project is licensed under GNU AGPL v3, which requires:

- Source code availability for network-based services
- Copyleft licensing for derivative works
- Proper attribution and license preservation

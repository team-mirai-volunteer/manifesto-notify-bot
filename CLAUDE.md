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

## License

This project is licensed under GNU AGPL v3, which requires:

- Source code availability for network-based services
- Copyleft licensing for derivative works
- Proper attribution and license preservation

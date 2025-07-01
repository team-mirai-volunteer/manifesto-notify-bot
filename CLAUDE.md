# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a notification bot for the Team Mirai volunteer project that notifies about manifesto policy updates from the main [policy repository](https://github.com/team-mirai/policy).

## Repository Structure

This repository is currently in its initial state with minimal files:
- `README.md` - Basic project description in Japanese
- `LICENSE` - GNU AGPL v3 license
- `.github/workflows/assign-bot.yml` - GitHub Actions workflow for issue assignment automation

## GitHub Templates and Automation

### Issue Templates
The repository provides structured issue templates in `.github/ISSUE_TEMPLATE/`:
- **Bug Report** (`bug_report.yml`): For reporting bugs with detailed reproduction steps, environment info, and error logs
- **Feature Request** (`feature_request.yml`): For proposing new features with priority levels and impact assessment

### Pull Request Template
- **File**: `.github/pull_request_template.md`
- **Language**: Japanese
- **Features**: Comprehensive checklist including build verification, testing requirements, and CLA agreement
- **CLA Requirement**: Contributors must agree to the Contributor License Agreement

### GitHub Actions Workflow
The repository includes an issue assignment automation workflow:
- **File**: `.github/workflows/assign-bot.yml`
- **Trigger**: Issue comments containing `/assign` or `/unassign`
- **Purpose**: Allows contributors to self-assign or unassign from issues
- **Permissions**: Requires `issues: write` permission

## Development Notes

This project appears to be in early development stages with no source code yet implemented. The notification bot functionality for manifesto policy updates is yet to be developed.

## License

This project is licensed under GNU AGPL v3, which requires:
- Source code availability for network-based services
- Copyleft licensing for derivative works
- Proper attribution and license preservation
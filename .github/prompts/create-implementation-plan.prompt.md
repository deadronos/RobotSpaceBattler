---
mode: 'agent'
description: 'Create a new implementation plan file for new features, refactoring existing code or upgrading packages, design, architecture or infrastructure.'
tools: ['changes', 'codebase', 'editFiles', 'extensions', 'fetch', 'githubRepo', 'openSimpleBrowser', 'problems', 'runTasks', 'search', 'searchResults', 'terminalLastCommand', 'terminalSelection', 'testFailure', 'usages', 'vscodeAPI']
---

# Create Implementation Plan

## Primary Directive
Your goal is to create a new implementation plan file for `${input:PlanPurpose}`. Your output must be machine-readable, deterministic, and structured for autonomous execution by other AI systems or humans.

## Execution Context
This prompt is designed for AI-to-AI communication and automated processing. All instructions must be interpreted literally and executed systematically without human interpretation or clarification.

## Core Requirements
- Generate implementation plans that are fully executable by AI agents or humans
- Use deterministic language with zero ambiguity
- Structure all content for automated parsing and execution
- Ensure complete self-containment with no external dependencies for understanding

## Output File Specifications
- Save implementation plan files in `/plan/` directory
- Use naming convention: `[purpose]-[component]-[version].md`

## Mandatory Template Structure
Plans must consist of discrete, atomic phases containing executable tasks. Each phase must be independently processable by AI agents or humans.

Include measurable completion criteria, validation steps, and file-level references.

```md
---
goal: [Concise Title Describing the Package Implementation Plan's Goal]
version: [Optional: e.g., 1.0, Date]
date_created: [YYYY-MM-DD]
last_updated: [Optional: YYYY-MM-DD]
owner: [Optional: Team/Individual responsible for this spec]
status: 'Completed'|'In progress'|'Planned'|'Deprecated'|'On Hold'
tags: [Optional: List of relevant tags or categories]
---

# Introduction
![Status: ](https://img.shields.io/badge/status-\-)
[A short concise introduction to the plan and the goal it is intended to achieve.]

## 1. Requirements & Constraints
- **REQ-001**: Requirement 1
- **SEC-001**: Security Requirement 1
- **CON-001**: Constraint 1

## 2. Implementation Steps
### Implementation Phase 1 - GOAL-001: [Describe the goal of this phase]
| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Description

```

Ensure all front matter fields are present and sections are populated.

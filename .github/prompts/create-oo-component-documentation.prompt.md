---
mode: 'agent'
description: 'Create comprehensive, standardized documentation for object-oriented components following industry best practices and architectural documentation standards.'
tools: ['changes', 'codebase', 'editFiles', 'extensions', 'fetch', 'githubRepo', 'openSimpleBrowser', 'problems', 'runTasks', 'search', 'searchResults', 'terminalLastCommand', 'terminalSelection', 'testFailure', 'usages', 'vscodeAPI']
---

# Generate Standard OO Component Documentation

Create comprehensive documentation for the object-oriented component(s) at: `${input:ComponentPath}`. Analyze the component by examining code in the provided path. If folder, analyze all source files. If single file, treat as main component and analyze related files in same directory.

## Documentation Standards
- DOC-001: Follow C4 Model documentation levels (Context, Containers, Components, Code)
- DOC-002: Align with Arc42 software architecture documentation template
- DOC-003: Comply with IEEE 1016 Software Design Description standard
- DOC-004: Use Agile Documentation principles (just enough documentation that adds value)
- DOC-005: Target developers and maintainers as primary audience

## Analysis Instructions
- ANA-001: Determine path type (folder vs single file) and identify primary component
- ANA-002: Examine source code files for class structures and inheritance
- ANA-003: Identify design patterns and architectural decisions
- ANA-004: Document public APIs, interfaces, and dependencies
- ANA-005: Recognize creational/structural/behavioral patterns
- ANA-006: Document method parameters, return values, exceptions
- ANA-007: Assess performance, security, reliability, maintainability
- ANA-008: Infer integration patterns and data flow

## Language-Specific Optimizations
- LNG-001: **C#/.NET** - async/await, dependency injection, configuration, disposal
- LNG-002: **Java** - Spring framework, annotations, exception handling, packaging
- LNG-003: **TypeScript/JavaScript** - modules, async patterns, types, npm
- LNG-004: **Python** - packages, virtual environments, type hints, testing

## Error Handling
- ERR-001: Path doesn't exist - provide correct format guidance
- ERR-002: No source files found - suggest alternative locations
- ERR-003: Unclear structure - document findings and request clarification
- ERR-004: Non-standard patterns - document custom approaches
- ERR-005: Insufficient code - focus on available information, highlight gaps

## Output Format

Generate well-structured Markdown with clear heading hierarchy, code blocks, tables, bullet points, and proper formatting for readability and maintainability.

## File Location

The documentation should be saved in the `/docs/components/` directory and named according to the convention: `[component-name]-documentation.md`.

## Required Documentation Structure

The documentation file must follow the template below, ensuring that all sections are filled out appropriately. The front matter for the markdown should be structured correctly as per the example following:

```md
---
title: [Component Name] - Technical Documentation
component_path: `${input:ComponentPath}`
version: [Optional: e.g., 1.0, Date]
date_created: [YYYY-MM-DD]
last_updated: [Optional: YYYY-MM-DD]
owner: [Optional: Team/Individual responsible for this component]
tags: [Optional: List of relevant tags or categories]
---

# [Component Name] Documentation

[A short concise introduction to the component and its purpose within the system.]

## 1. Component Overview

### Purpose/Responsibility
- OVR-001: State component's primary responsibility
- OVR-002: Define scope (included/excluded functionality)
- OVR-003: Describe system context and relationships

## 2. Architecture Section
- ARC-001: Document design patterns used
- ARC-002: List internal and external dependencies with purposes
- ARC-003: Document component interactions and relationships
- ARC-004: Include visual diagrams (UML class, sequence, component)
- ARC-005: Create mermaid diagram showing component structure, relationships, and dependencies

## 3. Public API Reference
- List public classes, methods, parameters, return types, and examples

## 4. Data Flow & Integration
- Show how data moves through the component and interacts with external systems

## 5. Performance & Scalability Considerations

## 6. Security Considerations

## 7. Tests & Validation

## 8. Migration & Compatibility Notes

```

Fill all sections with concrete examples, code snippets, and references to the exact files and line numbers where relevant.

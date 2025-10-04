# .github/prompts

This folder contains the repository's SpecKit prompts and small agent-facing helpers.

## Purpose

These prompts are human-written instructions used by the SpecKit workflow and by
automated agents that assist with planning, clarifying, and implementing feature
specs. The files are intended to be both human- and machine-readable.

## Filename patterns

- Prompt files should use the pattern `*.prompt.md` (for example
  `implement.prompt.md` or `plan.prompt.md`).
- Other files in this folder may be helpers or legacy prompts.

## Machine-friendly cues

To make automatic discovery simple, prompt files should include one of the following at
the top of the file:

1. YAML front matter with a `prompt:` field, for example:

```yaml
---
prompt: implement
category: speckit
description: "Implementation prompt for feature specs"
---
```


1. Or a single-line comment tag at the top of the file containing the word
  `prompt:`, for example:

```html
<!-- prompt: implement -->
```

## Search heuristics for automated agents

Agents can use the following heuristics (in order) to reliably find prompts:

1. Glob the folder for `*.prompt.md`.
2. If there are no hits, read each file in the folder and look for YAML front matter
   containing `prompt:`.
3. Fallback: grep for the substring `prompt:` anywhere in file contents.

### Example search queries

- glob: `.github/prompts/*.prompt.md`
- grep: `^prompt:\s` (YAML front-matter key)
- grep: `prompt:` (fallback)

## Recommended quick manifest

For machines that prefer a single lookup, you can create a tiny `prompts.json` mapping
names to files. Example format:

```json
{
  "implement": "implement.prompt.md",
  "plan": "plan.prompt.md",
  "tasks": "tasks.prompt.md"
}
```

## Notes for contributors

- Keep filenames stable and descriptive.
- Add a short `description:` in YAML front matter so both humans and tools can quickly
  understand the prompt intent.
- Avoid embedding large data blobs in prompts; reference spec files under `specs/` where
  possible.

If you want me to generate `prompts.json` automatically from existing files or to append a
short search-hints section to `AGENTS.md`, say the word and I'll create those small repo
changes.

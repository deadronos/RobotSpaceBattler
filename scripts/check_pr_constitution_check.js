#!/usr/bin/env node
// Validate that a PR body contains a CONSTITUTION-CHECK section.
// Usage: set env PR_BODY to the pull request body text.

const body = process.env.PR_BODY || '';

function hasConstitutionCheck(text) {
  if (!text) return false;
  // Accept headings like 'CONSTITUTION-CHECK', 'Constitution Check', 'CONSTITUTION-CHECK:'
  const regex = /(^|\n)\s*(#{1,6}\s*)?CONSTITUTION[- ]CHECK\b/i;
  return regex.test(text);
}

if (!process.env.GITHUB_EVENT_PATH && !process.env.PR_BODY) {
  console.log('No PR body provided; skipping check (this script is intended for pull_request events).');
  process.exit(0);
}

if (hasConstitutionCheck(body)) {
  console.log('PR contains CONSTITUTION-CHECK section.');
  process.exit(0);
} else {
  console.error('\nCONSTITUTION CHECK MISSING: Pull request body must include a `CONSTITUTION-CHECK` section.');
  console.error('Example:');
  console.error('## CONSTITUTION-CHECK\n- File-size: this change keeps files <= 300 LOC or includes decomposition plan\n- Tests: TDD evidence included (tests added and failing)\n- r3f: render vs simulation separation maintained (if applicable)\n');
  process.exit(1);
}

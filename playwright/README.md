Playwright test to record pause/unpause spawn sequence

How to run locally:

1) Install browsers & playwright (if not already):

   npm run playwright:install

2) Run the dev server in one shell (default port 5173):

   npm run dev

3) In another shell, run the test to record:

   npx playwright test playwright/tests/record-pause-unpause.spec.ts --project=chromium --headed

4) After the test runs, the video artifact will be available in the Playwright results
   directory (playwright-report or test-results depending on your config). You can view
   the report with:

   npx playwright show-report

Notes:
- The script expects the app to run on http://localhost:5173. Adjust the URL in the test
  file if you run on a different port.
- Run the dev server as a separate step; this repo's dev server didn't start in this CI
  environment due to native module locking/permissions.

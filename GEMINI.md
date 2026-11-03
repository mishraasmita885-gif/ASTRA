# ASTRA Mission Control — Agent Rules & Operating Guidelines

## 1. Version Control & Remote Repository Policy (CRITICAL)
- **NEVER push changes to the remote Git repository (`git push`) until and unless the user explicitly asks for it.**
- You may edit files, make local changes, and prepare commits if requested, but remote push operations (`git push origin ...`) are strictly prohibited without direct, affirmative instruction from the user.

## 2. Automated Verification & Testing Policy
- **Do not perform any automated verification, test runs, or command executions for development purposes unless explicitly asked by the user.**
- Avoid running test suites, background polling scripts, or automated curls unless specifically requested.

## 3. Design System & UI Contrast Standards
- Strictly adhere to the Swiss Neo-Brutalist design tokens:
  - Canvas: `#f7f4ee`
  - Cards: `#ebdccb`
  - Accent / Warnings: `#fea619`
  - Borders & Shadows: `2px solid #452a19` with `2px 2px 0px #452a19` drop shadows
- Always enforce high-contrast typography locks: text inside cards, buttons, and dropdowns must never render white or low-contrast against light/cream backgrounds.

## 4. Documentation & Reporting Integrity
- When new features or pages are implemented, keep `MASTER_REPORT.md` updated with technical architectural details and endpoint specifications.


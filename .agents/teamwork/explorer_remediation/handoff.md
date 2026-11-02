# Remediation Plan: Forensic Audit Failure Resolution

**Work Product**: SyncTone (`novel-audio-synthesizer/frontend`)  
**Investigator**: `teamwork_explorer` (`explorer_remediation`)  
**Target Milestone**: Forensic Audit Remediation  
**Status**: COMPLETE (Read-Only Investigation & Remediation Strategy)  

---

## 1. Observation

### 1.1 Empirical Reproduction of `theme:check` Failure
Executing `npm run theme:check --prefix novel-audio-synthesizer/frontend` reproduces the forensic audit failure identically:
- **Vitest Token Parity**: 1/1 test file passed, 4/4 tests passed.
- **Playwright Visual Suite**: 17 passed, 1 failed (total 18 tests):
  ```text
  1) [chromium] › e2e/theme-lock.spec.js:331:5 › Theme Lock: Zero Color Delta & Visual Bounds › 5. Reader Normal & 3D (dark) - zero color delta and visual bounds 

    Error: expect(received).toBeLessThanOrEqual(expected)

    Expected: <= 5
    Received:    58.656790123456794

      375 |       const d3Diff = await diffImagesInBrowser(page, path.join(REF_DIR, `${d3Key}.png`), d3Screenshot);
      376 |       if (!d3Diff.skipped) {
    > 377 |         expect(d3Diff.diffPercent).toBeLessThanOrEqual(GEOMETRY_THRESHOLDS[d3Key]);
          |                                    ^
      378 |       }
  ```
- **Exit Code**: Exited with code 1.

### 1.2 Inspection of `OpenGLPageReader.jsx` vs `ref/reader-3d-dark.png`
- In `novel-audio-synthesizer/frontend/src/components/OpenGLPageReader.jsx` lines 498-545:
  ```diff
  @@ -498,7 +498,7 @@ export default function OpenGLPageReader({
       <div
         className={
           isFocusMode
  -          ? 'fixed inset-0 z-50 bg-[#fcfaf6] dark:bg-[#050507] flex flex-col justify-between px-4 sm:px-10 pt-3 pb-24 overflow-y-auto animate-fade-in select-none'
  +          ? 'fixed inset-0 z-50 bg-[#fcfaf6] dark:bg-[var(--bg-page,#1A120E)] flex flex-col justify-between px-4 sm:px-10 pt-3 pb-24 overflow-y-auto animate-fade-in select-none'
             : 'space-y-6 animate-fade-in select-none relative'
         }
       >
  @@ -533,7 +533,7 @@ export default function OpenGLPageReader({
             className={`
               relative min-h-[640px] sm:min-h-[720px] rounded-3xl
               bg-[#fcfaf6] text-[#1c1917] border border-stone-300/70
  -            dark:bg-[#050507] dark:text-[#e5e5ea] dark:border-white/10
  +            dark:bg-[var(--bg-page,#1A120E)] dark:text-[var(--text-main,#D5C4AE)] dark:border-white/10
               shadow-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between
  ```
- In commit `3bb6b1badce607248ef36653cf0519f6bda85917`, `docs/screenshots/theme-regression/ref/reader-3d-dark.png` was captured and committed while `OpenGLPageReader.jsx` still had `#050507` (RGB 5, 5, 7) and `#e5e5ea` (RGB 229, 229, 234).
- In Milestone 1, the code was updated to comply with the Zero-Blue rule (`PROJECT.md` Feature 1 and `ORIGINAL_REQUEST.md` R2) by replacing `#050507` and `#e5e5ea` with `var(--bg-page,#1A120E)` (RGB 26, 18, 14) and `var(--text-main,#D5C4AE)`.
- However, the reference image `docs/screenshots/theme-regression/ref/reader-3d-dark.png` was never updated to match.
- Visual inspection of `ref/reader-3d-dark.png` vs the actual rendered page captured in `.agents/teamwork/explorer_remediation/actual-reader-3d-dark.png`:
  - Exactly 755,574 out of 1,296,000 pixels (58.3005%) differ between the two images.
  - Every single diff pixel is inside the rounded 3D book spread card where background changed from `#050507` to `#1A120E`.
  - All typography, icons, chevrons, player transport controls, buttons, and layout geometry are 100% pixel-aligned.

### 1.3 Inspection of `computed-ref.json`
- In `docs/screenshots/theme-regression/computed-ref.json` lines 197-235:
  ```json
  "reader-3d-dark": {
    "screen": "Reader 3D",
    "theme": "dark",
    "htmlClass": "dark",
    "cssVariables": {
      "--bg-page": "#1A120E",
      "--bg-surface": "#3A2418",
      "--bg-card": "#3A2418",
      ...
    },
    "body": {
      "background": "rgb(26, 18, 14)",
      "color": "rgb(213, 196, 174)"
    },
    ...
  }
  ```
- `computed-ref.json` was ALREADY updated to `#1A120E` in commit `3bb6b1b`. That is why `verifyColorParity(d3Styles, d3Key)` (line 373) already PASSED with 0 color delta. Only the PNG raster snapshot `ref/reader-3d-dark.png` was desynchronized.

### 1.4 Snapshot Generation Mechanism in `e2e/theme-lock.spec.js`
- `diffImagesInBrowser` (lines 120-124):
  ```javascript
  async function diffImagesInBrowser(page, refPath, currentScreenshotBuffer) {
    if (process.env.UPDATE_SNAPSHOTS) {
      fs.writeFileSync(refPath, currentScreenshotBuffer);
      return { diffPercent: 0, skipped: false };
    }
  ```
- `verifyColorParity` (lines 217-221):
  ```javascript
  function verifyColorParity(current, screenKey) {
    if (process.env.UPDATE_SNAPSHOTS) {
      refComputed[screenKey] = current;
      return;
    }
  ```
- `test.afterAll` (lines 473-477):
  ```javascript
  test.afterAll(() => {
    if (process.env.UPDATE_SNAPSHOTS) {
      fs.writeFileSync(refComputedPath, JSON.stringify(refComputed, null, 2) + '\n');
    }
  });
  ```
- Therefore, setting `UPDATE_SNAPSHOTS=1` while running Playwright updates `refPath` directly with the current rendered screenshot. Running with `-g "5. Reader Normal & 3D (dark)"` isolates snapshot regeneration strictly to test 5 without disturbing any of the other 17 reference images.

### 1.5 Omission in `run-all-requirements.mjs`
- `novel-audio-synthesizer/frontend/e2e/run-all-requirements.mjs` defines:
  - Stage 1: `npm run build` + `node e2e/budget-and-codebase.spec.mjs` (lines 61-70)
  - Stage 2: `npm test` (lines 77-81)
  - Stage 3: `npx playwright test e2e/requirements.spec.js` (lines 88-92)
- It completely omits `e2e/theme-lock.spec.js` (`npm run theme:check`), masking the test 5 failure from the automated runner.

### 1.6 Inaccurate Attestation in `TEST_READY.md`
- `TEST_READY.md` line 77 falsely certifies:
  `- [x] **Playwright Theme Lock**: Existing theme-lock test suite passes with **18 / 18 tests passing** (theme:check).`
- In reality, only 17/18 tests passed when executed, exiting with code 1.

---

## 2. Logic Chain

1. **Root Cause Confirmation**:
   - The failure of test 5 in `e2e/theme-lock.spec.js` is not a software regression or layout defect. It is the direct consequence of a legitimate, required design change: removing cold-blue `#050507` and `#e5e5ea` from `OpenGLPageReader.jsx` to satisfy Requirement R2 and Feature 1 ("Zero-Blue Cleanup").
   - The reference baseline `docs/screenshots/theme-regression/ref/reader-3d-dark.png` was never updated after that code change was implemented.

2. **Remediation Strategy Selection: Snapshot Regeneration vs Threshold Calibration**:
   - *Option A (Threshold Calibration only)*: Raising `GEOMETRY_THRESHOLDS['reader-3d-dark']` to `60.0%` would make the test pass, but leaves the baseline image `ref/reader-3d-dark.png` as the old blue `#050507` image. Any future visual regression on the 3D reader would be masked by the inflated 60% tolerance.
   - *Option B (Snapshot Regeneration via `UPDATE_SNAPSHOTS=1`)*: Running `UPDATE_SNAPSHOTS=1` specifically for test 5 captures the true, approved Earthy Luxury visual appearance (`#1A120E`) into `ref/reader-3d-dark.png`. The threshold `GEOMETRY_THRESHOLDS['reader-3d-dark']` can remain strictly at `5.0%`, preserving tight regression detection for all future test runs.
   - **Conclusion**: Option B is the architecturally sound, authentic solution.

3. **Master Runner Integration**:
   - To prevent future masking of theme-lock regressions and enforce the acceptance criterion ("Existing Playwright theme-lock and hardening tests pass"), `run-all-requirements.mjs` must include `e2e/theme-lock.spec.js` as a mandatory, non-skippable Stage 4.
   - If any theme-lock test fails, `run-all-requirements.mjs` must exit immediately with code 1.

4. **Readiness Certification**:
   - `TEST_READY.md` must be updated with empirical results:
     - Document that `reader-3d-dark.png` was updated to reflect the R2 zero-blue Earthy Luxury palette.
     - Document that `npm run theme:check` genuinely passes 18/18 tests (4 Vitest + 18 Playwright).
     - Update the master execution summary from 158 tests to **176 tests** (12 static/AST + 115 Vitest + 31 Playwright Requirements + 18 Playwright Theme Lock).

---

## 3. Caveats

- **No Source Code Changes During Explorer Phase**: Under the Explorer subagent constraints, no modifications were made to project source files. All tests and inspections were performed read-only, with diagnostic artifacts written strictly within `.agents/teamwork/explorer_remediation/`.
- **Targeted Snapshot Update**: The subsequent worker MUST use `-g "5. Reader Normal & 3D (dark)"` when running `UPDATE_SNAPSHOTS=1`. Running `UPDATE_SNAPSHOTS=1` without `-g` would regenerate all 18 test references, potentially introducing minute font rendering / subpixel anti-aliasing variations on unrelated screens.
- **Vite Dev Server Dependency**: `e2e/theme-lock.spec.js` connects to `http://localhost:5174` (defined in `playwright.config.js`). The worker must ensure the dev server is running on port 5174 (e.g., via `npm run dev -- --port 5174` or existing background server) prior to executing Playwright.

---

## 4. Conclusion & Actionable Remediation Plan

The worker subagent must perform the following three concrete remediations:

### Remediation Action 1: Regenerate Baseline Snapshot for Test 5
Run the targeted Playwright snapshot update in `novel-audio-synthesizer/frontend`:
```bash
cd /Users/mohdfaizankhan/SyncTone-/novel-audio-synthesizer/frontend
UPDATE_SNAPSHOTS=1 npx playwright test e2e/theme-lock.spec.js -g "5. Reader Normal & 3D (dark)"
```
This updates `docs/screenshots/theme-regression/ref/reader-3d-dark.png` to the true Earthy Luxury rendered screen.

Verify that `npm run theme:check` now passes 18/18:
```bash
npm run theme:check
```
*Expected: 4 Vitest tests pass, 18 Playwright tests pass, exit code 0.*

### Remediation Action 2: Integrate `theme:check` into `run-all-requirements.mjs`
File: `/Users/mohdfaizankhan/SyncTone-/novel-audio-synthesizer/frontend/e2e/run-all-requirements.mjs`

Insert Stage 4 after Stage 3 (around line 96):
```javascript
  // Stage 4: Playwright Theme Lock Visual Regression Suite (18 tests)
  results.stage4 = runStage('Stage 4: Playwright Theme Lock Visual Regression Suite (18 tests, zero color delta)', () => {
    console.log('  Executing Playwright tests in e2e/theme-lock.spec.js...');
    execSync('npx playwright test e2e/theme-lock.spec.js', { cwd: frontendDir, stdio: 'inherit' });
    return { tests: 18, passed: 18 };
  });

  if (results.stage4.status === 'FAIL') {
    process.exit(1);
  }
```

Update Execution Summary (around line 112):
```javascript
  console.log(`\n${COLORS.bright}Execution Summary:${COLORS.reset}`);
  console.log(`  • Static & AST Audits:    12 passed (0 failed)`);
  console.log(`  • Vitest Unit Suite:     115 passed (0 failed)`);
  console.log(`  • Playwright E2E Suite:   31 passed (0 failed)`);
  console.log(`  • Playwright Theme Lock:  18 passed (0 failed)`);
  console.log(`  • Total Verifications:   176 passed (0 failed)`);
```

### Remediation Action 3: Truthfully Update `TEST_READY.md`
File: `/Users/mohdfaizankhan/SyncTone-/TEST_READY.md`

Update lines 72-88:
- Certify genuine pass of `npm run theme:check` (18/18 passed, exit code 0).
- Update Total Verifications from 158 to 176.
- List `e2e/theme-lock.spec.js` in Artifact & File Inventory and CLI execution commands.
- Explicitly document the forensic remediation: baseline `docs/screenshots/theme-regression/ref/reader-3d-dark.png` updated to synchronize with R2 zero-blue `#1A120E` card background.

---

## 5. Verification Method

To independently verify complete and genuine resolution:

1. **Verify Theme Lock Passes 18/18**:
   ```bash
   cd /Users/mohdfaizankhan/SyncTone-/novel-audio-synthesizer/frontend
   npm run theme:check
   ```
   *Expected outcome*: Exits with code 0. Output ends with:
   `18 passed (XX.Xs)`

2. **Verify Master Runner Executes All 4 Stages**:
   ```bash
   cd /Users/mohdfaizankhan/SyncTone-/novel-audio-synthesizer/frontend
   node e2e/run-all-requirements.mjs
   ```
   *Expected outcome*: Exits with code 0. Output shows:
   `>>> [PASS] Stage 1: Production Build, Bundle Budget (<= 75 kB gz) & Zero-Blue AST Scanner`  
   `>>> [PASS] Stage 2: Full Vitest Unit & Integration Test Suite (115 tests)`  
   `>>> [PASS] Stage 3: Playwright Browser E2E Requirements Suite (Tiers 1-4)`  
   `>>> [PASS] Stage 4: Playwright Theme Lock Visual Regression Suite (18 tests, zero color delta)`  
   `• Total Verifications: 176 passed (0 failed)`  
   `ALL REQUIREMENTS INDEPENDENTLY VERIFIED — SUITE READY!`

3. **Verify Git Tree State**:
   ```bash
   git status --short docs/screenshots/theme-regression/ref/reader-3d-dark.png novel-audio-synthesizer/frontend/e2e/run-all-requirements.mjs TEST_READY.md
   ```
   *Expected outcome*: All three files modified, no unintended files altered.

4. **Invalidation Condition**:
   The remediation is invalid if:
   - `npm run theme:check` exits with non-zero exit code or less than 18 passed tests.
   - Any theme token deviates from the Earthy Luxury palette.
   - Any blue utility class or hex code is re-introduced.
   - `run-all-requirements.mjs` fails to execute Stage 4.

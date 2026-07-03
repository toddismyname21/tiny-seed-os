## VERIFICATION REPORT: soil-tests.html — Logan Labs Feature
Date: 2026-03-09
Requested by: User

### Evidence Collected

1. **LOGAN_LABS constant defined and all test types have valid prices** — PASS
   - Defined at line 2642. Seven test types: `mehlich3` ($25), `basePlus` ($30), `agDyn3` ($35), `saturatedPaste` ($25), `complete` ($60), `tissue` ($60), `water` ($83). All have `price` (number) and `name` (string) fields. `recommendationsCost: 30` also present.

2. **`loganLabsSubmitModal` div exists in the HTML** — PARTIAL / CONDITIONAL
   - The div with `id="loganLabsSubmitModal"` exists at line 9391 ONLY inside the `renderTissueTests()` function's template literal, injected into `#testsContainer` as innerHTML. It is NOT in the static HTML body. It only exists in the DOM when `currentTab === 'tissueTests'`.
   - **ISSUE (see below).**

3. **`showLoganLabsSubmitForm()` references valid DOM elements that exist** — FAIL
   - Lines 8257-8371. The function immediately does `const modal = document.getElementById('loganLabsSubmitModal')` at line 8258, then sets `modal.innerHTML = ...`.
   - The function is called from the header "Soil Test Forms" dropdown (line 544), which is always visible regardless of active tab.
   - If any tab other than "tissueTests" is active when the user clicks "Submit to Logan Labs", `modal` will be `null` and `modal.innerHTML = ...` will throw `TypeError: Cannot set properties of null`.
   - All other form element IDs (`loganCollectionDate`, `loganCollector`, `loganRecommendations`, `loganNotes`, `loganTotalCost`, `loganLabsForm`, `loganSamples`) are injected dynamically inside `showLoganLabsSubmitForm()`'s modal innerHTML — those are fine, they exist after the modal is populated.

4. **`submitSoilSampleToLogan()` correctly reads form data** — PASS
   - Lines 8452-8493. Reads `sampleId_N`, `field_N`, `crop_N`, `depth_N`, `test_N` via `loganLabsForm.querySelector()`. Also reads `loganCollectionDate`, `loganCollector`, `loganRecommendations`, `loganNotes` via `getElementById`. All these IDs are injected by `showLoganLabsSubmitForm()` before the form is ever submitted. Safe.

5. **`generateLoganLabsSubmissionPDF()` properly references LOGAN_LABS constant fields** — PASS
   - Lines 8495-8684. References `LOGAN_LABS.tests[s.testPackage]?.price`, `LOGAN_LABS.tests[s.testPackage]?.name`, `LOGAN_LABS.recommendationsCost`, `LOGAN_LABS.name`, `LOGAN_LABS.address`, `LOGAN_LABS.city`, `LOGAN_LABS.state`, `LOGAN_LABS.zip`, `LOGAN_LABS.phone`, `LOGAN_LABS.tollFree`, `LOGAN_LABS.email`, `LOGAN_LABS.website`. All fields exist in the constant. Optional chaining (`?.`) used on test lookups.

6. **`pendingSoilSubmissions` variable properly initialized** — PASS
   - Line 2667: `let pendingSoilSubmissions = JSON.parse(localStorage.getItem('pendingSoilSubmissions') || '[]');` — correct, initializes from localStorage or empty array.

7. **`showParsePreview()` still works — "Save All Samples" button and related functions exist** — PASS
   - Lines 1283-1335. Function exists. "Save All Samples" button renders at line 1323 via `onclick="saveAllParsedSamples()"`. `cancelParse()` and `editParsedSample()` also referenced and exist.

8. **`saveAllParsedSamples()` references `linkToSubmission` select that exists in parse preview** — PASS
   - `linkToSubmission` select is injected at line 1313 inside `showParsePreview()` when `pendingLL.length > 0`. `saveAllParsedSamples()` at line 1348 uses `document.getElementById('linkToSubmission')` with a null guard (`linkSelect ? ...`). Safe — if no pending submissions, the select is not rendered and `linkSelect` will be null, handled gracefully.

9. **Header dropdown HTML `soilFormDropdown` is properly structured** — PASS
   - Lines 541-553. Button toggles display of `#soilFormDropdown`. Dropdown contains two items: "Submit to Logan Labs" (calls `showLoganLabsSubmitForm()`) and "Print Blank Collection Form" (calls `printBlankSoilTestForm()`). Both close the dropdown after click. HTML is valid — opening `<div id="soilFormDropdown">` at line 543 is closed at line 552.

10. **`Content-Type: text/plain` in `saveSoilTestData()`** — PASS
    - Line 1971: `headers: { 'Content-Type': 'text/plain' }` confirmed. Note: two other fetch calls in the file still use `application/json` (`createTask` at line 6644, `syncComplianceRecords` at line 7797) — these are separate functions and outside scope of this change.

11. **No orphaned element references — getElementById targets exist or are dynamically created** — PASS (with one exception noted in item 3)
    - All static `getElementById` targets (`uploadZone`, `pdfInput`, `parsePreview`, `testsContainer`, `detailModal`, `entryModal`, `toast`, `soilTestForm`, `testDate`, `sampleLocation`, etc.) are present in the static HTML.
    - All Logan Labs modal element IDs are injected by `showLoganLabsSubmitForm()` before any code references them.
    - The single failure point is `loganLabsSubmitModal` itself — see item 3.

12. **`getPendingSoilSubmissions()` exists and is valid** — PASS
    - Lines 8687-8689. Single-line filter: `return pendingSoilSubmissions.filter(s => s.status === 'pending')`. Valid.

13. **`linkSoilTestToSubmission()` exists and is valid** — PASS
    - Lines 8691-8701. Finds submission by id, pushes soilTestId, marks complete when all samples linked, saves to localStorage.

14. **`reprintLoganSubmission()` exists and is valid** — PASS
    - Lines 8703-8706. Finds submission by id, calls `generateLoganLabsSubmissionPDF(sub)`.

15. **`updateLoganCostEstimate()` exists and is valid** — PASS
    - Lines 8434-8450. Iterates `.logan-sample-row` elements, sums prices via `LOGAN_LABS.tests[testKey]?.price`. Adds `recommendationsCost` if checkbox checked. Uses null guards throughout.

16. **`addLoganSampleRow()` exists and is valid** — PASS
    - Lines 8379-8432. Creates new sample row, appends to `#loganSamples` (which is inside the modal innerHTML — only accessible after modal is open). Valid.

17. **`closeLoganLabsModal()` exists and is valid** — PASS
    - Lines 8373-8375. Sets `document.getElementById('loganLabsSubmitModal').style.display = 'none'`. This will also crash if called when modal is not in DOM, but it is only called from within the modal's submit handler and cancel button — both of which execute only after the modal was successfully opened.

18. **Brace balance check** — PASS
    - Python brace count: all 5 script blocks balanced. Main script block: 2950 matched `{}`/`}` pairs.

---

### Verdict: PARTIAL

---

### Issues Found

**CRITICAL — BUG: `loganLabsSubmitModal` not in static DOM**
- File: `/Users/samanthapollack/Documents/TIny_Seed_OS/soil-tests.html`
- Lines: 8258 (JS reference), 9391 (only HTML definition — inside `renderTissueTests()` innerHTML)
- Description: `document.getElementById('loganLabsSubmitModal')` returns `null` on any tab except "tissueTests". The header dropdown "Submit to Logan Labs" button is always visible, so clicking it from the Soil Tests, Amendments, Database, Compliance, Insights, Plant Doctor, Foliar Program, Fertigation, IPM Toolkit, or Inventory tabs will cause an immediate `TypeError: Cannot set properties of null (setting 'innerHTML')`.
- Fix required: Move `<div id="loganLabsSubmitModal" ...></div>` to the static HTML body (before `</body>`), outside of `renderTissueTests()`. The `showLoganLabsSubmitForm()` function already sets `display: flex` on it after populating, so it just needs to exist in the DOM at page load.

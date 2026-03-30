# High Level Design (HLD) - Scene Summariser Integration (CR002)

## Problem Statement
EchoChamber currently relies on SillyTavern's default summarization (stored in message `extra.memory`). If a user uses the "Scene Summariser" extension, EchoChamber should ideally use its more advanced, formatted output to provide better context for the fake chat generation.

## Proposed Solution
Detect the presence of the `Scene Summariser` extension via `window.SceneSummariser`. If detected:
1.  Update UI labels to reflect that the summary is being sourced from "Scene Summarizer".
2.  Use the `window.SceneSummariser.getCurrentSummary()` API to retrieve the context for the generator.

## Technical Details

### Detection Logic
Use `typeof window.SceneSummariser !== 'undefined'` to check for the extension.

### UI Updates
-   Target the `<span>` with text `Summary (from Summarize ext.)` and replace it with `Summary (from Scene Summarizer ext.)`.
-   This applies to both the main settings panel (from `settings.html`) and the settings modal (from `src/ui/settings.js`).

### Generator Updates
-   In `src/core/generator.js`, if `state.settings.includeSummary` is true and `window.SceneSummariser` exists, call `window.SceneSummariser.getCurrentSummary()` and add its output to `systemContextParts`.
-   Fall back to the existing `extra.memory` logic if `Scene Summariser` is not available.

## Impact Analysis
-   **Context Quality**: Improved context for EchoChamber when using Scene Summariser.
-   **User Experience**: Clearer indication of where the summary data is coming from.
-   **Compatibility**: No impact on users not using Scene Summariser.

## Questions for the User
1.  Should we use a different tag than `<summary>` when using Scene Summariser? (The request says "replace the current summary inclusion", which might imply changing the tag or just the label/source).*user* no
2.  If Scene Summariser is present but returns an empty string, should we fall back to the default SillyTavern summary?*user* no

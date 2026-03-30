# Implementation Plan - Scene Summariser Integration (CR002)

## Overview
This plan details the steps for integrating Scene Summariser's public API into EchoChamber for better context generation.

## Proposed Steps

### Step 1: Update Generator Context Logic
Modify `src/core/generator.js` in `SillyTavern-EchoChamber`.

```javascript
    if (state.settings.includeSummary) {
        try {
            // Check for Scene Summariser API
            if (typeof window.SceneSummariser !== 'undefined' && typeof window.SceneSummariser.getCurrentSummary === 'function') {
                const summary = window.SceneSummariser.getCurrentSummary();
                if (summary) {
                    systemContextParts.push(`<summary>\n${summary}\n</summary>`);
                    log('Added summary from Scene Summariser API');
                } else {
                    // Fall back to default if Scene Summariser returns empty
                    const chatWithSummary = context.chat?.slice().reverse().find(m => m.extra?.memory);
                    if (chatWithSummary?.extra?.memory) {
                        systemContextParts.push(`<summary>\n${chatWithSummary.extra.memory}\n</summary>`);
                    }
                }
            } else {
                // Original logic for default summarizer
                const memorySettings = context.extensionSettings?.memory;
                if (memorySettings) {
                    const chatWithSummary = context.chat?.slice().reverse().find(m => m.extra?.memory);
                    if (chatWithSummary?.extra?.memory) {
                        systemContextParts.push(`<summary>\n${chatWithSummary.extra.memory}\n</summary>`);
                    }
                }
            }
        } catch (e) { log('Could not get summary:', e); }
    }
```

### Step 2: Update UI Labels Dynamically
Update `index.js` (or a UI-related module) to check for Scene Summariser and update labels on initialization.

```javascript
function updateSummaryLabels() {
    if (typeof window.SceneSummariser !== 'undefined') {
        const searchText = "Summary (from Summarize ext.)";
        const newText = "Summary (from Scene Summarizer ext.)";
        
        // Update main settings panel (inline drawer)
        jQuery('.ec-s-panel .ec-s-label-text').each(function() {
            if (jQuery(this).text().trim() === searchText) {
                jQuery(this).html(jQuery(this).html().replace(searchText, newText));
            }
        });

        // Update settings modal labels
        jQuery('#ec_settings_modal .ecm_label').each(function() {
             if (jQuery(this).text().trim() === searchText) {
                jQuery(this).html(jQuery(this).html().replace(searchText, newText));
            }
        });
    }
}
```

### Step 3: Verification
1.  Verify Scene Summariser is active and has a summary generated.
2.  Open EchoChamber settings and confirm the label is updated to "Summary (from Scene Summarizer ext.)".
3.  Generate an EchoChamber chat and confirm it uses the Scene Summariser's output (can be verified by checking browser console for 'Added summary from Scene Summariser API').

## Rollback Plan
Revert changes in `src/core/generator.js` and `index.js`.

# Implementation Plan - Flexible System Prompts and Style Types (CR003)

## Overview
This plan outlines the steps for refactoring system prompts and introducing style types in EchoChamber.

## Proposed Steps

### Step 1: Update Constants and Default Settings
Modify `src/constants.js`:
-   Update `BUILT_IN_STYLES` to include `type: 'chat stream'`.
-   Add `systemPromptChatStream` and `systemPromptAssistant` to `defaultSettings`.

### Step 2: Refactor Generator Prompt Building and Parsing
Modify `src/core/generator.js`:
-   In `generateDiscordChat` and `generateSingleReply`, identify the style's type.
-   Replace the hardcoded `systemMessage` with a version built from settings using `buildPromptFromTemplate`.
-   Implement variable replacement for all supported macros.
-   Update output parsing logic:
    -   For `'chat stream'` styles: Maintain line-by-line message splitting.
    -   For `'assistant'` styles: Treat the entire LLM output as a single message from the character.

### Step 3: Update Settings UI
Modify `settings.html`:
-   Add two new textareas under the Generation Engine section for the base prompts.
-   Add "Reset to Default" buttons next to each textarea.

Modify `src/ui/settings.js`:
-   Update `loadSettings` and `syncModalFromSettings` to handle the new prompt fields.
-   Add event listeners to sync changes from the textareas to the settings object.

Modify `src/ui/components.js`:
-   Add event listeners for the reset buttons to restore values from `defaultSettings`.

Modify `style.css`:
-   Add styling for label rows and reset buttons to ensure proper alignment.

### Step 4: Update Style Editor
Modify `src/ui/styleEditor.js`:
-   Add a dropdown/toggle to select the style's type (Chat Stream / Assistant).
-   Update `saveStyleFromEditor` to save the type.
-   Update `selectStyleInEditor` to display and allow editing the type for custom styles.

### Step 5: Verification
1.  Open SillyTavern and navigate to EchoChamber settings.
2.  Confirm that the base prompts are visible and editable.
3.  Create a custom style and set its type to "Assistant".
4.  Generate a chat and verify that the correct base prompt is used (check browser console logs).
5.  Verify that variables like `{{style_instructions}}` are correctly replaced.

## Rollback Plan
-   Revert all file changes.
-   The custom style `type` property will be ignored by previous versions.

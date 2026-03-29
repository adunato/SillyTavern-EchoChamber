# Implementation Plan - CR001: Refactor modularization

## Phase 1: Preparation and Basic Utilities (COMPLETED)
- [x] Create `src/` directory structure.
- [x] Create `src/constants.js` (Identifiers, Defaults, State).
- [x] Create `src/utils/logger.js` (Logging).
- [x] Create `src/utils/helpers.js` (Debounce, CleanMessage, ConfirmModal, Macros, Characters, Draggable, Resizable).

## Phase 2: State and Settings (COMPLETED)
- [x] Create `src/state/settingsManager.js` (Load/Save Settings).
- [x] Create `src/state/chatState.js` (Metadata, Livestream State).

## Phase 3: Core Logic (Generation & Styles) (COMPLETED)
- [x] Create `src/core/styles.js` (Style Loading, Cache).
- [x] Create `src/core/api.js` (Response Extraction).
- [x] Create `src/core/generator.js` (Main Generation Logic).
- [x] Implement `generateSingleReply()` for chat participation.

## Phase 4: UI Refactoring (COMPLETED)
- [x] Create `src/ui/panel.js` (Render, Status, Indicators, Popout).
- [x] Create `src/ui/settings.js` (Font/Avatar/Source/Popout Visibility, Sync).
- [x] Implement `updateApplyLayout()` and `initResizeLogic()` in `panel.js`.
- [x] Implement `syncModalFromSettings()`.
- [x] Implement `openSettingsModal()` fully.
- [x] Create `src/ui/styleEditor.js` (Full Style Editor logic).

## Phase 5: Components and Event Binding (IN PROGRESS)
- [x] Create `src/ui/components.js` (Menu Population).
- [x] Migrate majority of event listeners to `bindEventHandlers()`.
- [x] Implement `populateOllamaModels()` and `populateStyleMenu()` fully.

## Phase 6: Missing Features & Polish (COMPLETED)
- [x] Implement `openPopoutWindow()` logic.
- [x] Implement `toggleLivestream()` and `livestreamTick` refinements.
- [x] Implement `formatMessage()` utility for HTML generation.
- [x] Restore `restoreCachedCommentary()` functionality in `index.js`.
- [x] Update `manifest.json` to ensure ES6 module compatibility.

## Phase 7: Final Integration & Verification (IN PROGRESS)
- [x] Partial `index.js` entry point with ST events.
- [ ] Comprehensive functional testing of all features.
- [ ] Remove `index.js.monolith.bak`.

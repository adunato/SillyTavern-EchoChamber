# Implementation Plan - CR001: Refactor modularization

## Phase 1: Preparation and Basic Utilities
- [x] Create `src/` directory and its subdirectories: `core/`, `ui/`, `state/`, `utils/`.
- [x] Create `src/constants.js` and move `defaultSettings`, `MODULE_NAME`, and `EXTENSION_NAME`.
- [x] Create `src/utils/logger.js` and move `log`, `warn`, and `error` functions.
- [x] Create `src/utils/helpers.js` and move general utilities (`debounce`, `cleanMessage`, `showConfirmModal`).

## Phase 2: State and Settings
- [x] Create `src/state/settingsManager.js` and move `loadSettings`, `saveSettings`, and related logic.
- [x] Create `src/state/chatState.js` and move livestream and chat-related state management.

## Phase 3: Core Logic (Generation & Styles)
- [x] Create `src/core/styles.js` and move `loadChatStyle`, `getAllStyles`, and style management logic.
- [x] Create `src/core/api.js` and move API interaction logic (Ollama, OpenAI, Profile requests).
- [x] Create `src/core/generator.js` and move `generateDiscordChat` and related logic.

## Phase 4: UI Refactoring
- [x] Create `src/ui/settings.js` and move settings modal logic.
- [x] Create `src/ui/styleEditor.js` and move style editor logic.
- [x] Create `src/ui/panel.js` and move main panel rendering logic.
- [x] Create `src/ui/components.js` and move shared UI component logic (menus, chips).

## Phase 5: Final Integration
- [x] Refactor `index.js` to use ES6 imports and initialize all modules.
- [x] Update `manifest.json` if necessary to reflect the new entry point behavior.
- [x] Perform comprehensive testing to ensure no functionality is lost.
- [x] Commit all changes to the `refactor/modularization` branch.

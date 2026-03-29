# HLD - CR001: Refactor index.js into Modular Architecture

## 1. Overview
The current `index.js` for SillyTavern-EchoChamber is a large, monolithic file (approx. 5400 lines). This change request aims to refactor the extension into a modular architecture, similar to `SillyTavern-SceneSummariser`, to improve maintainability, readability, and testability.

## 2. Proposed Architecture
The refactored extension will follow a modular structure under a new `src/` directory:

```
SillyTavern-EchoChamber/
├── index.js                # Entry point (initialization and event binding)
├── src/
│   ├── constants.js        # Default settings and shared constants
│   ├── core/
│   │   ├── generator.js    # Core logic for generating chat messages (generateDiscordChat)
│   │   ├── styles.js       # Style loading and management (loadChatStyle)
│   │   └── api.js          # API request handling (Ollama, OpenAI, Profile)
│   ├── ui/
│   │   ├── panel.js        # Main panel rendering and layout
│   │   ├── settings.js     # Settings modal and accordion logic
│   │   ├── styleEditor.js  # Style editor UI and logic
│   │   └── components.js   # Reusable UI components (menus, chips, etc.)
│   ├── state/
│   │   ├── settingsManager.js # Settings loading/saving logic
│   │   └── chatState.js    # Live stream and chat history state management
│   └── utils/
│       ├── logger.js       # Debug logging utility
│       └── helpers.js      # General utility functions (debounce, cleanMessage, etc.)
├── style.css               # (Unchanged)
├── settings.html           # (Unchanged)
└── manifest.json           # Updated to reflect entry point changes
```

## 3. Key Changes
- **Monolith Decomposition**: Extract logically related functions from `index.js` into their respective modules in `src/`.
- **Initialization**: `index.js` will serve as the entry point, importing and initializing modules.
- **Dependency Management**: Use standard ES6 imports/exports (as seen in SceneSummariser) while ensuring compatibility with SillyTavern's loading mechanism.
- **Event Handling**: Consolidate SillyTavern event listeners in `index.js` or a dedicated event manager.

## 4. Implementation Strategy
1. **Branching**: All changes will be made in the `refactor/modularization` branch.
2. **Phase 1: Foundation**: Create `constants.js`, `logger.js`, and `helpers.js`. Move basic utilities.
3. **Phase 2: State & Settings**: Extract settings management and state tracking.
4. **Phase 3: Core Logic**: Extract prompt generation and API handling.
5. **Phase 4: UI Refactor**: Extract UI rendering and event binding logic.
6. **Phase 5: Integration**: Update `index.js` to orchestrate the new modules and verify functionality.

## 5. Verification Plan
- **Functional Testing**: Ensure all existing features (manual generation, livestream, style editor, settings) work as expected.
- **Regression Testing**: Verify that settings are preserved and correctly loaded.
- **Developer Review**: Ensure the new structure is intuitive and follows the established project conventions.

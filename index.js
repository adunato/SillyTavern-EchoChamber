import { state, MODULE_NAME, EXTENSION_NAME } from './src/constants.js';
import { log, warn, error } from './src/utils/logger.js';
import { debounce } from './src/utils/helpers.js';
import { loadSettings, saveSettings } from './src/state/settingsManager.js';
import { getChatMetadata, restoreCachedCommentary } from './src/state/chatState.js';
import { generateDiscordChat } from './src/core/generator.js';
import { renderPanel, updatePopoutVisibility } from './src/ui/panel.js';
import { bindEventHandlers, populateConnectionProfiles } from './src/ui/components.js';

async function init() {
    log('Initializing modular EchoChamber...');

    const SillyTavern = window.SillyTavern;
    if (typeof SillyTavern === 'undefined' || !SillyTavern.getContext) {
        warn('SillyTavern not ready, retrying in 500ms...');
        setTimeout(init, 500);
        return;
    }

    const context = SillyTavern.getContext();
    log('Context available:', !!context);

    // Load settings template
    try {
        if (context.renderExtensionTemplateAsync) {
            const moduleName = 'third-party/SillyTavern-EchoChamber'; // Adjust if path differs
            const settingsHtml = await context.renderExtensionTemplateAsync(moduleName, 'settings');
            jQuery('#extensions_settings').append(settingsHtml);
            log('Settings template loaded');
        }
    } catch (err) {
        error('Failed to load settings template:', err);
    }

    loadSettings();
    renderPanel();
    updatePopoutVisibility();
    bindEventHandlers();

    // Event binding
    if (context.eventSource && context.eventTypes) {
        context.eventSource.on(context.eventTypes.MESSAGE_RECEIVED, () => {
            if (state.settings.autoUpdateOnMessages) {
                generateDiscordChat();
            }
        });
        context.eventSource.on(context.eventTypes.CHAT_CHANGED, () => {
            state.isLoadingChat = true;
            if (context.chatId) {
                // Restore logic...
            }
            setTimeout(() => { state.isLoadingChat = false; }, 1000);
        });
        context.eventSource.on(context.eventTypes.SETTINGS_UPDATED, () => populateConnectionProfiles());
    }

    log('Initialization complete');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

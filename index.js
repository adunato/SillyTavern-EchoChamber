import { state, MODULE_NAME, EXTENSION_NAME } from './src/constants.js';
import { log, warn, error } from './src/utils/logger.js';
import { debounce } from './src/utils/helpers.js';
import { loadSettings, saveSettings } from './src/state/settingsManager.js';
import { getChatMetadata, stopLivestream } from './src/state/chatState.js';
import { generateDiscordChat } from './src/core/generator.js';
import { renderPanel, setDiscordText, setStatus, initResizeLogic } from './src/ui/panel.js';
import { bindEventHandlers, populateConnectionProfiles } from './src/ui/components.js';
import { updatePopoutVisibility, initEcSettingsAccordions } from './src/ui/settings.js';

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

    try {
        if (context.renderExtensionTemplateAsync) {
            const scripts = document.querySelectorAll('script[src*="index.js"]');
            let moduleName = 'third-party/SillyTavern-EchoChamber';
            for (const script of scripts) {
                const match = script.src.match(/extensions\/(.+?)\/index\.js/);
                if (match && (match[1].includes('EchoChamber') || match[1].includes('DiscordChat'))) {
                    moduleName = match[1];
                    break;
                }
            }
            log('Detected moduleName:', moduleName);
            const settingsHtml = await context.renderExtensionTemplateAsync(moduleName, 'settings');
            jQuery('#extensions_settings').append(settingsHtml);
            log('Settings template loaded');
            initEcSettingsAccordions();
        }
    } catch (err) {
        error('Failed to load settings template:', err);
    }

    loadSettings();
    renderPanel();
    
    jQuery('.ec_reply_container').toggle(state.settings.chatEnabled !== false);
    updatePopoutVisibility();

    jQuery(window).on('resize', debounce(() => {
        updatePopoutVisibility();
    }, 250));

    initResizeLogic();
    bindEventHandlers();

    if (context.eventSource && context.eventTypes) {
        context.eventSource.on(context.eventTypes.MESSAGE_RECEIVED, () => {
            const ctx = SillyTavern.getContext();
            if (!ctx.chat || ctx.chat.length === 0) return;
            if (state.isLoadingChat) return;

            const lastMessage = ctx.chat[ctx.chat.length - 1];
            if (!lastMessage || lastMessage.is_user) return;

            let shouldAutoGenerate = false;
            if (state.settings.livestream && state.settings.livestreamMode === 'onMessage') {
                shouldAutoGenerate = true;
            } else if (!state.settings.livestream && state.settings.autoUpdateOnMessages === true) {
                shouldAutoGenerate = true;
            }

            if (shouldAutoGenerate) generateDiscordChat();
        });

        context.eventSource.on(context.eventTypes.CHAT_CHANGED, () => {
            state.isLoadingChat = true;
            const ctx = SillyTavern.getContext();
            setDiscordText('');
            stopLivestream();
            
            if (ctx.chatId) {
                const metadata = getChatMetadata();
                if (metadata && metadata.generatedHtml) {
                    setDiscordText(metadata.generatedHtml);
                }
            }
            
            setTimeout(() => { state.isLoadingChat = false; }, 1000);
        });

        context.eventSource.on(context.eventTypes.GENERATION_STOPPED, () => setStatus(''));
        context.eventSource.on(context.eventTypes.SETTINGS_UPDATED, () => populateConnectionProfiles());
    }

    window.generateDebounced = debounce(() => generateDiscordChat(), 500);

    log('Initialization complete');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

import { state, MODULE_NAME } from '../constants.js';
import { log, warn, error } from '../utils/logger.js';
import { saveSettings } from './settingsManager.js';
import { updateLiveIndicator } from '../ui/panel.js';

export function toggleLivestream(enable) {
    const wasEnabled = state.settings.livestream;
    state.settings.livestream = enable;
    saveSettings();

    jQuery('#discord_livestream').prop('checked', enable);
    jQuery('#discord_livestream_settings').toggle(enable);

    if (enable && !wasEnabled) {
        log('Livestream enabled, triggering initial generation');
        if (typeof window.generateDebounced === 'function') window.generateDebounced();
    } else if (!enable && wasEnabled) {
        log('Livestream disabled, stopping timer');
        stopLivestream();
    }
    updateLiveIndicator();
}

export function getChatMetadata() {
    const SillyTavern = window.SillyTavern;
    if (!SillyTavern || !SillyTavern.getContext) return null;

    const context = SillyTavern.getContext();
    const chatId = context.chatId;
    if (!chatId) return null;

    if (!context.extensionSettings[MODULE_NAME]) {
        context.extensionSettings[MODULE_NAME] = {};
    }
    if (!context.extensionSettings[MODULE_NAME].chatMetadata) {
        context.extensionSettings[MODULE_NAME].chatMetadata = {};
    }

    return context.extensionSettings[MODULE_NAME].chatMetadata[chatId] || null;
}

export function saveChatMetadata(data) {
    const SillyTavern = window.SillyTavern;
    if (!SillyTavern || !SillyTavern.getContext) return;

    const context = SillyTavern.getContext();
    const chatId = context.chatId;
    if (!chatId) {
        log('Cannot save metadata: no chatId');
        return;
    }

    if (!context.extensionSettings[MODULE_NAME]) {
        context.extensionSettings[MODULE_NAME] = {};
    }
    if (!context.extensionSettings[MODULE_NAME].chatMetadata) {
        context.extensionSettings[MODULE_NAME].chatMetadata = {};
    }

    context.extensionSettings[MODULE_NAME].chatMetadata[chatId] = data;
    
    if (typeof context.saveSettingsDebounced === 'function') {
        context.saveSettingsDebounced();
    }
}

export function clearCachedCommentary() {
    saveChatMetadata(null);
    log('Cleared cached commentary for current chat');
}

export function stopLivestream() {
    if (state.livestreamTimer) {
        clearTimeout(state.livestreamTimer);
        state.livestreamTimer = null;
    }
    state.livestreamQueue = [];
    state.livestreamActive = false;
    log('Livestream stopped and queue cleared');
}

export function pauseLivestream() {
    if (state.livestreamTimer) {
        clearTimeout(state.livestreamTimer);
        state.livestreamTimer = null;
    }
}

export function resumeLivestream() {
    if (state.livestreamActive && state.livestreamQueue.length > 0) {
        const minWait = (state.settings.livestreamMinWait || 5) * 1000;
        const maxWait = (state.settings.livestreamMaxWait || 60) * 1000;
        const delay = Math.random() * (maxWait - minWait) + minWait;
        state.livestreamTimer = setTimeout(() => displayNextLivestreamMessage(), delay);
        log('Livestream resumed');
    }
}

export function startLivestream(messages) {
    stopLivestream();
    if (!messages || messages.length === 0) {
        log('No messages to livestream');
        return;
    }
    state.livestreamQueue = [...messages];
    state.livestreamActive = true;
    log('Starting livestream with', state.livestreamQueue.length, 'messages');
    displayNextLivestreamMessage();
}

export function displayNextLivestreamMessage() {
    if (state.livestreamQueue.length === 0) {
        state.livestreamActive = false;
        log('Livestream completed');
        const metadata = getChatMetadata();
        if (metadata) {
            metadata.livestreamComplete = true;
            saveChatMetadata(metadata);
        }
        if (state.settings.livestream && state.settings.livestreamMode === 'onComplete') {
            if (typeof window.generateDebounced === 'function') window.generateDebounced();
        }
        return;
    }

    try {
        const message = state.livestreamQueue.shift();
        let container = state.discordContent ? jQuery(state.discordContent).find('.discord_container') : null;
        if (!container || !container.length) {
            if (state.discordContent) {
                jQuery(state.discordContent).html('<div class="discord_container" style="padding-top: 10px;"></div>');
                container = jQuery(state.discordContent).find('.discord_container');
            }
        }
        if (container && container.length) {
            container.find('.ec_livestream_message').removeClass('ec_livestream_message');
            const tempWrapper = jQuery('<div class="ec_livestream_message"></div>').append(jQuery(message));
            container.prepend(tempWrapper);
        }
        if (state.floatingPanelOpen && state.popoutDiscordContent) {
            let popoutContainer = state.popoutDiscordContent.querySelector('.discord_container');
            if (!popoutContainer) {
                state.popoutDiscordContent.innerHTML = '<div class="discord_container" style="padding-top: 10px;"></div>';
                popoutContainer = state.popoutDiscordContent.querySelector('.discord_container');
            }
            popoutContainer.querySelectorAll('.ec_livestream_message').forEach(el => el.classList.remove('ec_livestream_message'));
            const popoutWrapper = document.createElement('div');
            popoutWrapper.className = 'ec_livestream_message';
            popoutWrapper.innerHTML = message;
            popoutContainer.insertBefore(popoutWrapper, popoutContainer.firstChild);
        }
        if (state.discordContent) {
            const metadata = getChatMetadata();
            if (metadata) {
                metadata.generatedHtml = jQuery(state.discordContent).html();
                saveChatMetadata(metadata);
            }
        }
    } catch (err) {
        error('Error displaying livestream message:', err);
    }

    const minWait = (state.settings.livestreamMinWait || 5) * 1000;
    const maxWait = (state.settings.livestreamMaxWait || 60) * 1000;
    const delay = Math.random() * (maxWait - minWait) + minWait;
    state.livestreamTimer = setTimeout(() => displayNextLivestreamMessage(), delay);
}

export function parseLivestreamMessages(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const messages = [];
    const messageElements = tempDiv.querySelectorAll('.discord_message');
    messageElements.forEach(el => messages.push(el.outerHTML));
    return messages.reverse();
}

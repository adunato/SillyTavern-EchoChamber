import { state, MODULE_NAME } from '../constants.js';
import { log, warn, error } from '../utils/logger.js';

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
    log('Saved metadata for chatId:', chatId, 'data keys:', data ? Object.keys(data) : 'null');
    
    if (typeof context.saveSettingsDebounced === 'function') {
        context.saveSettingsDebounced();
    }
}

export function clearCachedCommentary() {
    saveChatMetadata(null);
    log('Cleared cached commentary for current chat');
}

export function stopLivestream() {
    if (state.livestreamTimer || state.livestreamQueue.length > 0) {
        warn(`[EchoChamber] stopLivestream called! Queue had ${state.livestreamQueue.length} messages remaining.`);
    }
    if (state.livestreamTimer) {
        clearTimeout(state.livestreamTimer);
        state.livestreamTimer = null;
    }
    state.livestreamQueue = [];
    state.livestreamActive = false;
    log('Livestream stopped and queue cleared');
}

export function startLivestream(messages) {
    stopLivestream(); // Clear any existing livestream

    if (!messages || messages.length === 0) {
        log('No messages to livestream');
        return;
    }

    state.livestreamQueue = [...messages];
    state.livestreamActive = true;

    log('Starting livestream with', state.livestreamQueue.length, 'messages');

    // Display first message immediately
    displayNextLivestreamMessage();
}

export function displayNextLivestreamMessage() {
    if (state.livestreamQueue.length === 0) {
        state.livestreamActive = false;
        warn('[EchoChamber] Livestream completed - all messages displayed');
        log('Livestream completed');

        // Mark livestream as complete in metadata
        const metadata = getChatMetadata();
        if (metadata) {
            metadata.livestreamComplete = true;
            saveChatMetadata(metadata);
        }

        // Trigger next batch generation if in onComplete mode
        // Note: generateDebounced will be imported from generator.js later
        if (state.settings.livestream && state.settings.livestreamMode === 'onComplete') {
            log('Livestream onComplete mode: triggering next batch');
            if (typeof window.generateDebounced === 'function') {
                window.generateDebounced();
            }
        }
        return;
    }

    try {
        const message = state.livestreamQueue.shift();
        log(`Displaying livestream message. Remaining in queue: ${state.livestreamQueue.length}`);

        // Get or create the container
        let container = state.discordContent ? jQuery(state.discordContent).find('.discord_container') : null;

        if (!container || !container.length) {
            if (state.discordContent) {
                jQuery(state.discordContent).html('<div class="discord_container" style="padding-top: 10px;"></div>');
                container = jQuery(state.discordContent).find('.discord_container');
            }
        }

        if (container && container.length) {
            // Remove animation class from existing messages first
            container.find('.ec_livestream_message').removeClass('ec_livestream_message');

            // Create and prepend new message
            const tempWrapper = jQuery('<div class="ec_livestream_message"></div>').append(jQuery(message));
            container.prepend(tempWrapper);
        }

        // Sync to floating panel if open
        if (state.floatingPanelOpen && state.popoutDiscordContent) {
            try {
                let popoutContainer = state.popoutDiscordContent.querySelector('.discord_container');
                if (!popoutContainer) {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'discord_container';
                    wrapper.style.paddingTop = '10px';
                    wrapper.innerHTML = state.popoutDiscordContent.innerHTML;
                    state.popoutDiscordContent.innerHTML = '';
                    state.popoutDiscordContent.appendChild(wrapper);
                    popoutContainer = wrapper;
                }

                popoutContainer.querySelectorAll('.ec_livestream_message').forEach(el => {
                    el.classList.remove('ec_livestream_message');
                });

                const popoutWrapper = document.createElement('div');
                popoutWrapper.className = 'ec_livestream_message';
                popoutWrapper.innerHTML = message;
                popoutContainer.insertBefore(popoutWrapper, popoutContainer.firstChild);
            } catch (popoutErr) {
                log('Popout sync error (ignored):', popoutErr);
            }
        }

        // Update saved HTML with current displayed state
        if (state.discordContent) {
            try {
                const currentDisplayedHtml = jQuery(state.discordContent).html();
                const metadata = getChatMetadata();
                if (metadata) {
                    metadata.generatedHtml = currentDisplayedHtml;
                    saveChatMetadata(metadata);
                }
            } catch (metaErr) {
                log('Metadata save error (ignored):', metaErr);
            }
        }

    } catch (err) {
        error('Error displaying livestream message:', err);
    }

    // Schedule next message
    const minWait = (state.settings.livestreamMinWait || 5) * 1000;
    const maxWait = (state.settings.livestreamMaxWait || 60) * 1000;
    const delay = Math.random() * (maxWait - minWait) + minWait;
    
    state.livestreamTimer = setTimeout(() => displayNextLivestreamMessage(), delay);
}

import { state, defaultSettings, MODULE_NAME } from '../constants.js';
import { applyAvatarColor, applyFontSize, updateSourceVisibility, updateAllDropdowns } from '../ui/settings.js';

export function saveSettings() {
    const SillyTavern = window.SillyTavern;
    if (!SillyTavern || !SillyTavern.getContext) return;

    const context = SillyTavern.getContext();
    // Preserve chatMetadata when saving settings
    const existingMetadata = context.extensionSettings[MODULE_NAME]?.chatMetadata;

    // Create a clean copy of settings without chatMetadata
    const settingsToSave = Object.assign({}, state.settings);
    delete settingsToSave.chatMetadata;

    context.extensionSettings[MODULE_NAME] = settingsToSave;
    if (existingMetadata) {
        context.extensionSettings[MODULE_NAME].chatMetadata = existingMetadata;
    }
    
    if (typeof context.saveSettingsDebounced === 'function') {
        context.saveSettingsDebounced();
    }
}

export function loadSettings() {
    const SillyTavern = window.SillyTavern;
    if (!SillyTavern || !SillyTavern.getContext) return;

    const context = SillyTavern.getContext();

    if (!context.extensionSettings[MODULE_NAME]) {
        context.extensionSettings[MODULE_NAME] = JSON.parse(JSON.stringify(defaultSettings));
    }

    // Don't copy chatMetadata into settings - it should stay in extensionSettings only
    const savedSettings = Object.assign({}, context.extensionSettings[MODULE_NAME]);
    delete savedSettings.chatMetadata;

    state.settings = Object.assign({}, defaultSettings, savedSettings);
    state.settings.userCount = parseInt(state.settings.userCount) || 5;
    state.settings.opacity = parseInt(state.settings.opacity) || 85;

    // Update UI
    jQuery('#discord_enabled').prop('checked', state.settings.enabled);
    jQuery('#discord_user_count').val(state.settings.userCount);
    jQuery('#discord_source').val(state.settings.source);
    jQuery('#discord_url').val(state.settings.url);
    jQuery('#discord_openai_url').val(state.settings.openai_url);
    jQuery('#discord_openai_key').val(state.settings.openai_key);
    jQuery('#discord_openai_model').val(state.settings.openai_model);
    jQuery('#discord_openai_preset').val(state.settings.openai_preset || 'custom');
    jQuery('#discord_preset_select').val(state.settings.preset || '');
    jQuery('#discord_font_size').val(state.settings.fontSize || 15);
    jQuery('#discord_position').val(state.settings.position || 'bottom');
    jQuery('#discord_style').val(state.settings.style || 'twitch');
    jQuery('#discord_opacity').val(state.settings.opacity);
    jQuery('#discord_opacity_val').text(state.settings.opacity + '%');
    jQuery('#discord_auto_update').prop('checked', state.settings.autoUpdateOnMessages !== false);
    jQuery('#discord_include_user').prop('checked', state.settings.includeUserInput);
    jQuery('#discord_context_depth').val(state.settings.contextDepth || 4);
    jQuery('#discord_include_past_echo').prop('checked', state.settings.includePastEchoChambers || false);
    jQuery('#discord_include_persona').prop('checked', state.settings.includePersona || false);
    jQuery('#discord_include_authors_note').prop('checked', state.settings.includeAuthorsNote || false);
    jQuery('#discord_include_character_description').prop('checked', state.settings.includeCharacterDescription || false);
    jQuery('#discord_include_summary').prop('checked', state.settings.includeSummary || false);
    jQuery('#discord_include_world_info').prop('checked', state.settings.includeWorldInfo || false);
    jQuery('#discord_wi_budget').val(state.settings.wiBudget || 0);
    jQuery('#discord_wi_budget_container').toggle(state.settings.includeWorldInfo || false);

    // Livestream settings
    jQuery('#discord_livestream').prop('checked', state.settings.livestream || false);
    jQuery('#discord_livestream_batch_size').val(state.settings.livestreamBatchSize || 20);
    jQuery('#discord_livestream_min_wait').val(state.settings.livestreamMinWait || 5);
    jQuery('#discord_livestream_max_wait').val(state.settings.livestreamMaxWait || 60);
    jQuery('#discord_livestream_settings').toggle(state.settings.livestream || false);

    // Set livestream mode radio button
    const livestreamMode = state.settings.livestreamMode || 'manual';
    if (livestreamMode === 'manual') {
        jQuery('#discord_livestream_manual').prop('checked', true);
    } else if (livestreamMode === 'onMessage') {
        jQuery('#discord_livestream_onmessage').prop('checked', true);
    } else {
        jQuery('#discord_livestream_oncomplete').prop('checked', true);
    }

    // Show/hide context depth based on include user input setting
    jQuery('#discord_context_depth_container').toggle(state.settings.includeUserInput);

    // Chat Participation settings
    jQuery('#discord_chat_enabled').prop('checked', state.settings.chatEnabled !== false);
    jQuery('#discord_chat_username').val(state.settings.chatUsername || 'Streamer (You)');
    jQuery('#discord_chat_avatar_color').val(state.settings.chatAvatarColor || '#3b82f6');
    jQuery('#discord_chat_reply_count').val(state.settings.chatReplyCount || 3);
    jQuery('.ec_reply_container').toggle(state.settings.chatEnabled !== false);
    
    applyAvatarColor(state.settings.chatAvatarColor || '#3b82f6');
    applyFontSize(state.settings.fontSize || 15);
    updateSourceVisibility();
    updateAllDropdowns();
}

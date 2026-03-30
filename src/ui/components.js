import { state, MODULE_NAME } from '../constants.js';
import { getAllStyles } from '../core/styles.js';
import { log } from '../utils/logger.js';
import { generateDiscordChat, generateSingleReply, cancelGenerationContext } from '../core/generator.js';
import { stopLivestream, clearCachedCommentary, toggleLivestream } from '../state/chatState.js';
import { saveSettings } from '../state/settingsManager.js';
import { setDiscordText, setStatus, updateLiveIndicator, updateStyleIndicator, updateApplyLayout, updatePanelIcons, openPopoutWindow, closePopoutWindow } from './panel.js';
import { showConfirmModal, formatMessage, debounce, resolveSTMacro } from '../utils/helpers.js';
import { openSettingsModal, applyAvatarColor, applyFontSize, updateSourceVisibility, syncModalFromSettings, updateFloatStyleLabel } from './settings.js';
import { openStyleEditor } from './styleEditor.js';

export function populateStyleMenu(menu) {
    const menuEl = jQuery(menu);
    menuEl.empty();
    const styles = getAllStyles();
    styles.forEach(s => {
        const isSelected = s.val === state.settings.style ? ' selected' : '';
        menuEl.append(`<div class="ec_menu_item${isSelected}" data-val="${s.val}">${s.label}</div>`);
    });
}

export function populateConnectionProfiles() {
    const select = jQuery('#discord_preset_select, #ecm_preset_select');
    if (!select.length) return;
    const SillyTavern = window.SillyTavern;
    const context = SillyTavern.getContext();
    const cm = context.extensionSettings?.connectionManager;
    select.empty();
    select.append('<option value="">-- Select Profile --</option>');
    if (cm && cm.profiles) {
        cm.profiles.forEach(p => { select.append(`<option value="${p.name}">${p.name}</option>`); });
        select.val(state.settings.preset || '');
    }
}

export function bindEventHandlers() {
    if (state.eventsBound) return;
    state.eventsBound = true;

    jQuery(document).on('click', '.discord_username', function () {
        const username = jQuery(this).text();
        const input = jQuery('#ec_reply_field, #ec_float_reply_field');
        input.val(`@${username} `).focus();
    });

    jQuery(document).on('click', '#ec_live_indicator, #ec_float_live_indicator', function () {
        if (jQuery(this).hasClass('ec_live_loading')) {
            cancelGenerationContext();
            updateLiveIndicator();
        } else {
            toggleLivestream(!state.settings.livestream);
        }
    });

    const submitReply = async (isFloat = false) => {
        if (state.isGenerating) { cancelGenerationContext(); return; }
        if (!state.settings.chatEnabled) return;
        const input = jQuery(isFloat ? '#ec_float_reply_field' : '#ec_reply_field');
        const text = input.val().trim();
        if (!text) return;
        input.val('');
        const myMsg = formatMessage(state.settings.chatUsername || 'Streamer (You)', text, true);
        const container = jQuery(isFloat ? '#ec_float_content .discord_container' : '#discordContent .discord_container');
        if (container.length) container.prepend(myMsg);
        else jQuery(isFloat ? '#ec_float_content' : '#discordContent').html(`<div class="discord_container">${myMsg}</div>`);
        const atMatch = text.match(/^@([^\s]+)/);
        await generateSingleReply(text, atMatch ? atMatch[1] : null);
    };

    jQuery(document).on('click', '#ec_reply_submit', () => submitReply(false));
    jQuery(document).on('click', '#ec_float_reply_submit', () => submitReply(true));
    jQuery(document).on('keypress', '#ec_reply_field', e => { if (e.which == 13) submitReply(false); });
    jQuery(document).on('keypress', '#ec_float_reply_field', e => { if (e.which == 13) submitReply(true); });

    jQuery(document).on('click', '.ec_power_btn', function () {
        state.settings.paused = !state.settings.paused;
        if (state.settings.paused) { stopLivestream(); cancelGenerationContext(); }
        updatePanelIcons(); saveSettings();
    });

    jQuery(document).on('click', '.ec_collapse_btn', function () {
        state.settings.collapsed = !state.settings.collapsed;
        updateApplyLayout(); saveSettings();
    });

    jQuery(document).on('click', '.ec_btn, .ec_float_tool, .ec_style_indicator', function (e) {
        const btn = jQuery(this);
        if (btn.hasClass('ec_float_refresh') || btn.find('.fa-rotate-right').length) {
            generateDiscordChat(true);
        } else if (btn.hasClass('ec_float_clear') || btn.find('.fa-trash-can').length) {
            showConfirmModal('Clear chat?').then(c => { if (c) { setDiscordText(''); clearCachedCommentary(); } });
        } else if (btn.hasClass('ec_float_settings') || btn.find('.fa-gear').length) {
            openSettingsModal();
        } else if (btn.hasClass('ec_style_indicator') || btn.hasClass('ec_float_style_btn')) {
            const menu = btn.hasClass('ec_float_style_btn') ? jQuery('#ec_float_style_menu_body') : jQuery('#ec_style_menu_body');
            const wasVisible = menu.is(':visible');
            jQuery('.ec_popup_menu').hide();
            if (!wasVisible) {
                const rect = btn[0].getBoundingClientRect();
                menu.css({ position: 'fixed', top: rect.bottom + 'px', left: rect.left + 'px', display: 'block' });
                populateStyleMenu(menu);
            }
        } else if (btn.find('.ec_popup_menu').length > 0) {
            const menu = btn.find('.ec_popup_menu');
            const wasVisible = menu.is(':visible');
            jQuery('.ec_popup_menu').hide();
            if (!wasVisible) {
                menu.show();
            }
        }
        e.stopPropagation();
    });

    jQuery(document).on('click', '.ec_menu_item', function (e) {
        const item = jQuery(this);
        const val = item.data('val');
        const parent = item.closest('.ec_popup_menu');
        if (parent.hasClass('ec_layout_menu')) {
            if (val === 'popout') openPopoutWindow();
            else { state.settings.position = val; updateApplyLayout(); saveSettings(); }
        } else if (parent.hasClass('ec_user_menu')) {
            state.settings.userCount = parseInt(val); saveSettings();
        } else if (parent.hasClass('ec_font_menu')) {
            state.settings.fontSize = parseInt(val); applyFontSize(val); saveSettings();
        } else if (parent.hasClass('ec_style_menu')) {
            state.settings.style = val; updateStyleIndicator(); updateFloatStyleLabel(); saveSettings();
        }
        jQuery('.ec_popup_menu').hide();
        e.stopPropagation();
    });

    jQuery(document).on('click', '#discord_open_style_editor', function () {
        openStyleEditor();
    });

    jQuery(document).on('click', '#discord_import_btn', function () {
        jQuery('#discord_import_file').click();
    });

    jQuery(document).on('change', '#discord_import_file', function () {
        const file = this.files[0];
        if (!file) return;
        const name = file.name.replace(/\.[^/.]+$/, "");
        const reader = new FileReader();
        reader.onload = function (e) {
            const content = e.target.result;
            const id = 'custom_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
            if (!state.settings.custom_styles) state.settings.custom_styles = {};
            state.settings.custom_styles[id] = { name: name, prompt: content };
            saveSettings();
            updateAllDropdowns();
            if (typeof toastr !== 'undefined') toastr.success(`Imported style: ${name}`);
        };
        reader.readAsText(file);
        this.value = '';
    });

    jQuery(document).on('change', '#discord_enabled', function () {
        state.settings.enabled = jQuery(this).prop('checked');
        updateApplyLayout();
        saveSettings();
    });

    jQuery(document).on('change', '#discord_source', function () {
        state.settings.source = jQuery(this).val();
        updateSourceVisibility();
        saveSettings();
    });

    jQuery(document).on('input', '#discord_url', function () {
        state.settings.url = jQuery(this).val();
        saveSettings();
    });

    jQuery(document).on('change', '#discord_model_select', function () {
        state.settings.model = jQuery(this).val();
        saveSettings();
    });

    jQuery(document).on('change', '#discord_openai_preset', function () {
        state.settings.openai_preset = jQuery(this).val();
        saveSettings();
    });

    jQuery(document).on('input', '#discord_openai_url', function () {
        state.settings.openai_url = jQuery(this).val();
        saveSettings();
    });

    jQuery(document).on('input', '#discord_openai_key', function () {
        state.settings.openai_key = jQuery(this).val();
        saveSettings();
    });

    jQuery(document).on('input', '#discord_openai_model', function () {
        state.settings.openai_model = jQuery(this).val();
        saveSettings();
    });

    jQuery(document).on('change', '#discord_preset_select', function () {
        state.settings.preset = jQuery(this).val();
        saveSettings();
    });

    jQuery(document).on('change', '#discord_style', function () {
        state.settings.style = jQuery(this).val();
        updateStyleIndicator();
        updateFloatStyleLabel();
        saveSettings();
    });

    jQuery(document).on('change', '#discord_position', function () {
        state.settings.position = jQuery(this).val();
        updateApplyLayout();
        saveSettings();
    });

    jQuery(document).on('input', '#discord_user_count', function () {
        state.settings.userCount = parseInt(jQuery(this).val()) || 5;
        saveSettings();
    });

    jQuery(document).on('input', '#discord_font_size', function () {
        state.settings.fontSize = parseInt(jQuery(this).val()) || 15;
        applyFontSize(state.settings.fontSize);
        saveSettings();
    });

    jQuery(document).on('input', '#discord_opacity', function () {
        const val = parseInt(jQuery(this).val());
        state.settings.opacity = val;
        jQuery('#discord_opacity_val').text(val + '%');
        updateApplyLayout();
        saveSettings();
    });

    jQuery(document).on('change', '#discord_auto_update', function () {
        state.settings.autoUpdateOnMessages = jQuery(this).prop('checked');
        saveSettings();
    });

    jQuery(document).on('change', '#discord_include_user', function () {
        state.settings.includeUserInput = jQuery(this).prop('checked');
        jQuery('#discord_context_depth_container').toggle(state.settings.includeUserInput);
        saveSettings();
    });

    jQuery(document).on('input', '#discord_context_depth', function () {
        state.settings.contextDepth = parseInt(jQuery(this).val()) || 4;
        saveSettings();
    });

    jQuery(document).on('change', '#discord_include_past_echo', function () {
        state.settings.includePastEchoChambers = jQuery(this).prop('checked');
        saveSettings();
    });

    jQuery(document).on('change', '#discord_include_persona', function () {
        state.settings.includePersona = jQuery(this).prop('checked');
        saveSettings();
    });

    jQuery(document).on('change', '#discord_include_authors_note', function () {
        state.settings.includeAuthorsNote = jQuery(this).prop('checked');
        saveSettings();
    });

    jQuery(document).on('change', '#discord_include_character_description', function () {
        state.settings.includeCharacterDescription = jQuery(this).prop('checked');
        saveSettings();
    });

    jQuery(document).on('change', '#discord_include_summary', function () {
        state.settings.includeSummary = jQuery(this).prop('checked');
        saveSettings();
    });

    jQuery(document).on('change', '#discord_include_world_info', function () {
        state.settings.includeWorldInfo = jQuery(this).prop('checked');
        jQuery('#discord_wi_budget_container').toggle(state.settings.includeWorldInfo);
        saveSettings();
    });

    jQuery(document).on('input', '#discord_wi_budget', function () {
        state.settings.wiBudget = parseInt(jQuery(this).val()) || 0;
        saveSettings();
    });

    jQuery(document).on('change', '#discord_livestream', function () {
        state.settings.livestream = jQuery(this).prop('checked');
        jQuery('#discord_livestream_settings').toggle(state.settings.livestream);
        saveSettings();
    });

    jQuery(document).on('input', '#discord_livestream_batch_size', function () {
        state.settings.livestreamBatchSize = parseInt(jQuery(this).val()) || 20;
        saveSettings();
    });

    jQuery(document).on('input', '#discord_livestream_min_wait', function () {
        state.settings.livestreamMinWait = parseInt(jQuery(this).val()) || 5;
        saveSettings();
    });

    jQuery(document).on('input', '#discord_livestream_max_wait', function () {
        state.settings.livestreamMaxWait = parseInt(jQuery(this).val()) || 60;
        saveSettings();
    });

    jQuery(document).on('change', 'input[name="discord_livestream_mode"]', function () {
        state.settings.livestreamMode = jQuery(this).val();
        saveSettings();
    });

    jQuery(document).on('change', '#discord_chat_enabled', function () {
        state.settings.chatEnabled = jQuery(this).prop('checked');
        jQuery('.ec_reply_container').toggle(state.settings.chatEnabled);
        saveSettings();
    });

    jQuery(document).on('input', '#discord_chat_username', function () {
        state.settings.chatUsername = jQuery(this).val();
        saveSettings();
    });

    jQuery(document).on('change', '#discord_chat_avatar_color', function () {
        state.settings.chatAvatarColor = jQuery(this).val();
        applyAvatarColor(state.settings.chatAvatarColor);
        saveSettings();
    });

    jQuery(document).on('input', '#discord_chat_reply_count', function () {
        state.settings.chatReplyCount = parseInt(jQuery(this).val()) || 3;
        saveSettings();
    });

    jQuery(document).on('change', '#discord_chat_override_tokens', function () {
        state.settings.chatOverrideTokens = jQuery(this).prop('checked');
        jQuery('#discord_chat_max_tokens_container').toggle(state.settings.chatOverrideTokens);
        saveSettings();
    });

    jQuery(document).on('input', '#discord_chat_max_tokens', function () {
        state.settings.chatMaxTokens = parseInt(jQuery(this).val()) || 3000;
        saveSettings();
    });

    jQuery(document).on('click', () => jQuery('.ec_popup_menu').hide());
}

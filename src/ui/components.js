import { state, MODULE_NAME } from '../constants.js';
import { getAllStyles } from '../core/styles.js';
import { log } from '../utils/logger.js';
import { generateDiscordChat, generateSingleReply, cancelGenerationContext } from '../core/generator.js';
import { stopLivestream, clearCachedCommentary, toggleLivestream } from '../state/chatState.js';
import { saveSettings } from '../state/settingsManager.js';
import { setDiscordText, setStatus, updateLiveIndicator, updateStyleIndicator, updateApplyLayout, updatePanelIcons, openPopoutWindow, closePopoutWindow, updateFloatStyleLabel } from './panel.js';
import { showConfirmModal, formatMessage, debounce, resolveSTMacro } from '../utils/helpers.js';
import { openSettingsModal, applyAvatarColor, applyFontSizeUI, updateSourceVisibility, syncModalFromSettings } from './settings.js';

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

    jQuery(document).on('click', '.ec_btn, .ec_float_tool', function (e) {
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
            state.settings.fontSize = parseInt(val); applyFontSizeUI(val); saveSettings();
        } else if (parent.hasClass('ec_style_menu')) {
            state.settings.style = val; updateStyleIndicator(); updateFloatStyleLabel(); saveSettings();
        }
        jQuery('.ec_popup_menu').hide();
        e.stopPropagation();
    });

    jQuery(document).on('click', () => jQuery('.ec_popup_menu').hide());
}

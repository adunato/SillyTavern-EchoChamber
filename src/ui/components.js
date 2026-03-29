import { state, MODULE_NAME } from '../constants.js';
import { getAllStyles } from '../core/styles.js';
import { log } from '../utils/logger.js';
import { generateDiscordChat, generateSingleReply, cancelGenerationContext } from '../core/generator.js';
import { stopLivestream, clearCachedCommentary, toggleLivestream } from '../state/chatState.js';
import { saveSettings } from '../state/settingsManager.js';
import { setDiscordText, setStatus, updateLiveIndicator, updateStyleIndicator, updateApplyLayout, applyFontSize, updatePanelIcons, openPopoutWindow } from './panel.js';
import { showConfirmModal, formatMessage, debounce } from '../utils/helpers.js';
import { openSettingsModal, applyAvatarColor } from './settings.js';

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
    const select = jQuery('#discord_preset_select');
    if (!select.length) return;

    const SillyTavern = window.SillyTavern;
    const context = SillyTavern.getContext();
    const cm = context.extensionSettings?.connectionManager;
    
    select.empty();
    select.append('<option value="">-- Select Profile --</option>');
    
    if (cm && cm.profiles) {
        cm.profiles.forEach(p => {
            select.append(`<option value="${p.name}">${p.name}</option>`);
        });
        select.val(state.settings.preset || '');
    }
}

export function bindEventHandlers() {
    if (state.eventsBound) return;
    state.eventsBound = true;

    // Handle clicking a username to tag them
    jQuery(document).on('click', '.discord_username', function () {
        const username = jQuery(this).text();
        const input = jQuery('#ec_reply_field');
        input.val(`@${username} `).focus();
        const replyContainer = document.querySelector('.ec_reply_container');
        if (replyContainer) replyContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    // LIVE indicator click
    jQuery(document).on('click', '#ec_live_indicator', function () {
        if (jQuery('#ec_live_indicator').hasClass('ec_live_loading')) {
            cancelGenerationContext();
            updateLiveIndicator();
        } else {
            toggleLivestream(!state.settings.livestream);
        }
    });

    // Handle sending the message
    const submitReply = async () => {
        if (state.isGenerating) {
            cancelGenerationContext();
            return;
        }
        if (!state.settings.chatEnabled) return;
        const input = jQuery('#ec_reply_field');
        const text = input.val().trim();
        if (!text) return;

        input.val('');
        const myMsg = formatMessage(state.settings.chatUsername || 'Streamer (You)', text, true);
        const container = jQuery('#discordContent .discord_container');
        if (container.length) {
            container.prepend(myMsg);
        } else {
            jQuery('#discordContent').html(`<div class="discord_container">${myMsg}</div>`);
        }

        jQuery('#discordContent').scrollTop(0);
        const atMatch = text.match(/^@([^\s]+)/);
        const targetUsername = atMatch ? atMatch[1] : null;
        await generateSingleReply(text, targetUsername);
    };

    jQuery(document).on('click', '#ec_reply_submit', submitReply);
    jQuery(document).on('keypress', '#ec_reply_field', function (e) {
        if (e.which == 13) submitReply();
    });

    // Chat Participation settings handlers
    jQuery(document).on('change', '#discord_chat_enabled', function () {
        state.settings.chatEnabled = this.checked;
        jQuery('.ec_reply_container').toggle(this.checked);
        saveSettings();
    });

    jQuery(document).on('input', '#discord_chat_username', function () {
        state.settings.chatUsername = jQuery(this).val().trim() || 'Streamer (You)';
        saveSettings();
    });

    jQuery(document).on('input change', '#discord_chat_avatar_color', function () {
        const color = jQuery(this).val();
        state.settings.chatAvatarColor = color;
        applyAvatarColor(color);
        jQuery('#ecm_chat_avatar_color').val(color);
        saveSettings();
    });

    jQuery(document).on('change', '#discord_chat_reply_count', function () {
        const val = Math.max(1, Math.min(12, parseInt(jQuery(this).val()) || 3));
        state.settings.chatReplyCount = val;
        jQuery(this).val(val);
        jQuery('#ecm_chat_reply_count').val(val);
        saveSettings();
    });

    // Power Button
    jQuery(document).on('click', '.ec_power_btn', function () {
        state.settings.paused = !state.settings.paused;
        if (state.settings.paused) {
            stopLivestream();
            cancelGenerationContext();
            jQuery(state.discordBar).addClass('ec_disabled');
        } else {
            jQuery(state.discordBar).removeClass('ec_disabled');
        }
        updatePanelIcons();
        saveSettings();
    });

    // Collapse Button
    jQuery(document).on('click', '.ec_collapse_btn', function () {
        state.settings.collapsed = !state.settings.collapsed;
        if (state.settings.collapsed) {
            jQuery(state.discordBar).addClass('ec_collapsed');
        } else {
            jQuery(state.discordBar).removeClass('ec_collapsed');
        }
        updatePanelIcons();
        saveSettings();
    });

    // Menu Button Clicks
    jQuery(document).on('click touchend', '.ec_btn', function (e) {
        if (e.type === 'touchend') e.preventDefault();
        const btn = jQuery(this);
        const wasActive = btn.hasClass('active');

        jQuery('.ec_btn').removeClass('open active');
        jQuery('.ec_popup_menu').hide().css({ top: '', bottom: '', left: '', right: '', position: '' });

        if (btn.hasClass('ec_overflow_btn')) {
            if (!wasActive) {
                btn.addClass('open active');
                const popup = jQuery('#ec_overflow_menu_body');
                const btnRect = btn[0].getBoundingClientRect();
                const isBottom = jQuery(state.discordBar).hasClass('ec_bottom');
                popup.css({ visibility: 'hidden', display: 'block', top: '-9999px', left: '-9999px' });
                const actualW = popup[0].offsetWidth;
                const actualH = popup[0].offsetHeight;
                let left = btnRect.right - actualW;
                if (left < 8) left = 8;
                if (left + actualW > window.innerWidth - 8) left = window.innerWidth - actualW - 8;
                let top = isBottom ? (btnRect.top - actualH - 6) : (btnRect.bottom + 6);
                popup.css({ visibility: '', display: 'block', position: 'fixed', top: top + 'px', left: left + 'px', right: 'auto', bottom: 'auto' });
            }
        } else if (btn.find('.ec_popup_menu').length > 0) {
            if (!wasActive) {
                btn.addClass('open active');
                const popup = btn.find('.ec_popup_menu');
                popup.show();
                const rect = popup[0].getBoundingClientRect();
                if (rect.left < 8) popup.css({ right: 'auto', left: (8 - rect.left) + 'px' });
            }
        } else if (btn.find('.fa-rotate-right').length) {
            btn.find('i').addClass('fa-spin');
            setTimeout(() => btn.find('i').removeClass('fa-spin'), 1000);
            generateDiscordChat(true);
        } else if (btn.find('.fa-trash-can').length) {
            showConfirmModal('Clear all generated chat messages and cached commentary?').then(confirmed => {
                if (confirmed) {
                    setDiscordText('');
                    clearCachedCommentary();
                }
            });
        } else if (btn.find('.fa-gear').length) {
            openSettingsModal();
        }
        e.stopPropagation();
    });

    jQuery(document).on('click', function () {
        jQuery('.ec_btn').removeClass('open active');
        jQuery('.ec_popup_menu').hide();
    });
}

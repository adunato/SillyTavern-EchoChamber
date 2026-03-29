import { state, MODULE_NAME } from '../constants.js';
import { getAllStyles } from '../core/styles.js';
import { log } from '../utils/logger.js';
import { generateDiscordChat } from '../core/generator.js';
import { stopLivestream, clearCachedCommentary } from '../state/chatState.js';
import { saveSettings } from '../state/settingsManager.js';
import { setDiscordText, setStatus, updateLiveIndicator, updateStyleIndicator } from './panel.js';
import { showConfirmModal } from '../utils/helpers.js';

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

    // Header buttons click
    jQuery(document).on('click', '.ec_btn', function (e) {
        const btn = jQuery(this);
        
        if (btn.find('.fa-rotate-right').length) {
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
        }
        
        // Popup menu toggles
        const menu = btn.find('.ec_popup_menu');
        if (menu.length) {
            const wasActive = btn.hasClass('active');
            jQuery('.ec_btn').removeClass('active');
            jQuery('.ec_popup_menu').hide();
            
            if (!wasActive) {
                btn.addClass('active');
                menu.show();
            }
        }
        
        e.stopPropagation();
    });

    // Menu Item Clicks
    jQuery(document).on('click', '.ec_menu_item', function (e) {
        const item = jQuery(this);
        const parent = item.closest('.ec_popup_menu');
        const val = item.data('val');

        if (parent.hasClass('ec_layout_menu')) {
            if (val !== 'popout') {
                state.settings.position = val;
                saveSettings();
                // updateApplyLayout(); // Needs implementation
            }
        } else if (parent.hasClass('ec_user_menu')) {
            state.settings.userCount = parseInt(val);
            saveSettings();
        } else if (parent.hasClass('ec_font_menu')) {
            state.settings.fontSize = parseInt(val);
            saveSettings();
            // applyFontSize(state.settings.fontSize); // Needs implementation
        }

        jQuery('.ec_btn').removeClass('active');
        jQuery('.ec_popup_menu').hide();
        e.stopPropagation();
    });

    jQuery(document).on('click', function () {
        jQuery('.ec_btn').removeClass('active');
        jQuery('.ec_popup_menu').hide();
    });
}

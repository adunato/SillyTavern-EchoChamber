import { state, BUILT_IN_STYLES } from '../constants.js';
import { log } from '../utils/logger.js';
import { getAllStyles } from '../core/styles.js';

export function updateReplyButtonState(isGen) {
...
}

export function updateLiveIndicator(status) {
...
}

export function setDiscordText(html) {
...
}

export function setStatus(html) {
...
}

export function updateStyleIndicator(indicator) {
    const ind = indicator || jQuery('#ec_style_indicator');
    if (!ind.length) return;

    const currentStyle = state.settings.style || 'twitch';
    const styles = getAllStyles();
    const styleObj = styles.find(s => s.val === currentStyle);
    const styleName = styleObj ? styleObj.label : currentStyle;
    
    ind.html(`
        <div class="ec_style_name">${styleName}</div>
        <div class="ec_style_chevron"><i class="fa-solid fa-chevron-down"></i></div>
    `);
}

export function renderPanel() {
    jQuery('#discordBar').remove();

    state.discordBar = jQuery('<div id="discordBar"></div>')[0];
    state.discordQuickBar = jQuery('<div id="discordQuickSettings"></div>')[0];

    const leftGroup = jQuery('<div class="ec_header_left"></div>');
    const powerBtn = jQuery('<div class="ec_power_btn" title="Enable/Disable EchoChamber"><i class="fa-solid fa-power-off"></i></div>');
    const collapseBtn = jQuery('<div class="ec_collapse_btn" title="Collapse/Expand Panel"><i class="fa-solid fa-chevron-down"></i></div>');
    const liveIndicator = jQuery('<div class="ec_live_indicator" id="ec_live_indicator"><i class="fa-solid fa-circle"></i> LIVE</div>');
    leftGroup.append(powerBtn).append(collapseBtn).append(liveIndicator);

    const rightGroup = jQuery('<div class="ec_header_right"></div>');
    const createBtn = (icon, title, menuClass) => {
        const btn = jQuery(`<div class="ec_btn" title="${title}"><i class="${icon}"></i></div>`);
        if (menuClass) btn.append(`<div class="ec_popup_menu ${menuClass}"></div>`);
        return btn;
    };

    const refreshBtn = createBtn('fa-solid fa-rotate-right', 'Regenerate Chat', null);
    const layoutBtn = createBtn('fa-solid fa-table-columns', 'Panel Position', 'ec_layout_menu');
    const usersBtn = createBtn('fa-solid fa-users', 'User Count', 'ec_user_menu');
    const fontBtn = createBtn('fa-solid fa-font', 'Font Size', 'ec_font_menu');
    const clearBtn = createBtn('fa-solid fa-trash-can', 'Clear Chat & Cache', null);
    const settingsBtn = createBtn('fa-solid fa-gear', 'Settings', null);
    const overflowBtn = jQuery('<div class="ec_btn ec_overflow_btn" title="Actions"><i class="fa-solid fa-ellipsis-vertical"></i></div>');

    jQuery('#ec_overflow_menu_body').remove();
    const overflowMenu = jQuery('<div id="ec_overflow_menu_body" class="ec_popup_menu ec_overflow_menu"></div>');
    jQuery('body').append(overflowMenu);

    rightGroup.append(refreshBtn).append(layoutBtn).append(usersBtn).append(fontBtn).append(clearBtn).append(settingsBtn).append(overflowBtn);
    jQuery(state.discordQuickBar).append(leftGroup).append(rightGroup);

    const styleIndicator = jQuery('<div class="ec_style_indicator ec_style_dropdown_trigger" id="ec_style_indicator"></div>');
    jQuery('#ec_style_menu_body').remove();
    const styleMenu = jQuery('<div id="ec_style_menu_body" class="ec_popup_menu ec_style_menu ec_indicator_menu"></div>');
    jQuery('body').append(styleMenu);
    updateStyleIndicator(styleIndicator);
    
    // populateStyleMenu will be moved to components.js
    
    const statusOverlay = jQuery('<div class="ec_status_overlay"></div>');
    state.discordContent = jQuery('<div id="discordContent"></div>')[0];

    const replyContainer = jQuery(`
        <div class="ec_reply_container">
            <div class="ec_reply_wrapper">
                <input type="text" class="ec_reply_input" placeholder="Type a message to participate..." id="ec_reply_field">
                <div class="ec_reply_send" id="ec_reply_submit" title="Send message"><i class="fa-solid fa-paper-plane"></i></div>
            </div>
        </div>
    `);

    const resizeHandle = jQuery('<div class="ec_resize_handle"></div>');
    jQuery(state.discordBar).append(state.discordQuickBar).append(styleIndicator).append(statusOverlay).append(state.discordContent).append(replyContainer).append(resizeHandle);

    // Populate Menus... (simplified for now)
    
    log('Panel rendered');
}

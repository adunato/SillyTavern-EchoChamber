import { state, BUILT_IN_STYLES } from '../constants.js';
import { log } from '../utils/logger.js';
import { getAllStyles } from '../core/styles.js';
import { saveSettings } from '../state/settingsManager.js';

export function updateReplyButtonState(isGen) {
    const btns = jQuery('#ec_reply_submit, #ec_float_reply_submit');
    if (isGen) {
        btns.addClass('ec_reply_stop').attr('title', 'Stop action (cancel generation)');
        btns.html('<i class="fa-solid fa-hourglass"></i>');
    } else {
        btns.removeClass('ec_reply_stop').attr('title', 'Send message');
        btns.html('<i class="fa-solid fa-paper-plane"></i>');
    }
}

export function updateLiveIndicator(status) {
    const indicator = jQuery('#ec_live_indicator');
    const popoutInd = document.getElementById('ec_float_live_indicator');

    if (!indicator.length && !popoutInd) return;

    const currentState = status || (state.livestreamActive ? 'active' : 'idle');

    if (currentState === 'active') {
        indicator.removeClass('ec_live_idle ec_live_loading').addClass('ec_live_active');
        if (popoutInd) {
            popoutInd.classList.remove('ec_live_idle', 'ec_live_loading');
            popoutInd.classList.add('ec_live_active');
        }
    } else if (currentState === 'loading') {
        indicator.removeClass('ec_live_idle ec_live_active').addClass('ec_live_loading');
        if (popoutInd) {
            popoutInd.classList.remove('ec_live_idle', 'ec_live_active');
            popoutInd.classList.add('ec_live_loading');
        }
    } else {
        indicator.removeClass('ec_live_active ec_live_loading').addClass('ec_live_idle');
        if (popoutInd) {
            popoutInd.classList.remove('ec_live_active', 'ec_live_loading');
            popoutInd.classList.add('ec_live_idle');
        }
    }
}

export function setDiscordText(html) {
    if (!state.discordContent) return;

    const chatBlock = jQuery('#chat');
    const originalScrollBottom = chatBlock.length ?
        chatBlock[0].scrollHeight - (chatBlock.scrollTop() + chatBlock.outerHeight()) : 0;

    jQuery(state.discordContent).html(html);

    if (state.discordContent[0]) {
        state.discordContent[0].scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (chatBlock.length) {
        const newScrollTop = chatBlock[0].scrollHeight - (chatBlock.outerHeight() + originalScrollBottom);
        chatBlock.scrollTop(newScrollTop);
    }

    if (state.floatingPanelOpen && state.popoutDiscordContent) {
        state.popoutDiscordContent.innerHTML = html;
        state.popoutDiscordContent.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

export function setStatus(html) {
    const overlays = jQuery('.ec_status_overlay');
    if (overlays.length > 0) {
        if (html) {
            overlays.html(html).addClass('active');
        } else {
            overlays.removeClass('active');
            setTimeout(() => {
                overlays.each(function () {
                    if (!jQuery(this).hasClass('active')) jQuery(this).empty();
                });
            }, 200);
        }
    }
}

export function updatePanelIcons() {
    if (!state.discordBar) return;
    const powerBtn = jQuery(state.discordBar).find('.ec_power_btn');
    if (state.settings.paused) {
        powerBtn.addClass('ec_power_off').attr('title', 'Resume EchoChamber');
    } else {
        powerBtn.removeClass('ec_power_off').attr('title', 'Pause EchoChamber');
    }
    
    const collapseBtn = jQuery(state.discordBar).find('.ec_collapse_btn i');
    if (state.settings.collapsed) {
        collapseBtn.removeClass('fa-chevron-down').addClass('fa-chevron-up');
    } else {
        collapseBtn.removeClass('fa-chevron-up').addClass('fa-chevron-down');
    }
}

export function updateApplyLayout() {
    if (!state.discordBar) return;

    const bar = jQuery(state.discordBar);
    const content = jQuery(state.discordContent);

    if (!state.settings.enabled) {
        bar.hide();
        return;
    }

    bar.show();
    const pos = state.settings.position || 'bottom';

    bar.removeClass('ec_top ec_bottom ec_left ec_right ec_collapsed');
    bar.addClass(`ec_${pos}`);
    bar.detach();

    bar.css({ top: '', bottom: '', left: '', right: '', width: '', height: '' });
    content.attr('style', '');

    const opacity = (state.settings.opacity || 85) / 100;
    bar.css('background', `rgba(20, 20, 25, ${opacity})`);
    jQuery(state.discordQuickBar).css('background', `rgba(0, 0, 0, ${opacity * 0.3})`);

    if (pos === 'bottom') {
        const sendForm = jQuery('#send_form');
        const isMobile = window.innerWidth <= 768;
        if (sendForm.length) {
            if (isMobile) sendForm.before(bar); else sendForm.after(bar);
        } else {
            const fs = jQuery('#form_sheld');
            if (fs.length) fs.append(bar); else jQuery('body').append(bar);
        }
        bar.css({ width: '100%', height: '' });
        content.css({ 'height': `${state.settings.chatHeight || 200}px`, 'flex-grow': '0' });
    } else {
        jQuery('body').append(bar);
        if (pos === 'top') {
            content.css({ 'height': `${state.settings.chatHeight || 200}px`, 'flex-grow': '0' });
        } else {
            bar.css('width', `${state.settings.panelWidth || 350}px`);
            content.css({ 'height': '100%', 'flex-grow': '1' });
        }
    }

    if (state.settings.collapsed) bar.addClass('ec_collapsed');
    if (state.settings.paused) bar.addClass('ec_disabled');

    updatePanelIcons();
}

export function initResizeLogic() {
    let isResizing = false;
    let startX, startY, startSize;

    jQuery(document).on('mousedown touchstart', '.ec_resize_handle', function (e) {
        e.preventDefault();
        e.stopPropagation();
        isResizing = true;
        startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        startY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        const pos = state.settings.position;
        startSize = (pos === 'left' || pos === 'right') ? (state.settings.panelWidth || 350) : (state.settings.chatHeight || 200);
        jQuery('body').css('cursor', (pos === 'left' || pos === 'right') ? 'ew-resize' : 'ns-resize');
        jQuery(this).addClass('resizing');
    });

    jQuery(document).on('mousemove touchmove', function (e) {
        if (!isResizing) return;
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        const deltaX = clientX - startX;
        const deltaY = clientY - startY;
        const pos = state.settings.position;

        if (pos === 'bottom') {
            state.settings.chatHeight = Math.max(80, Math.min(600, startSize - deltaY));
            jQuery(state.discordContent).css('height', state.settings.chatHeight + 'px');
        } else if (pos === 'top') {
            state.settings.chatHeight = Math.max(80, Math.min(600, startSize + deltaY));
            jQuery(state.discordContent).css('height', state.settings.chatHeight + 'px');
        } else if (pos === 'left') {
            state.settings.panelWidth = Math.max(200, Math.min(window.innerWidth - 50, startSize + deltaX));
            jQuery(state.discordBar).css('width', state.settings.panelWidth + 'px');
        } else if (pos === 'right') {
            state.settings.panelWidth = Math.max(200, Math.min(window.innerWidth - 50, startSize - deltaX));
            jQuery(state.discordBar).css('width', state.settings.panelWidth + 'px');
        }
    });

    jQuery(document).on('mouseup touchend', function () {
        if (isResizing) {
            isResizing = false;
            jQuery('.ec_resize_handle').removeClass('resizing');
            jQuery('body').css('cursor', '');
            saveSettings();
        }
    });
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

    const layoutMenu = layoutBtn.find('.ec_layout_menu');
    const currentPos = state.settings.position || 'bottom';
    ['Top', 'Bottom', 'Left', 'Right'].forEach(pos => {
        const icon = pos === 'Top' ? 'up' : pos === 'Bottom' ? 'down' : pos === 'Left' ? 'left' : 'right';
        const isSelected = pos.toLowerCase() === currentPos ? ' selected' : '';
        layoutMenu.append(`<div class="ec_menu_item${isSelected}" data-val="${pos.toLowerCase()}"><i class="fa-solid fa-arrow-${icon}"></i> ${pos}</div>`);
    });
    layoutMenu.append(`<div class="ec_menu_item${currentPos === 'popout' ? ' selected' : ''}" data-val="popout"><i class="fa-solid fa-arrow-up-right-from-square"></i> Pop Out</div>`);

    const userMenu = usersBtn.find('.ec_user_menu');
    const currentUsers = state.settings.userCount || 5;
    for (let i = 1; i <= 20; i++) {
        userMenu.append(`<div class="ec_menu_item${i === currentUsers ? ' selected' : ''}" data-val="${i}">${i} users</div>`);
    }

    const fontMenu = fontBtn.find('.ec_font_menu');
    const currentFont = state.settings.fontSize || 15;
    for (let i = 8; i <= 24; i++) {
        fontMenu.append(`<div class="ec_menu_item${i === currentFont ? ' selected' : ''}" data-val="${i}">${i}px</div>`);
    }
    
    updateApplyLayout();
    log('Panel rendered');
}

import { state, BUILT_IN_STYLES } from '../constants.js';
import { log } from '../utils/logger.js';
import { getAllStyles } from '../core/styles.js';
import { saveSettings } from '../state/settingsManager.js';
import { makeDraggable, makeFloatingPanelResizable, formatMessage, showConfirmModal } from '../utils/helpers.js';
import { populateStyleMenu } from './components.js';
import { toggleLivestream, clearCachedCommentary } from '../state/chatState.js';
import { cancelGenerationContext, generateDiscordChat, generateSingleReply } from '../core/generator.js';
import { openSettingsModal } from './settings.js';

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
        if (popoutInd) { popoutInd.classList.remove('ec_live_idle', 'ec_live_loading'); popoutInd.classList.add('ec_live_active'); }
    } else if (currentState === 'loading') {
        indicator.removeClass('ec_live_idle ec_live_active').addClass('ec_live_loading');
        if (popoutInd) { popoutInd.classList.remove('ec_live_idle', 'ec_live_active'); popoutInd.classList.add('ec_live_loading'); }
    } else {
        indicator.removeClass('ec_live_active ec_live_loading').addClass('ec_live_idle');
        if (popoutInd) { popoutInd.classList.remove('ec_live_active', 'ec_live_loading'); popoutInd.classList.add('ec_live_idle'); }
    }
}

export function setDiscordText(html) {
    if (!state.discordContent) return;
    const chatBlock = jQuery('#chat');
    const originalScrollBottom = chatBlock.length ? chatBlock[0].scrollHeight - (chatBlock.scrollTop() + chatBlock.outerHeight()) : 0;
    jQuery(state.discordContent).html(html);
    if (state.discordContent[0]) state.discordContent[0].scrollTo({ top: 0, behavior: 'smooth' });
    if (chatBlock.length) chatBlock.scrollTop(chatBlock[0].scrollHeight - (chatBlock.outerHeight() + originalScrollBottom));
    if (state.floatingPanelOpen && state.popoutDiscordContent) {
        state.popoutDiscordContent.innerHTML = html;
        state.popoutDiscordContent.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

export function setStatus(html) {
    const overlays = jQuery('.ec_status_overlay');
    if (overlays.length > 0) {
        if (html) { overlays.html(html).addClass('active'); }
        else { overlays.removeClass('active'); setTimeout(() => overlays.each(function () { if (!jQuery(this).hasClass('active')) jQuery(this).empty(); }), 200); }
    }
}

export function updatePanelIcons() {
    if (!state.discordBar) return;
    const powerBtn = jQuery(state.discordBar).find('.ec_power_btn');
    powerBtn.toggleClass('ec_power_off', !!state.settings.paused).attr('title', state.settings.paused ? 'Resume EchoChamber' : 'Pause EchoChamber');
    const collapseBtn = jQuery(state.discordBar).find('.ec_collapse_btn i');
    collapseBtn.toggleClass('fa-chevron-up', !!state.settings.collapsed).toggleClass('fa-chevron-down', !state.settings.collapsed);
}

export function updateApplyLayout() {
    if (!state.discordBar) return;
    const bar = jQuery(state.discordBar); const content = jQuery(state.discordContent);
    if (!state.settings.enabled) { bar.hide(); return; }
    bar.show(); const pos = state.settings.position || 'bottom';
    bar.removeClass('ec_top ec_bottom ec_left ec_right ec_collapsed').addClass(`ec_${pos}`).detach();
    bar.css({ top: '', bottom: '', left: '', right: '', width: '', height: '' }); content.attr('style', '');
    const opacity = (state.settings.opacity || 85) / 100;
    bar.css('background', `rgba(20, 20, 25, ${opacity})`); jQuery(state.discordQuickBar).css('background', `rgba(0, 0, 0, ${opacity * 0.3})`);
    if (pos === 'bottom') {
        const sendForm = jQuery('#send_form');
        if (sendForm.length) { if (window.innerWidth <= 768) sendForm.before(bar); else sendForm.after(bar); }
        else { const fs = jQuery('#form_sheld'); if (fs.length) fs.append(bar); else jQuery('body').append(bar); }
        bar.css({ width: '100%', height: '' }); content.css({ 'height': `${state.settings.chatHeight || 200}px`, 'flex-grow': '0' });
    } else {
        jQuery('body').append(bar);
        if (pos === 'top') content.css({ 'height': `${state.settings.chatHeight || 200}px`, 'flex-grow': '0' });
        else { bar.css('width', `${state.settings.panelWidth || 350}px`); content.css({ 'height': '100%', 'flex-grow': '1' }); }
    }
    if (state.settings.collapsed) bar.addClass('ec_collapsed');
    if (state.settings.paused) bar.addClass('ec_disabled');
    updatePanelIcons();
}

export function initResizeLogic() {
    let isResizing = false; let startX, startY, startSize;
    jQuery(document).on('mousedown touchstart', '.ec_resize_handle', function (e) {
        e.preventDefault(); e.stopPropagation(); isResizing = true;
        startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX; startY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        const pos = state.settings.position; startSize = (pos === 'left' || pos === 'right') ? (state.settings.panelWidth || 350) : (state.settings.chatHeight || 200);
        jQuery('body').css('cursor', (pos === 'left' || pos === 'right') ? 'ew-resize' : 'ns-resize'); jQuery(this).addClass('resizing');
    });
    jQuery(document).on('mousemove touchmove', function (e) {
        if (!isResizing) return;
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX; const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        const deltaX = clientX - startX; const deltaY = clientY - startY; const pos = state.settings.position;
        if (pos === 'bottom') { state.settings.chatHeight = Math.max(80, Math.min(600, startSize - deltaY)); jQuery(state.discordContent).css('height', state.settings.chatHeight + 'px'); }
        else if (pos === 'top') { state.settings.chatHeight = Math.max(80, Math.min(600, startSize + deltaY)); jQuery(state.discordContent).css('height', state.settings.chatHeight + 'px'); }
        else if (pos === 'left') { state.settings.panelWidth = Math.max(200, Math.min(window.innerWidth - 50, startSize + deltaX)); jQuery(state.discordBar).css('width', state.settings.panelWidth + 'px'); }
        else if (pos === 'right') { state.settings.panelWidth = Math.max(200, Math.min(window.innerWidth - 50, startSize - deltaX)); jQuery(state.discordBar).css('width', state.settings.panelWidth + 'px'); }
    });
    jQuery(document).on('mouseup touchend', function () { if (isResizing) { isResizing = false; jQuery('.ec_resize_handle').removeClass('resizing'); jQuery('body').css('cursor', ''); saveSettings(); } });
}

export function updateStyleIndicator(indicator) {
    const ind = indicator || jQuery('#ec_style_indicator'); if (!ind.length) return;
    const currentStyle = state.settings.style || 'twitch'; const styles = getAllStyles();
    const styleObj = styles.find(s => s.val === currentStyle); const styleName = styleObj ? styleObj.label : currentStyle;
    ind.html(`<div class="ec_style_name">${styleName}</div><div class="ec_style_chevron"><i class="fa-solid fa-chevron-down"></i></div>`);
}

export function updateFloatStyleLabel() {
    const label = jQuery('.ec_float_style_label'); if (!label.length) return;
    const styles = getAllStyles(); const styleObj = styles.find(s => s.val === state.settings.style);
    label.text(styleObj ? styleObj.label : 'Style');
}

export function closePopoutWindow() {
    jQuery('#ec_floating_panel').remove(); jQuery('#ec_float_style_menu_body').remove();
    state.floatingPanelOpen = false; state.popoutDiscordContent = null;
}

export function openPopoutWindow() {
    if (state.floatingPanelOpen && jQuery('#ec_floating_panel').length) { jQuery('#ec_floating_panel').css('z-index', 9999); return; }
    const currentContent = state.discordContent ? jQuery(state.discordContent).html() : '';
    const chatInputHtml = state.settings.chatEnabled ? `<div class="ec_reply_container ec_float_reply_bar" id="ec_float_reply_bar"><div class="ec_reply_wrapper"><input type="text" class="ec_reply_input" placeholder="Type a message to participate..." id="ec_float_reply_field"><div class="ec_reply_send" id="ec_float_reply_submit" title="Send message"><i class="fa-solid fa-paper-plane"></i></div></div></div>` : '';
    const panelHtml = `<div id="ec_floating_panel" class="ec_floating_panel"><div class="ec_float_header" id="ec_float_drag_handle"><div class="ec_float_header_left"><span class="ec_float_title">EchoChamber</span><div class="ec_live_indicator" id="ec_float_live_indicator"><i class="fa-solid fa-circle"></i> LIVE</div></div><div class="ec_float_header_right"><div class="ec_float_btn" id="ec_float_dock_btn" title="Dock"><i class="fa-solid fa-arrow-up-right-from-square" style="transform:rotate(180deg)"></i></div></div></div><div class="ec_float_toolbar"><div class="ec_float_toolbar_left"><div class="ec_btn ec_float_style_btn" id="ec_float_style_indicator" title="Change Style"><i class="fa-solid fa-masks-theater"></i><span class="ec_float_style_label">Style</span><i class="fa-solid fa-caret-down ec_dropdown_arrow"></i><div class="ec_popup_menu ec_style_menu ec_float_style_menu"></div></div></div><div class="ec_float_toolbar_right"><div class="ec_btn ec_float_tool ec_float_refresh" title="Regenerate Chat"><i class="fa-solid fa-rotate-right"></i></div><div class="ec_btn ec_float_tool" title="User Count"><i class="fa-solid fa-users"></i><div class="ec_popup_menu ec_user_menu"></div></div><div class="ec_btn ec_float_tool" title="Font Size"><i class="fa-solid fa-font"></i><div class="ec_popup_menu ec_font_menu"></div></div><div class="ec_btn ec_float_tool ec_float_clear" title="Clear Chat & Cache"><i class="fa-solid fa-trash-can"></i></div><div class="ec_btn ec_float_tool ec_float_settings" title="Settings"><i class="fa-solid fa-gear"></i></div></div></div><div id="ec_float_status_overlay" class="ec_status_overlay"></div><div id="ec_float_content" class="ec_float_content">${currentContent}</div>${chatInputHtml}<div class="ec_float_resize_handle" data-corner="nw"></div><div class="ec_float_resize_handle" data-corner="ne"></div><div class="ec_float_resize_handle" data-corner="sw"></div><div class="ec_float_resize_handle" data-corner="se"></div></div>`;
    jQuery('body').append(panelHtml); const panel = jQuery('#ec_floating_panel');
    const panelW = state.settings.floatWidth || 420; const panelH = state.settings.floatHeight || 620;
    const defaultLeft = Math.max(20, window.innerWidth - panelW - 24); const defaultTop = 60;
    const restoredLeft = state.settings.floatLeft != null ? state.settings.floatLeft : defaultLeft;
    const restoredTop = state.settings.floatTop != null ? state.settings.floatTop : defaultTop;
    panel.css({ left: Math.max(0, Math.min(window.innerWidth - panelW, restoredLeft)) + 'px', top: Math.max(0, Math.min(window.innerHeight - 40, restoredTop)) + 'px', width: panelW + 'px', height: panelH + 'px' });
    state.floatingPanelOpen = true; state.popoutDiscordContent = document.getElementById('ec_float_content');
    makeDraggable(panel, jQuery('#ec_float_drag_handle')); makeFloatingPanelResizable(panel);
    const floatUserMenu = panel.find('.ec_float_toolbar .ec_user_menu'); for (let i = 1; i <= 20; i++) floatUserMenu.append(`<div class="ec_menu_item${i === (parseInt(state.settings.userCount)||5) ? ' selected' : ''}" data-val="${i}">${i} users</div>`);
    const floatFontMenu = panel.find('.ec_float_toolbar .ec_font_menu'); for (let i = 8; i <= 24; i++) floatFontMenu.append(`<div class="ec_menu_item${i === (state.settings.fontSize||15) ? ' selected' : ''}" data-val="${i}">${i}px</div>`);
    const floatStyleMenu = jQuery('#ec_float_style_indicator .ec_float_style_menu'); populateStyleMenu(floatStyleMenu); updateFloatStyleLabel();
    jQuery('#ec_float_style_menu_body').remove(); const fsmb = jQuery('<div id="ec_float_style_menu_body" class="ec_popup_menu ec_style_menu ec_indicator_menu"></div>'); jQuery('body').append(fsmb); populateStyleMenu(fsmb);
    jQuery('#ec_float_style_indicator').on('click.floatstyle', function (e) {
        e.stopPropagation(); const trigger = jQuery(this); const wasActive = trigger.hasClass('active');
        jQuery('.ec_btn').removeClass('open active'); jQuery('.ec_popup_menu').hide(); jQuery('#ec_style_menu_body').hide();
        if (!wasActive) {
            trigger.addClass('active open'); const rect = trigger[0].getBoundingClientRect();
            fsmb.css({ position: 'fixed', top: rect.bottom + 'px', left: rect.left + 'px', width: Math.max(rect.width, 180) + 'px', display: 'block', maxHeight: Math.min(300, window.innerHeight - rect.bottom - 10) + 'px', overflowY: 'auto' });
        } else { trigger.removeClass('active open'); fsmb.hide(); }
    });
    if (state.discordBar && !state.settings.collapsed) { state.settings.collapsed = true; jQuery(state.discordBar).addClass('ec_collapsed'); updatePanelIcons(); saveSettings(); }
    updateLiveIndicator();
    jQuery('#ec_float_live_indicator').on('click', function () {
        if (jQuery(this).hasClass('ec_live_loading')) { cancelGenerationContext(); updateLiveIndicator(); }
        else toggleLivestream(!state.settings.livestream);
    });
    jQuery('#ec_float_dock_btn').on('click', closePopoutWindow);
    jQuery('.ec_float_refresh').on('click', () => { jQuery('.ec_float_refresh i').addClass('fa-spin'); setTimeout(() => jQuery('.ec_float_refresh i').removeClass('fa-spin'), 1000); generateDiscordChat(true); });
    jQuery('.ec_float_clear').on('click', () => { showConfirmModal('Clear chat?').then(c => { if (c) { setDiscordText(''); clearCachedCommentary(); } }); });
    jQuery('.ec_float_settings').on('click', openSettingsModal);
    if (state.settings.chatEnabled) {
        const hfs = async () => { if (state.isGenerating) { cancelGenerationContext(); return; } const i = jQuery('#ec_float_reply_field'); const t = i.val().trim(); if (!t) return; i.val(''); const m = formatMessage(state.settings.chatUsername || 'Streamer (You)', t, true); const c = jQuery('#ec_float_content .discord_container'); if (c.length) c.prepend(m); else jQuery('#ec_float_content').html(`<div class="discord_container">${m}</div>`); jQuery('#ec_float_content').scrollTop(0); await generateSingleReply(t, t.match(/^@([^\s]+)/)?.[1]); };
        jQuery('#ec_float_reply_submit').on('click', hfs); jQuery('#ec_float_reply_field').on('keypress', e => { if (e.which == 13) hfs(); });
    }
}

export function renderPanel() {
    jQuery('#discordBar').remove();
    state.discordBar = jQuery('<div id="discordBar"></div>').appendTo(jQuery('#chat_container'))[0];
    state.discordQuickBar = jQuery('<div id="discordQuickSettings"></div>')[0];
    const leftGroup = jQuery('<div class="ec_header_left"></div>');
    const powerBtn = jQuery('<div class="ec_power_btn" title="Enable/Disable EchoChamber"><i class="fa-solid fa-power-off"></i></div>');
    const collapseBtn = jQuery('<div class="ec_collapse_btn" title="Collapse/Expand Panel"><i class="fa-solid fa-chevron-down"></i></div>');
    const liveIndicator = jQuery('<div class="ec_live_indicator" id="ec_live_indicator"><i class="fa-solid fa-circle"></i> LIVE</div>');
    leftGroup.append(powerBtn).append(collapseBtn).append(liveIndicator);
    const rightGroup = jQuery('<div class="ec_header_right"></div>');
    const createBtn = (icon, title, menuClass) => { const btn = jQuery(`<div class="ec_btn" title="${title}"><i class="${icon}"></i></div>`); if (menuClass) btn.append(`<div class="ec_popup_menu ${menuClass}"></div>`); return btn; };
    const refreshBtn = createBtn('fa-solid fa-rotate-right', 'Regenerate Chat', null);
    const layoutBtn = createBtn('fa-solid fa-table-columns', 'Panel Position', 'ec_layout_menu');
    const usersBtn = createBtn('fa-solid fa-users', 'User Count', 'ec_user_menu');
    const fontBtn = createBtn('fa-solid fa-font', 'Font Size', 'ec_font_menu');
    const clearBtn = createBtn('fa-solid fa-trash-can', 'Clear Chat & Cache', null);
    const settingsBtn = createBtn('fa-solid fa-gear', 'Settings', null);
    const overflowBtn = jQuery('<div class="ec_btn ec_overflow_btn" title="Actions"><i class="fa-solid fa-ellipsis-vertical"></i></div>');
    jQuery('#ec_overflow_menu_body').remove(); const overflowMenu = jQuery('<div id="ec_overflow_menu_body" class="ec_popup_menu ec_overflow_menu"></div>'); jQuery('body').append(overflowMenu);
    rightGroup.append(refreshBtn).append(layoutBtn).append(usersBtn).append(fontBtn).append(clearBtn).append(settingsBtn).append(overflowBtn);
    jQuery(state.discordQuickBar).append(leftGroup).append(rightGroup);
    const styleIndicator = jQuery('<div class="ec_style_indicator ec_style_dropdown_trigger" id="ec_style_indicator"></div>');
    jQuery('#ec_style_menu_body').remove(); const styleMenu = jQuery('<div id="ec_style_menu_body" class="ec_popup_menu ec_style_menu ec_indicator_menu"></div>'); jQuery('body').append(styleMenu);
    updateStyleIndicator(styleIndicator);
    const statusOverlay = jQuery('<div class="ec_status_overlay"></div>');
    state.discordContent = jQuery('<div id="discordContent"></div>')[0];
    const replyContainer = jQuery(`<div class="ec_reply_container"><div class="ec_reply_wrapper"><input type="text" class="ec_reply_input" placeholder="Type a message to participate..." id="ec_reply_field"><div class="ec_reply_send" id="ec_reply_submit" title="Send message"><i class="fa-solid fa-paper-plane"></i></div></div></div>`);
    const resizeHandle = jQuery('<div class="ec_resize_handle"></div>');
    jQuery(state.discordBar).append(state.discordQuickBar).append(styleIndicator).append(statusOverlay).append(state.discordContent).append(replyContainer).append(resizeHandle);
    const layoutMenu = layoutBtn.find('.ec_layout_menu'); const currentPos = state.settings.position || 'bottom';
    ['Top', 'Bottom', 'Left', 'Right'].forEach(pos => { const icon = pos === 'Top' ? 'up' : pos === 'Bottom' ? 'down' : pos === 'Left' ? 'left' : 'right'; const isSelected = pos.toLowerCase() === currentPos ? ' selected' : ''; layoutMenu.append(`<div class="ec_menu_item${isSelected}" data-val="${pos.toLowerCase()}"><i class="fa-solid fa-arrow-${icon}"></i> ${pos}</div>`); });
    layoutMenu.append(`<div class="ec_menu_item${currentPos === 'popout' ? ' selected' : ''}" data-val="popout"><i class="fa-solid fa-arrow-up-right-from-square"></i> Pop Out</div>`);
    const userMenu = usersBtn.find('.ec_user_menu'); const currentUsers = state.settings.userCount || 5;
    for (let i = 1; i <= 20; i++) userMenu.append(`<div class="ec_menu_item${i === currentUsers ? ' selected' : ''}" data-val="${i}">${i} users</div>`);
    const fontMenu = fontBtn.find('.ec_font_menu'); const currentFont = state.settings.fontSize || 15;
    for (let i = 8; i <= 24; i++) fontMenu.append(`<div class="ec_menu_item${i === currentFont ? ' selected' : ''}" data-val="${i}">${i}px</div>`);
    updateApplyLayout(); log('Panel rendered');
}

import { log } from './logger.js';
import { state } from '../constants.js';
import { saveSettings } from '../state/settingsManager.js';

/**
 * Simple debounce function
 */
export function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/**
 * Consolidate message cleaning logic
 */
export const cleanMessage = (text) => {
    if (!text) return '';
    let cleaned = text.replace(/<(thinking|think|thought|reasoning|reason)>[\s\S]*?<\/\1>/gi, '').trim();
    cleaned = cleaned.replace(/<[^>]*>/g, '');
    const txt = document.createElement("textarea");
    txt.innerHTML = cleaned;
    return txt.value;
};

/**
 * Shows a custom glassmorphism confirmation modal.
 */
export function showConfirmModal(message) {
    return new Promise((resolve) => {
        jQuery('#ec_confirm_modal').remove();
        const modalHtml = `
        <div id="ec_confirm_modal" class="ec_confirm_modal_overlay">
            <div class="ec_confirm_modal_card">
                <div class="ec_confirm_modal_icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <div class="ec_confirm_modal_message">${message}</div>
                <div class="ec_confirm_modal_actions">
                    <button class="ec_confirm_modal_btn ec_confirm_cancel" id="ec_confirm_cancel">Cancel</button>
                    <button class="ec_confirm_modal_btn ec_confirm_ok" id="ec_confirm_ok">Clear</button>
                </div>
            </div>
        </div>`;
        jQuery('body').append(modalHtml);
        requestAnimationFrame(() => jQuery('#ec_confirm_modal').addClass('ec_confirm_visible'));
        const cleanup = (result) => {
            jQuery('#ec_confirm_modal').removeClass('ec_confirm_visible');
            setTimeout(() => jQuery('#ec_confirm_modal').remove(), 200);
            resolve(result);
        };
        jQuery('#ec_confirm_ok').on('click', () => cleanup(true));
        jQuery('#ec_confirm_cancel').on('click', () => cleanup(false));
        jQuery('#ec_confirm_modal').on('click', function (e) { if (e.target === this) cleanup(false); });
        const onKey = (e) => {
            if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); cleanup(false); }
            if (e.key === 'Enter') { document.removeEventListener('keydown', onKey); cleanup(true); }
        };
        document.addEventListener('keydown', onKey);
    });
}

/**
 * Resolve a SillyTavern macro string
 */
export function resolveSTMacro(context, macro) {
    if (typeof context.substituteParams === 'function') {
        try {
            const resolved = context.substituteParams(macro);
            if (resolved !== macro) return resolved || '';
        } catch (e) { log('substituteParams failed for', macro, e); }
    }
    return '';
}

/**
 * Formats a message for display
 */
export function formatMessage(username, content, isUser = false) {
    const SillyTavern = window.SillyTavern;
    const { DOMPurify } = SillyTavern.libs;
    const s = state.settings;
    let color = isUser ? (s.chatAvatarColor || '#3b82f6') : `hsl(${Math.abs(username.split('').reduce((a,b)=>(((a<<5)-a)+b.charCodeAt(0))|0,0)) % 360}, 75%, 70%)`;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const safeUsername = DOMPurify.sanitize(username, { ALLOWED_TAGS: [] });
    const formattedContent = DOMPurify.sanitize(content, { ALLOWED_TAGS: [] })
        .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/__(.*?)__/g, '<u>$1</u>').replace(/_(.*?)_/g, '<em>$1</em>')
        .replace(/~~(.*?)~~/g, '<del>$1</del>').replace(/`(.+?)`/g, '<code>$1</code>');
    return `<div class="discord_message${isUser ? ' ec_user_message' : ''}"><div class="discord_avatar" style="background-color: ${color};">${safeUsername.substring(0, 1).toUpperCase()}</div><div class="discord_body"><div class="discord_header"><span class="discord_username" style="color: ${color};">${safeUsername}</span><span class="discord_timestamp">${time}</span></div><div class="discord_content">${formattedContent}</div></div></div>`;
}

/**
 * Get active characters
 */
export function getActiveCharacters(includeDisabled = false) {
    const context = window.SillyTavern.getContext();
    if (context.groupId && context.groups) {
        const group = context.groups.find(g => g.id === context.groupId);
        if (group && group.members) {
            const characters = group.members.map(id => context.characters.find(c => c.avatar === id)).filter(c => c);
            return includeDisabled ? characters : characters.filter(c => !group.disabled_members?.includes(c.avatar));
        }
    }
    return (context.characterId !== undefined && context.characters[context.characterId]) ? [context.characters[context.characterId]] : [];
}

/**
 * Make element draggable
 */
export function makeDraggable(element, handle) {
    let isDragging = false;
    let startX, startY, origLeft, origTop;
    handle[0].addEventListener('mousedown', (e) => {
        if (jQuery(e.target).closest('button, input, a, .ec_float_btn, .ec_live_indicator').length) return;
        isDragging = true;
        startX = e.clientX; startY = e.clientY;
        origLeft = parseInt(element.css('left'), 10); origTop = parseInt(element.css('top'), 10);
        jQuery('body').css('cursor', 'move'); e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const left = origLeft + (e.clientX - startX); const top = origTop + (e.clientY - startY);
        element.css({ left: left + 'px', top: top + 'px' });
    });
    window.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false; jQuery('body').css('cursor', '');
        state.settings.floatLeft = parseInt(element.css('left'), 10); state.settings.floatTop = parseInt(element.css('top'), 10);
        saveSettings();
    });
}

/**
 * Make floating panel resizable
 */
export function makeFloatingPanelResizable(panel) {
    panel.find('.ec_float_resize_handle').each(function () {
        const handle = this; const corner = handle.dataset.corner; let active = false;
        let startX, startY, startW, startH, startLeft, startTop;
        handle.addEventListener('mousedown', (e) => {
            active = true; startX = e.clientX; startY = e.clientY;
            startW = panel.outerWidth(); startH = panel.outerHeight();
            startLeft = parseInt(panel.css('left'), 10); startTop = parseInt(panel.css('top'), 10);
            jQuery('body').css('cursor', corner + '-resize'); e.preventDefault(); e.stopPropagation();
        });
        window.addEventListener('mousemove', (e) => {
            if (!active) return;
            let newW = startW, newH = startH, newL = startLeft, newT = startTop;
            const dX = e.clientX - startX, dY = e.clientY - startY;
            if (corner.includes('e')) newW = startW + dX; if (corner.includes('w')) { newW = startW - dX; newL = startLeft + dX; }
            if (corner.includes('s')) newH = startH + dY; if (corner.includes('n')) { newH = startH - dY; newT = startTop + dY; }
            newW = Math.max(280, newW); newH = Math.max(200, newH);
            panel.css({ width: newW + 'px', height: newH + 'px', left: newL + 'px', top: newT + 'px' });
        });
        window.addEventListener('mouseup', () => {
            if (!active) return;
            active = false; jQuery('body').css('cursor', '');
            state.settings.floatWidth = panel.outerWidth(); state.settings.floatHeight = panel.outerHeight();
            state.settings.floatLeft = parseInt(panel.css('left'), 10); state.settings.floatTop = parseInt(panel.css('top'), 10);
            saveSettings();
        });
    });
}

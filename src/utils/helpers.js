import { log } from './logger.js';

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
    // Strip all thinking/reasoning tags: thinking, think, thought, reasoning, reason
    let cleaned = text.replace(/<(thinking|think|thought|reasoning|reason)>[\s\S]*?<\/\1>/gi, '').trim();
    cleaned = cleaned.replace(/<[^>]*>/g, '');
    const txt = document.createElement("textarea");
    txt.innerHTML = cleaned;
    return txt.value;
};

/**
 * Shows a custom glassmorphism confirmation modal.
 * Returns a Promise<boolean> — resolves true on Confirm, false on Cancel.
 */
export function showConfirmModal(message) {
    return new Promise((resolve) => {
        // Remove any existing modal
        jQuery('#ec_confirm_modal').remove();

        const modalHtml = `
        <div id="ec_confirm_modal" class="ec_confirm_modal_overlay">
            <div class="ec_confirm_modal_card">
                <div class="ec_confirm_modal_icon">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                </div>
                <div class="ec_confirm_modal_message">${message}</div>
                <div class="ec_confirm_modal_actions">
                    <button class="ec_confirm_modal_btn ec_confirm_cancel" id="ec_confirm_cancel">Cancel</button>
                    <button class="ec_confirm_modal_btn ec_confirm_ok" id="ec_confirm_ok">Clear</button>
                </div>
            </div>
        </div>`;

        jQuery('body').append(modalHtml);

        // Animate in
        requestAnimationFrame(() => {
            jQuery('#ec_confirm_modal').addClass('ec_confirm_visible');
        });

        const cleanup = (result) => {
            const overlay = jQuery('#ec_confirm_modal');
            overlay.removeClass('ec_confirm_visible');
            setTimeout(() => overlay.remove(), 200);
            resolve(result);
        };

        jQuery('#ec_confirm_ok').on('click', () => cleanup(true));
        jQuery('#ec_confirm_cancel').on('click', () => cleanup(false));
        // Click backdrop to cancel
        jQuery('#ec_confirm_modal').on('click', function (e) {
            if (e.target === this) cleanup(false);
        });
        // ESC key to cancel
        const onKey = (e) => {
            if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); cleanup(false); }
            if (e.key === 'Enter') { document.removeEventListener('keydown', onKey); cleanup(true); }
        };
        document.addEventListener('keydown', onKey);
    });
}

/**
 * Resolve a SillyTavern macro string to its current value
 */
export function resolveSTMacro(context, macro) {
    // 1. ST's own substituteParams — handles every registered macro
    if (typeof context.substituteParams === 'function') {
        try {
            const resolved = context.substituteParams(macro);
            // substituteParams returns the literal token when no value is registered
            if (resolved !== macro) return resolved || '';
        } catch (e) {
            log('substituteParams failed for', macro, e);
        }
    }

    // 2. Source-specific fallbacks
    try {
        if (macro === '{{persona}}') {
            const pu = context.powerUser;
            if (pu && pu.personas) {
                const activeKey = pu.default_persona || context.name1 || '';
                const desc = pu.personas[activeKey] && pu.personas[activeKey].description;
                if (desc) return desc;
                // Last resort: first persona that has a description
                for (const key of Object.keys(pu.personas)) {
                    if (pu.personas[key] && pu.personas[key].description)
                        return pu.personas[key].description;
                }
            }
        }

        if (macro === '{{authorsNote}}') {
            const cm = context.chatMetadata;
            if (cm) {
                if (cm.note_to_self && typeof cm.note_to_self === 'object' && cm.note_to_self.note) {
                    return cm.note_to_self.note;
                }
                if (cm.note_to_self && typeof cm.note_to_self === 'string' && cm.note_to_self.trim()) {
                    return cm.note_to_self;
                }
                if (cm.authornote_prompt && typeof cm.authornote_prompt === 'string') {
                    return cm.authornote_prompt;
                }
            }
            const es = context.extensionSettings;
            if (es && es.note_to_self) {
                if (typeof es.note_to_self === 'object') {
                    return es.note_to_self.default_note || es.note_to_self.note || es.note_to_self.content || '';
                }
                if (typeof es.note_to_self === 'string') return es.note_to_self;
            }
            return '';
        }
    } catch (e) {
        log('Fallback macro resolution failed for', macro, e);
    }

    return '';
}

/**
 * Formats a message for display in the chat feed
 */
export function formatMessage(username, content, isUser = false) {
    const SillyTavern = window.SillyTavern;
    const { DOMPurify } = SillyTavern.libs;
    const state = window.SillyTavern.getContext().extensionSettings['discord_chat']; // Fallback to settings

    let color;
    if (isUser) {
        color = state.chatAvatarColor || '#3b82f6';
    } else {
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        color = `hsl(${Math.abs(hash) % 360}, 75%, 70%)`;
    }
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const safeUsername = DOMPurify.sanitize(username, { ALLOWED_TAGS: [] });
    const safeContent = DOMPurify.sanitize(content, { ALLOWED_TAGS: [] });

    const formattedContent = safeContent
        .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/__(.*?)__/g, '<u>$1</u>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
        .replace(/~~(.*?)~~/g, '<del>$1</del>')
        .replace(/`(.+?)`/g, '<code>$1</code>');

    const userClass = isUser ? ' ec_user_message' : '';

    return `
    <div class="discord_message${userClass}">
        <div class="discord_avatar" style="background-color: ${color};">${safeUsername.substring(0, 1).toUpperCase()}</div>
        <div class="discord_body">
            <div class="discord_header">
                <span class="discord_username" style="color: ${color};">${safeUsername}</span>
                <span class="discord_timestamp">${time}</span>
            </div>
            <div class="discord_content">${formattedContent}</div>
        </div>
    </div>`;
}

/**
 * Get active characters in the current chat
 */
export function getActiveCharacters(includeDisabled = false) {
...
    const SillyTavern = window.SillyTavern;
    if (!SillyTavern || !SillyTavern.getContext) return [];

    const context = SillyTavern.getContext();

    // Check if we're in a group chat
    if (context.groupId && context.groups) {
        const group = context.groups.find(g => g.id === context.groupId);
        if (group && group.members) {
            const characters = group.members
                .map(memberId => context.characters.find(c => c.avatar === memberId))
                .filter(char => char !== undefined);

            if (includeDisabled) {
                return characters;
            }

            // Filter out disabled characters
            return characters.filter(char => !group.disabled_members?.includes(char.avatar));
        }
    }

    // Single character chat - return character at current index
    if (context.characterId !== undefined && context.characters[context.characterId]) {
        return [context.characters[context.characterId]];
    }

    return [];
}

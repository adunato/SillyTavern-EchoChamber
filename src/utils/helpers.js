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
...
    return '';
}

/**
 * Get active characters in the current chat
 */
export function getActiveCharacters(includeDisabled = false) {
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

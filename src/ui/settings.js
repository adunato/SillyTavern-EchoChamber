import { state } from '../constants.js';

export function applyFontSize(size) {
    let styleEl = jQuery('#discord_font_size_style');
    if (styleEl.length === 0) {
        styleEl = jQuery('<style id="discord_font_size_style"></style>').appendTo('head');
    }
    styleEl.text(`
        .discord_container { font-size: ${size}px !important; }
        .discord_username { font-size: ${size / 15}rem !important; }
        .discord_content { font-size: ${(size / 15) * 0.95}rem !important; }
        .discord_timestamp { font-size: ${(size / 15) * 0.75}rem !important; }
    `);
}

export function applyAvatarColor(color) {
    // Set the CSS variable on the document root so all user-message elements pick it up
    document.documentElement.style.setProperty('--ec-user-avatar-color', color);
}

export function updateSourceVisibility() {
    jQuery('#discord_ollama_settings').hide();
    jQuery('#discord_openai_settings').hide();
    jQuery('#discord_profile_settings').hide();

    const source = state.settings.source || 'default';
    if (source === 'ollama') {
        jQuery('#discord_ollama_settings').show();
    } else if (source === 'openai') {
        jQuery('#discord_openai_settings').show();
    } else if (source === 'profile') {
        jQuery('#discord_profile_settings').show();
    }
}

export function updatePopoutVisibility() {
    const isMobile = window.innerWidth <= 768;

    // Hide in settings dropdown
    jQuery('.ec_menu_item[data-val="popout"]').toggle(!isMobile);

    // Hide in settings panel select
    jQuery('#discord_position option[value="popout"]').toggle(!isMobile);
}

// Placeholder for updateAllDropdowns - needs getAllStyles
export function updateAllDropdowns() {
    // This will be implemented when styles.js is ready
}

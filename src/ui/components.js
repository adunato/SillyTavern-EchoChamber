import { state } from '../constants.js';
import { getAllStyles } from '../core/styles.js';

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

    // This will be a large function containing all $(document).on listeners
    // Moving them here keeps index.js clean
}

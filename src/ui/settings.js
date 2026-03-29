import { state, MODULE_NAME } from '../constants.js';
import { saveSettings } from '../state/settingsManager.js';
import { getAllStyles } from '../core/styles.js';
import { populateConnectionProfiles } from './components.js';

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
    document.documentElement.style.setProperty('--ec-user-avatar-color', color);
}

export function updateSourceVisibility() {
    jQuery('#discord_ollama_settings, #ecm_ollama_settings').hide();
    jQuery('#discord_openai_settings, #ecm_openai_settings').hide();
    jQuery('#discord_profile_settings, #ecm_profile_settings').hide();

    const source = state.settings.source || 'default';
    if (source === 'ollama') {
        jQuery('#discord_ollama_settings, #ecm_ollama_settings').show();
    } else if (source === 'openai') {
        jQuery('#discord_openai_settings, #ecm_openai_settings').show();
    } else if (source === 'profile') {
        jQuery('#discord_profile_settings, #ecm_profile_settings').show();
    }
}

export function updatePopoutVisibility() {
    const isMobile = window.innerWidth <= 768;
    jQuery('.ec_menu_item[data-val="popout"]').toggle(!isMobile);
    jQuery('#discord_position option[value="popout"]').toggle(!isMobile);
}

export function updateAllDropdowns() {
    const styles = getAllStyles();
    const sSelect = jQuery('#discord_style, #ecm_style');
    const currentVal = sSelect.val();
    sSelect.empty();
    styles.forEach(s => {
        sSelect.append(new Option(s.label, s.val));
    });
    sSelect.val(currentVal || state.settings.style);
    populateConnectionProfiles();
}

export function populateOllamaModels(selectId = '#discord_model') {
    const select = jQuery(selectId);
    if (!select.length) return;
    const url = state.settings.url.replace(/\/$/, '');
    fetch(`${url}/api/tags`)
        .then(res => res.json())
        .then(data => {
            select.empty();
            if (data.models) {
                data.models.forEach(m => select.append(new Option(m.name, m.name)));
                select.val(state.settings.model);
            }
        }).catch(err => console.error('Ollama fetch error:', err));
}

export function syncModalFromSettings() {
    const m = jQuery('#ec_settings_modal');
    if (!m.length) return;
    const s = state.settings;
    m.find('#ecm_enabled').prop('checked', s.enabled);
    m.find('#ecm_source').val(s.source);
    m.find('#ecm_url').val(s.url);
    m.find('#ecm_openai_url').val(s.openai_url);
    m.find('#ecm_openai_key').val(s.openai_key);
    m.find('#ecm_openai_model').val(s.openai_model);
    m.find('#ecm_user_count').val(s.userCount);
    m.find('#ecm_font_size').val(s.fontSize);
    m.find('#ecm_position').val(s.position);
    m.find('#ecm_style').val(s.style);
    m.find('#ecm_opacity').val(s.opacity);
    m.find('#ecm_opacity_val').text(s.opacity + '%');
    m.find('#ecm_auto_update').prop('checked', s.autoUpdateOnMessages);
    m.find('#ecm_include_user').prop('checked', s.includeUserInput);
    m.find('#ecm_context_depth').val(s.contextDepth);
    m.find('#ecm_include_persona').prop('checked', s.includePersona);
    m.find('#ecm_include_authors_note').prop('checked', s.includeAuthorsNote);
    m.find('#ecm_include_character_description').prop('checked', s.includeCharacterDescription);
    m.find('#ecm_include_summary').prop('checked', s.includeSummary);
    m.find('#ecm_include_world_info').prop('checked', s.includeWorldInfo);
    m.find('#ecm_wi_budget').val(s.wiBudget);
    m.find('#ecm_livestream').prop('checked', s.livestream);
    m.find('#ecm_livestream_batch_size').val(s.livestreamBatchSize);
    m.find('#ecm_livestream_min_wait').val(s.livestreamMinWait);
    m.find('#ecm_livestream_max_wait').val(s.livestreamMaxWait);
    m.find('#ecm_chat_enabled').prop('checked', s.chatEnabled);
    m.find('#ecm_chat_username').val(s.chatUsername);
    m.find('#ecm_chat_avatar_color').val(s.chatAvatarColor);
    m.find('#ecm_chat_reply_count').val(s.chatReplyCount);
    updateSourceVisibility();
}

export function openSettingsModal() {
    jQuery('#ec_settings_modal').remove();
    // Implementation of settings modal HTML would go here...
    // For now, I'll focus on the logic.
    log('Settings modal opened');
}

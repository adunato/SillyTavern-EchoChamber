import { state, MODULE_NAME } from '../constants.js';
import { log, warn, error } from '../utils/logger.js';
import { saveSettings } from '../state/settingsManager.js';
import { getAllStyles } from '../core/styles.js';
import { populateConnectionProfiles } from './components.js';
import { updateApplyLayout, applyFontSize, updateStyleIndicator, updateLiveIndicator } from './panel.js';
import { toggleLivestream } from '../state/chatState.js';
import { openStyleEditor } from './styleEditor.js';

export function applyFontSizeUI(size) {
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
    const url = (state.settings.url || 'http://localhost:11434').replace(/\/$/, '');
    fetch(`${url}/api/tags`)
        .then(res => res.json())
        .then(data => {
            select.empty();
            if (data.models) {
                data.models.forEach(m => select.append(new Option(m.name, m.name)));
                select.val(state.settings.model);
            }
        }).catch(err => log('Ollama models fetch failed (expected if local server not running)'));
}

export function closeSettingsModal() {
    const modal = jQuery('#ec_settings_modal');
    modal.trigger('ecm:close');
    modal.removeClass('ecm_visible');
    jQuery(document).off('keydown.ecm');
    setTimeout(() => modal.remove(), 300);
}

function syncToPanel(panelId, value, isProp = false) {
    const el = jQuery(`#${panelId}`);
    if (!el.length) return;
    if (isProp) {
        el.prop('checked', value).trigger('change');
    } else {
        el.val(value).trigger('change');
    }
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
    m.find('#ecm_openai_preset').val(s.openai_preset);
    m.find('#ecm_model_select').val(s.model);
    m.find('#ecm_preset_select').val(s.preset);
    m.find('#ecm_style').val(s.style);
    m.find('#ecm_position').val(s.position);
    m.find('#ecm_user_count').val(s.userCount);
    m.find('#ecm_font_size').val(s.fontSize);
    m.find('#ecm_opacity').val(s.opacity);
    m.find('#ecm_opacity_val').text((s.opacity || 85) + '%');
    m.find('#ecm_auto_update').prop('checked', s.autoUpdateOnMessages !== false);
    m.find('#ecm_include_user').prop('checked', s.includeUserInput);
    m.find('#ecm_context_depth').val(s.contextDepth);
    m.find('#ecm_context_depth_container').toggle(!!s.includeUserInput);
    m.find('#ecm_include_past_echo').prop('checked', s.includePastEchoChambers);
    m.find('#ecm_include_persona').prop('checked', s.includePersona);
    m.find('#ecm_include_authors_note').prop('checked', s.includeAuthorsNote);
    m.find('#ecm_include_character_description').prop('checked', s.includeCharacterDescription);
    m.find('#ecm_include_summary').prop('checked', s.includeSummary);
    m.find('#ecm_include_world_info').prop('checked', s.includeWorldInfo);
    m.find('#ecm_wi_budget').val(s.wiBudget);
    m.find('#ecm_wi_budget_container').toggle(!!s.includeWorldInfo);
    m.find('#ecm_livestream').prop('checked', s.livestream);
    m.find('#ecm_livestream_settings').toggle(!!s.livestream);
    m.find('#ecm_livestream_batch_size').val(s.livestreamBatchSize);
    m.find('#ecm_livestream_min_wait').val(s.livestreamMinWait);
    m.find('#ecm_livestream_max_wait').val(s.livestreamMaxWait);
    const mode = s.livestreamMode || 'manual';
    m.find(`input[name="ecm_livestream_mode"][value="${mode}"]`).prop('checked', true);
    m.find('#ecm_chat_enabled').prop('checked', s.chatEnabled !== false);
    m.find('#ecm_chat_username').val(s.chatUsername || 'Streamer (You)');
    m.find('#ecm_chat_avatar_color').val(s.chatAvatarColor || '#3b82f6');
    m.find('#ecm_chat_reply_count').val(s.chatReplyCount || 3);
    updateSourceVisibility();
}

export function openSettingsModal() {
    jQuery('#ec_settings_modal').remove();
    const isMobileDevice = window.innerWidth <= 768;
    if (isMobileDevice && state.floatingPanelOpen) {
        jQuery('#ec_floating_panel').hide();
    }

    const styles = getAllStyles();
    const s = state.settings;
    const styleOptions = styles.map(st => `<option value="${st.val}"${s.style === st.val ? ' selected' : ''}>${st.label}</option>`).join('');
    const ollamaVisible = s.source === 'ollama' ? '' : 'display:none;';
    const openaiVisible = s.source === 'openai' ? '' : 'display:none;';
    const profileVisible = s.source === 'profile' ? '' : 'display:none;';
    const contextDepthVisible = s.includeUserInput ? '' : 'display:none;';
    const wibudgetVisible = s.includeWorldInfo ? '' : 'display:none;';
    const livestreamVisible = s.livestream ? '' : 'display:none;';

    const modal = jQuery(`
<div id="ec_settings_modal" role="dialog" aria-modal="true" aria-label="EchoChamber Settings">
  <div class="ecm_backdrop"></div>
  <div class="ecm_card">
    <div class="ecm_header">
      <div class="ecm_header_title"><i class="fa-solid fa-gear"></i> EchoChamber Settings</div>
      <div class="ecm_close_btn" id="ecm_close" title="Close"><i class="fa-solid fa-xmark"></i></div>
    </div>
    <div class="ecm_layout">
      <nav class="ecm_sidebar">
        <ul class="ecm_nav_list">
          <li><a class="ecm_nav_item" data-target="ecm-sect-general"><i class="fa-solid fa-power-off"></i><span>General</span></a></li>
          <li><a class="ecm_nav_item" data-target="ecm-sect-engine"><i class="fa-solid fa-microchip"></i><span>Generation Engine</span></a></li>
          <li><a class="ecm_nav_item" data-target="ecm-sect-display"><i class="fa-solid fa-sliders"></i><span>Display</span></a></li>
          <li><a class="ecm_nav_item" data-target="ecm-sect-content"><i class="fa-solid fa-list-check"></i><span>Content Settings</span></a></li>
          <li><a class="ecm_nav_item" data-target="ecm-sect-livestream"><i class="fa-solid fa-tower-broadcast"></i><span>Livestream</span></a></li>
          <li><a class="ecm_nav_item" data-target="ecm-sect-chat"><i class="fa-solid fa-reply"></i><span>Chat Participation</span></a></li>
        </ul>
      </nav>
      <div class="ecm_content" id="ecm_content_pane">
        <section class="ecm_section ecm_acc" data-acc-open id="ecm-sect-general">
          <button class="ecm_acc_header"><span class="ecm_acc_title"><i class="fa-solid fa-power-off"></i> General</span><i class="ecm_acc_chevron fa-solid fa-chevron-down"></i></button>
          <div class="ecm_acc_body" hidden>
            <label class="ecm_row ecm_toggle_row" for="ecm_enabled"><span class="ecm_label">Enable EchoChamber</span><input id="ecm_enabled" type="checkbox" class="ecm_toggle"${s.enabled ? ' checked' : ''}></label>
          </div>
        </section>
        <section class="ecm_section ecm_acc" id="ecm-sect-engine">
          <button class="ecm_acc_header"><span class="ecm_acc_title"><i class="fa-solid fa-microchip"></i> Generation Engine</span><i class="ecm_acc_chevron fa-solid fa-chevron-down"></i></button>
          <div class="ecm_acc_body" hidden>
            <div class="ecm_row"><label class="ecm_label" for="ecm_source">Source</label><select id="ecm_source" class="ecm_select"><option value="default"${s.source === 'default' ? ' selected' : ''}>Default (Main API)</option><option value="profile"${s.source === 'profile' ? ' selected' : ''}>Connection Profile</option><option value="ollama"${s.source === 'ollama' ? ' selected' : ''}>Ollama (Local)</option><option value="openai"${s.source === 'openai' ? ' selected' : ''}>OpenAI Compatible</option></select></div>
            <div id="ecm_ollama_settings" class="ecm_subpanel ecm_subpanel_green" style="${ollamaVisible}"><div class="ecm_subpanel_title">Ollama</div><input id="ecm_url" type="text" class="ecm_input" placeholder="http://localhost:11434" value="${s.url || ''}"><select id="ecm_model_select" class="ecm_select"></select></div>
            <div id="ecm_openai_settings" class="ecm_subpanel ecm_subpanel_blue" style="${openaiVisible}"><div class="ecm_subpanel_title">OpenAI</div><input id="ecm_openai_url" type="text" class="ecm_input" value="${s.openai_url || ''}"><input id="ecm_openai_key" type="password" class="ecm_input" value="${s.openai_key || ''}"><input id="ecm_openai_model" type="text" class="ecm_input" value="${s.openai_model || ''}"></div>
            <div id="ecm_profile_settings" class="ecm_subpanel ecm_subpanel_purple" style="${profileVisible}"><div class="ecm_subpanel_title">Profile</div><select id="ecm_preset_select" class="ecm_select"></select></div>
          </div>
        </section>
        <section class="ecm_section ecm_acc" id="ecm-sect-display">
          <button class="ecm_acc_header"><span class="ecm_acc_title"><i class="fa-solid fa-sliders"></i> Display</span><i class="ecm_acc_chevron fa-solid fa-chevron-down"></i></button>
          <div class="ecm_acc_body" hidden>
            <div class="ecm_row"><label class="ecm_label">Style</label><select id="ecm_style" class="ecm_select">${styleOptions}</select></div>
            <div class="ecm_row"><label class="ecm_label">Position</label><select id="ecm_position" class="ecm_select"><option value="bottom"${s.position === 'bottom' ? ' selected' : ''}>Bottom</option><option value="top"${s.position === 'top' ? ' selected' : ''}>Top</option><option value="left"${s.position === 'left' ? ' selected' : ''}>Left</option><option value="right"${s.position === 'right' ? ' selected' : ''}>Right</option></select></div>
            <div class="ecm_row"><label class="ecm_label">Users</label><select id="ecm_user_count" class="ecm_select">${Array.from({length:20},(_,i)=>i+1).map(n=>`<option value="${n}"${s.userCount==n?' selected':''}>${n}</option>`).join('')}</select></div>
            <div class="ecm_row"><label class="ecm_label">Font Size</label><select id="ecm_font_size" class="ecm_select">${Array.from({length:17},(_,i)=>i+8).map(n=>`<option value="${n}"${s.fontSize==n?' selected':''}>${n}</option>`).join('')}</select></div>
            <div class="ecm_row"><label class="ecm_label">Opacity <span id="ecm_opacity_val">${s.opacity}%</span></label><input id="ecm_opacity" type="range" class="ecm_slider" min="10" max="100" step="5" value="${s.opacity}"></div>
          </div>
        </section>
        <section class="ecm_section ecm_acc" id="ecm-sect-content">
          <button class="ecm_acc_header"><span class="ecm_acc_title"><i class="fa-solid fa-list-check"></i> Content Settings</span><i class="ecm_acc_chevron fa-solid fa-chevron-down"></i></button>
          <div class="ecm_acc_body" hidden>
            <label class="ecm_row ecm_toggle_row"><span class="ecm_label">Auto-update</span><input id="ecm_auto_update" type="checkbox" class="ecm_toggle"${s.autoUpdateOnMessages?' checked':''}></label>
            <label class="ecm_row ecm_toggle_row"><span class="ecm_label">Include History</span><input id="ecm_include_user" type="checkbox" class="ecm_toggle"${s.includeUserInput?' checked':''}></label>
            <div id="ecm_context_depth_container" style="${contextDepthVisible}"><label>Depth</label><input id="ecm_context_depth" type="number" class="ecm_input" value="${s.contextDepth||4}"></div>
            <label class="ecm_row ecm_toggle_row"><span class="ecm_label">Persona</span><input id="ecm_include_persona" type="checkbox" class="ecm_toggle"${s.includePersona?' checked':''}></label>
            <label class="ecm_row ecm_toggle_row"><span class="ecm_label">Author's Note</span><input id="ecm_include_authors_note" type="checkbox" class="ecm_toggle"${s.includeAuthorsNote?' checked':''}></label>
            <label class="ecm_row ecm_toggle_row"><span class="ecm_label">WI / Lorebook</span><input id="ecm_include_world_info" type="checkbox" class="ecm_toggle"${s.includeWorldInfo?' checked':''}></label>
          </div>
        </section>
        <section class="ecm_section ecm_acc" id="ecm-sect-livestream">
          <button class="ecm_acc_header"><span class="ecm_acc_title">Livestream</span><i class="ecm_acc_chevron fa-solid fa-chevron-down"></i></button>
          <div class="ecm_acc_body" hidden>
            <label class="ecm_row ecm_toggle_row"><span class="ecm_label">Enable</span><input id="ecm_livestream" type="checkbox" class="ecm_toggle"${s.livestream?' checked':''}></label>
            <div id="ecm_livestream_settings" style="${livestreamVisible}">
              <div class="ecm_row"><label>Batch Size</label><input id="ecm_livestream_batch_size" type="number" class="ecm_input" value="${s.livestreamBatchSize||20}"></div>
              <div class="ecm_row"><label>Min Wait</label><input id="ecm_livestream_min_wait" type="number" class="ecm_input" value="${s.livestreamMinWait||5}"></div>
              <div class="ecm_row"><label>Max Wait</label><input id="ecm_livestream_max_wait" type="number" class="ecm_input" value="${s.livestreamMaxWait||60}"></div>
            </div>
          </div>
        </section>
        <section class="ecm_section ecm_acc" id="ecm-sect-chat">
          <button class="ecm_acc_header"><span class="ecm_acc_title">Chat Participation</span><i class="ecm_acc_chevron fa-solid fa-chevron-down"></i></button>
          <div class="ecm_acc_body" hidden>
            <label class="ecm_row ecm_toggle_row"><span class="ecm_label">Enable</span><input id="ecm_chat_enabled" type="checkbox" class="ecm_toggle"${s.chatEnabled!==false?' checked':''}></label>
            <div class="ecm_row"><label>Username</label><input id="ecm_chat_username" type="text" class="ecm_input" value="${s.chatUsername||'Streamer (You)'}"></div>
            <div class="ecm_row"><label>Avatar Color</label><input id="ecm_chat_avatar_color" type="color" value="${s.chatAvatarColor||'#3b82f6'}"></div>
          </div>
        </section>
      </div>
    </div>
    <div class="ecm_footer">
      <div class="ecm_footer_left"><button class="ecm_footer_btn" id="ecm_style_manager_btn">Style Manager</button></div>
      <div class="ecm_footer_right"><button class="ecm_done_btn" id="ecm_done">Done</button></div>
    </div>
  </div>
</div>`);

    jQuery('body').append(modal);
    populateOllamaModels('#ecm_model_select');
    
    // Populate connection profile select from existing settings panel
    const existingProfiles = jQuery('#discord_preset_select option');
    existingProfiles.each(function () {
        const opt = jQuery(this).clone();
        if (jQuery(this).val() === s.preset) opt.prop('selected', true);
        jQuery('#ecm_preset_select').append(opt);
    });

    requestAnimationFrame(() => modal.addClass('ecm_visible'));

    modal.find('.ecm_backdrop, #ecm_close, #ecm_done').on('click', closeSettingsModal);
    modal.find('#ecm_style_manager_btn').on('click', () => { closeSettingsModal(); setTimeout(() => openStyleEditor(), 320); });

    // Sidebar navigation and accordion logic...
    const isMobile = () => window.innerWidth <= 768;
    if (!isMobile()) {
        modal.find('.ecm_acc_body').each(function () { this.hidden = false; });
        modal.find('.ecm_nav_item').on('click', function() {
            const target = this.dataset.target;
            const sect = document.getElementById(target);
            if (sect) sect.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    } else {
        modal.find('.ecm_acc_header').on('click', function() {
            const body = this.nextElementSibling;
            body.hidden = !body.hidden;
        });
    }

    // Sync handlers
    modal.on('change', '#ecm_enabled', function () { syncToPanel('discord_enabled', this.checked, true); });
    modal.on('change', '#ecm_source', function () {
        const val = jQuery(this).val();
        syncToPanel('discord_source', val);
        modal.find('#ecm_ollama_settings').toggle(val === 'ollama');
        modal.find('#ecm_openai_settings').toggle(val === 'openai');
        modal.find('#ecm_profile_settings').toggle(val === 'profile');
    });
    modal.on('change', '#ecm_style', function () {
        const val = jQuery(this).val();
        state.settings.style = val;
        saveSettings();
        updateStyleIndicator();
        syncToPanel('discord_style', val);
    });
    modal.on('change', '#ecm_position', function () {
        const val = jQuery(this).val();
        state.settings.position = val;
        saveSettings();
        updateApplyLayout();
        syncToPanel('discord_position', val);
    });
    modal.on('change', '#ecm_user_count', function () {
        const val = parseInt(jQuery(this).val());
        state.settings.userCount = val;
        saveSettings();
        syncToPanel('discord_user_count', val);
    });
    modal.on('change', '#ecm_font_size', function () {
        const val = parseInt(jQuery(this).val());
        state.settings.fontSize = val;
        applyFontSize(val);
        saveSettings();
        syncToPanel('discord_font_size', val);
    });
    modal.on('input change', '#ecm_opacity', function () {
        const val = parseInt(jQuery(this).val());
        state.settings.opacity = val;
        modal.find('#ecm_opacity_val').text(val + '%');
        syncToPanel('discord_opacity', val);
    });
}

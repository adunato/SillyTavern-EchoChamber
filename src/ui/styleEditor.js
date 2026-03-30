import { state, BASE_URL, STYLE_FILES } from '../constants.js';
import { log, warn } from '../utils/logger.js';
import { getAllStyles, loadChatStyle, getPromptCache } from '../core/styles.js';
import { saveSettings } from '../state/settingsManager.js';
import { updateAllDropdowns, updateFloatStyleLabel } from './settings.js';
import { updateStyleIndicator } from './panel.js';

let currentEditingStyle = null;
let styleEditorModal = null;

function showEmptyState() {
    jQuery('#ec_style_main').html(`
        <div class="ec_empty_state">
            <i class="fa-solid fa-palette"></i>
            <div>Select a style to edit or create a new one</div>
        </div>
    `);
    jQuery('#ec_style_save, #ec_style_delete, #ec_style_export').hide();
}

function closeStyleEditor() {
    if (styleEditorModal) {
        styleEditorModal.removeClass('active');
    }
    currentEditingStyle = null;
    updateAllDropdowns();
}

function saveStyleOrder() {
    const list = jQuery('#ec_style_list');
    const order = [];
    list.find('.ec_style_item').each(function() {
        order.push(this.dataset.id);
    });
    state.settings.style_order = order;
    saveSettings();
}

function saveStyleFromEditor() {
    if (!currentEditingStyle) return;
    const name = jQuery('#ec_style_name').val().trim();
    const content = jQuery('#ec_style_content').val();
    const type = jQuery('#ec_style_type').val() || 'chat stream';
    if (!name) { if (typeof toastr !== 'undefined') toastr.error('Style name cannot be empty'); return; }
    const isCustom = state.settings.custom_styles && state.settings.custom_styles[currentEditingStyle];
    if (isCustom) {
        state.settings.custom_styles[currentEditingStyle].name = name;
        state.settings.custom_styles[currentEditingStyle].prompt = content;
        state.settings.custom_styles[currentEditingStyle].type = type;
    } else {
        const id = 'custom_' + currentEditingStyle + '_' + Date.now();
        if (!state.settings.custom_styles) state.settings.custom_styles = {};
        state.settings.custom_styles[id] = { name: name + ' (Custom)', prompt: content, type: type };
        currentEditingStyle = id;
    }
    saveSettings();
    populateStyleList();
    jQuery(`.ec_style_item[data-id="${currentEditingStyle}"]`).addClass('active');
    if (typeof toastr !== 'undefined') toastr.success(`Style "${name}" saved!`);
}

function deleteStyleFromEditor() {
    if (!currentEditingStyle) return;
    const isCustom = state.settings.custom_styles && state.settings.custom_styles[currentEditingStyle];
    if (isCustom) {
        if (!confirm('Delete this custom style?')) return;
        delete state.settings.custom_styles[currentEditingStyle];
    } else {
        if (!confirm('Hide this built-in style?')) return;
        if (!state.settings.deleted_styles) state.settings.deleted_styles = [];
        state.settings.deleted_styles.push(currentEditingStyle);
    }
    saveSettings();
    currentEditingStyle = null;
    populateStyleList();
    showEmptyState();
}

function exportStyle(styleId) {
    if (!styleId) return;
    const content = jQuery('#ec_style_content').val();
    const name = jQuery('#ec_style_name').val() || styleId;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (typeof toastr !== 'undefined') toastr.success('Style exported!');
}

export function populateStyleList() {
    const list = jQuery('#ec_style_list');
    list.empty();
    const styles = getAllStyles();
    const { DOMPurify } = window.SillyTavern.libs;
    styles.forEach(style => {
        const isCustom = state.settings.custom_styles && state.settings.custom_styles[style.val];
        const icon = isCustom ? 'fa-user' : 'fa-cube';
        const item = jQuery(`<div class="ec_style_item ${isCustom ? 'custom' : 'builtin'}" data-id="${DOMPurify.sanitize(style.val)}" draggable="true"><span class="ec_drag_handle"><i class="fa-solid fa-grip-vertical"></i></span><i class="fa-solid ${icon} ec_style_type_icon"></i><span class="ec_style_label">${DOMPurify.sanitize(style.label)}</span></div>`);
        item.on('click', function (e) { if (!jQuery(e.target).closest('.ec_drag_handle').length) selectStyleInEditor(style.val); });
        list.append(item);
    });
    let dragSrc = null;
    list.find('.ec_style_item').each(function() {
        const el = this;
        el.addEventListener('dragstart', function(e) { dragSrc = el; el.classList.add('ec_dragging'); e.dataTransfer.setData('text/plain', el.dataset.id); });
        el.addEventListener('dragend', function() { el.classList.remove('ec_dragging'); saveStyleOrder(); updateAllDropdowns(); });
        el.addEventListener('dragover', function(e) { e.preventDefault(); if (el !== dragSrc) { list.find('.ec_style_item').removeClass('ec_drag_over'); el.classList.add('ec_drag_over'); } });
        el.addEventListener('drop', function(e) {
            e.preventDefault(); el.classList.remove('ec_drag_over');
            if (!dragSrc || dragSrc === el) return;
            const rect = el.getBoundingClientRect();
            if (e.clientY < (rect.top + rect.height / 2)) list[0].insertBefore(dragSrc, el);
            else list[0].insertBefore(dragSrc, el.nextSibling);
        });
    });
}

export async function selectStyleInEditor(styleId) {
    currentEditingStyle = styleId;
    jQuery('.ec_style_item').removeClass('active');
    jQuery(`.ec_style_item[data-id="${styleId}"]`).addClass('active');
    const prompt = await loadChatStyle(styleId);
    const styles = getAllStyles();
    const styleObj = styles.find(s => s.val === styleId);
    const isCustom = state.settings.custom_styles && state.settings.custom_styles[styleId];
    const { name1, characterName, name2 } = window.SillyTavern.getContext();
    const safeStyleName = (styleObj ? styleObj.label : styleId).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    const styleType = styleObj ? styleObj.type : 'chat stream';
    const typeOptions = [
        { val: 'chat stream', label: 'Chat Stream' },
        { val: 'assistant', label: 'Assistant' }
    ].map(t => `<option value="${t.val}"${styleType === t.val ? ' selected' : ''}>${t.label}</option>`).join('');

    jQuery('#ec_style_main').html(`
        <div class="ec_style_name_row">
            <input type="text" class="ec_style_name_input" id="ec_style_name" value="${safeStyleName}" placeholder="Style Name" ${!isCustom ? 'readonly' : ''}>
            <select id="ec_style_type" class="ec_style_type_select" ${!isCustom ? 'disabled' : ''}>
                ${typeOptions}
            </select>
        </div>
        <textarea class="ec_style_textarea" id="ec_style_content" placeholder="Enter the prompt..."></textarea>
        <div style="font-size:0.75em; opacity:0.65; margin-top:6px; padding:6px 8px; background:rgba(0,0,0,0.15); border-radius:4px; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <span>Macros:</span>
            <span><code>{{user}}</code> → ${name1||'User'}</span>
            <span><code>{{char}}</code> → ${characterName||name2||'Character'}</span>
        </div>
    `);
    jQuery('#ec_style_content').val(prompt);
    jQuery('#ec_style_save, #ec_style_export').show();
    jQuery('#ec_style_delete').toggle(!!isCustom);
}

function createNewStyle() {
    const name = prompt('Enter a name for the new style:');
    if (!name) return;
    const id = 'custom_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
    if (!state.settings.custom_styles) state.settings.custom_styles = {};
    state.settings.custom_styles[id] = {
        name: name,
        prompt: "Generate chat messages reacting to the context.\n\nformat:\nusername: message",
        type: 'chat stream'
    };
    saveSettings();
    populateStyleList();
    selectStyleInEditor(id);
}

function createStyleEditorModal() {
    if (jQuery('#ec_style_editor_modal').length) return;
    const modalHtml = `
    <div id="ec_style_editor_modal" class="ec_modal_overlay">
        <div class="ec_modal_content">
            <div class="ec_modal_header">
                <h3><i class="fa-solid fa-palette"></i> Style Editor</h3>
                <button class="ec_modal_close" id="ec_style_editor_close">&times;</button>
            </div>
            <div class="ec_modal_body">
                <div class="ec_style_sidebar">
                    <div class="ec_style_sidebar_header">
                        <button class="menu_button ec_btn_new_style" id="ec_style_new"><i class="fa-solid fa-plus"></i> New</button>
                    </div>
                    <div class="ec_style_list" id="ec_style_list"></div>
                </div>
                <div class="ec_style_main" id="ec_style_main"></div>
            </div>
            <div class="ec_modal_footer">
                <div class="ec_modal_footer_left">
                    <button class="menu_button ec_btn_danger" id="ec_style_delete" style="display:none;"><i class="fa-solid fa-trash"></i> Delete</button>
                    <button class="menu_button ec_btn_export" id="ec_style_export" style="display:none;"><i class="fa-solid fa-download"></i> Export</button>
                </div>
                <div class="ec_modal_footer_right">
                    <button class="menu_button ec_btn_cancel" id="ec_style_cancel">Cancel</button>
                    <button class="menu_button ec_btn_save" id="ec_style_save" style="display:none;">Save</button>
                </div>
            </div>
        </div>
    </div>`;
    jQuery('body').append(modalHtml);
    styleEditorModal = jQuery('#ec_style_editor_modal');
    jQuery('#ec_style_editor_close, #ec_style_cancel').on('click', closeStyleEditor);
    jQuery('#ec_style_new').on('click', createNewStyle);
    jQuery('#ec_style_save').on('click', saveStyleFromEditor);
    jQuery('#ec_style_delete').on('click', deleteStyleFromEditor);
    jQuery('#ec_style_export').on('click', () => exportStyle(currentEditingStyle));
    styleEditorModal.on('click', function (e) { if (e.target === this) closeStyleEditor(); });
}

export function openStyleEditor() {
    createStyleEditorModal();
    populateStyleList();
    currentEditingStyle = null;
    showEmptyState();
    jQuery('#ec_style_editor_modal').addClass('active');
}

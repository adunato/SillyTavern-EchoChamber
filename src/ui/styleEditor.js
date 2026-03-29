import { state } from '../constants.js';
import { log, warn } from '../utils/logger.js';
import { getAllStyles, loadChatStyle } from '../core/styles.js';
import { saveSettings } from '../state/settingsManager.js';
import { updateAllDropdowns } from './settings.js';

let currentEditingStyle = null;

export function populateStyleList() {
    const list = jQuery('#ec_style_list');
    list.empty();

    const styles = getAllStyles();
    const SillyTavern = window.SillyTavern;
    const { DOMPurify } = SillyTavern.libs;

    styles.forEach(style => {
        const isCustom = state.settings.custom_styles && state.settings.custom_styles[style.val];
        const typeClass = isCustom ? 'custom' : 'builtin';
        const icon = isCustom ? 'fa-user' : 'fa-cube';

        const safeLabel = DOMPurify.sanitize(style.label, { ALLOWED_TAGS: [] });
        const safeVal = DOMPurify.sanitize(style.val, { ALLOWED_TAGS: [] });

        const item = jQuery(`
            <div class="ec_style_item ${typeClass}" data-id="${safeVal}" draggable="true">
                <span class="ec_drag_handle" title="Drag to reorder"><i class="fa-solid fa-grip-vertical"></i></span>
                <i class="fa-solid ${icon} ec_style_type_icon"></i>
                <span class="ec_style_label">${safeLabel}</span>
            </div>
        `);

        item.on('click', function (e) {
            if (!jQuery(e.target).closest('.ec_drag_handle').length) {
                selectStyleInEditor(style.val);
            }
        });

        list.append(item);
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

    jQuery('#ec_style_main').html(`
        <div class="ec_editor_container">
            <div class="ec_editor_header">
                <input type="text" id="ec_edit_name" class="ec_edit_input" value="${styleObj ? styleObj.label : styleId}" ${isCustom ? '' : 'readonly'}>
                <div class="ec_style_badge">${isCustom ? 'Custom Style' : 'Built-in Style'}</div>
            </div>
            <div class="ec_editor_body">
                <label class="ec_editor_label">Prompt Template</label>
                <textarea id="ec_edit_prompt" class="ec_edit_textarea">${prompt}</textarea>
                <div class="ec_hint">Macros: {{char}}, {{user}}, {{persona}}, {{authorsNote}}, {{summary}}, {{worldInfo}}</div>
            </div>
        </div>
    `);

    jQuery('#ec_style_save').toggle(!!isCustom);
    jQuery('#ec_style_delete').toggle(!!isCustom);
    jQuery('#ec_style_export').show();
}

export function openStyleEditor() {
    // createStyleEditorModal(); // Needs implementation or stub
    populateStyleList();
    currentEditingStyle = null;
    // showEmptyState(); // Needs implementation or stub
    jQuery('#ec_style_editor_modal').addClass('active');
}

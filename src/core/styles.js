import { state, BASE_URL, STYLE_FILES, BUILT_IN_STYLES } from '../constants.js';
import { warn } from '../utils/logger.js';

const promptCache = {};

export function getAllStyles() {
    // Build a map of all available style id -> style object
    const styleMap = {};
    BUILT_IN_STYLES.forEach(s => { styleMap[s.val] = s; });
    if (state.settings.custom_styles) {
        Object.keys(state.settings.custom_styles).forEach(id => {
            styleMap[id] = { 
                val: id, 
                label: state.settings.custom_styles[id].name,
                type: state.settings.custom_styles[id].type || 'chat stream'
            };
        });
    }

    // Determine the order to use
    let order = state.settings.style_order;
    if (!order || !Array.isArray(order)) {
        order = BUILT_IN_STYLES.map(s => s.val);
        if (state.settings.custom_styles) {
            Object.keys(state.settings.custom_styles).forEach(id => {
                if (!order.includes(id)) order.push(id);
            });
        }
    }

    // Filter out deleted styles and map to objects
    const deleted = state.settings.deleted_styles || [];
    return order
        .filter(id => styleMap[id] && !deleted.includes(id))
        .map(id => styleMap[id]);
}

export async function loadChatStyle(style) {
    let prompt;
    if (state.settings.custom_styles && state.settings.custom_styles[style]) {
        prompt = state.settings.custom_styles[style].prompt;
    } else if (promptCache[style]) {
        prompt = promptCache[style];
    } else {
        const filename = STYLE_FILES[style] || 'discordtwitch.md';
        try {
            const response = await fetch(`${BASE_URL}/chat-styles/${filename}?v=${Date.now()}`);
            if (!response.ok) throw new Error('Fetch failed');
            prompt = await response.text();
            promptCache[style] = prompt; // cache raw text; macros resolved at call time
        } catch (e) {
            warn('Failed to load style:', style, e);
            prompt = `Generate chat messages. Output: username: message`;
        }
    }
    return prompt;
}

export function getPromptCache() {
    return promptCache;
}

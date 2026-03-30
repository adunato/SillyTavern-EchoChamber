export const MODULE_NAME = 'discord_chat';
export const EXTENSION_NAME = 'EchoChamber';

// Get BASE_URL from script tag
const scripts = document.querySelectorAll('script[src*="index.js"]');
let baseUrl = '';
for (const script of scripts) {
    if (script.src.includes('EchoChamber') || script.src.includes('DiscordChat')) {
        baseUrl = script.src.split('/').slice(0, -1).join('/');
        break;
    }
}
export const BASE_URL = baseUrl;

export const STYLE_FILES = {
    'twitch': 'discordtwitch.md', 'verbose': 'thoughtfulverbose.md', 'twitter': 'twitterx.md', 'news': 'breakingnews.md',
    'mst3k': 'mst3k.md', 'nsfw_ava': 'nsfwava.md', 'nsfw_kai': 'nsfwkai.md', 'hypebot': 'hypebot.md',
    'doomscrollers': 'doomscrollers.md', 'darkroast': 'darkroast.md', 'dumbanddumber': 'dumbanddumber.md', 'ao3wattpad': 'ao3wattpad.md'
};

export const BUILT_IN_STYLES = [
    { val: 'twitch', label: 'Discord / Twitch', type: 'chat stream' }, { val: 'verbose', label: 'Thoughtful', type: 'chat stream' },
    { val: 'twitter', label: 'Twitter / X', type: 'chat stream' }, { val: 'news', label: 'Breaking News', type: 'chat stream' },
    { val: 'mst3k', label: 'MST3K', type: 'chat stream' }, { val: 'nsfw_ava', label: 'Ava NSFW', type: 'chat stream' },
    { val: 'nsfw_kai', label: 'Kai NSFW', type: 'chat stream' }, { val: 'hypebot', label: 'HypeBot', type: 'chat stream' },
    { val: 'doomscrollers', label: 'Doomscrollers', type: 'chat stream' }, { val: 'darkroast', label: 'Dark Roast', type: 'chat stream' },
    { val: 'dumbanddumber', label: 'Dumb and Dumber', type: 'chat stream' }, { val: 'ao3wattpad', label: 'AO3 / Wattpad', type: 'chat stream' }
];

export const defaultSettings = {
    enabled: true,
    paused: false,
    source: 'default',
    preset: '',
    url: 'http://localhost:11434',
    model: '',
    openai_url: 'http://localhost:1234/v1',
    openai_key: '',
    openai_model: 'local-model',
    openai_preset: 'custom',
    userCount: 5,
    fontSize: 15,
    chatHeight: 250,
    style: 'twitch',
    position: 'bottom',
    panelWidth: 350,
    opacity: 85,
    collapsed: false,
    autoUpdateOnMessages: true,
    includeUserInput: false,
    contextDepth: 4,
    includePastEchoChambers: false,
    includePersona: false,
    includeAuthorsNote: false,
    includeCharacterDescription: false,
    includeSummary: false,
    includeWorldInfo: false,
    wiBudget: 0,
    livestream: false,
    livestreamBatchSize: 20,
    livestreamMode: 'manual',
    livestreamMinWait: 5,
    livestreamMaxWait: 60,
    custom_styles: {},
    deleted_styles: [],
    style_order: null,
    chatEnabled: true,
    chatUsername: 'Streamer (You)',
    chatAvatarColor: '#3b82f6',
    chatReplyCount: 3,
    floatLeft: null,
    floatTop: null,
    floatWidth: null,
    floatHeight: null,
    systemPromptChatStream: `<role>\nYou are an excellent creator of fake chat feeds that react dynamically to the user's conversation context.\n</role>\n\n{{lore}}\n\n<chat_history>\n{{chat_history}}\n</chat_history>\n\n{{recent_echochamber_history}}\n\n{{streamer_reply}}\n\n<instructions>\n{{count_instruction}}\n{{style_instructions}}\n</instructions>\n\n<task>\nBased on the chat history above, generate fake chat feed reactions. Remember to think about them step-by-step first. STRICTLY follow the format defined in the instruction. {{count_instruction_short}} Do NOT continue the story or roleplay as the characters. Do NOT output preamble. Just output the content directly.\n</task>`,
    systemPromptAssistant: `<role>\nYou are a direct assistant to the user. Answer questions and provide information based on the context.\n</role>\n\n{{lore}}\n\n<chat_history>\n{{chat_history}}\n</chat_history>\n\n{{recent_echochamber_history}}\n\n<instructions>\n{{style_instructions}}\n</instructions>\n\n<task>\nProvide a helpful response to the user's latest message.\n</task>`
};

export const state = {
    settings: JSON.parse(JSON.stringify(defaultSettings)),
    discordBar: null,
    discordContent: null,
    discordQuickBar: null,
    abortController: null,
    generateTimeout: null,
    debounceTimeout: null,
    eventsBound: false,
    userCancelled: false,
    isLoadingChat: false,
    isGenerating: false,
    livestreamQueue: [],
    livestreamTimer: null,
    livestreamActive: false,
    floatingPanelOpen: false,
    popoutDiscordContent: null,
};

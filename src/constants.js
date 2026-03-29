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
    { val: 'twitch', label: 'Discord / Twitch' }, { val: 'verbose', label: 'Thoughtful' },
    { val: 'twitter', label: 'Twitter / X' }, { val: 'news', label: 'Breaking News' },
    { val: 'mst3k', label: 'MST3K' }, { val: 'nsfw_ava', label: 'Ava NSFW' },
    { val: 'nsfw_kai', label: 'Kai NSFW' }, { val: 'hypebot', label: 'HypeBot' },
    { val: 'doomscrollers', label: 'Doomscrollers' }, { val: 'darkroast', label: 'Dark Roast' },
    { val: 'dumbanddumber', label: 'Dumb and Dumber' }, { val: 'ao3wattpad', label: 'AO3 / Wattpad' }
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

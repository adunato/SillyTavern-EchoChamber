import { state, MODULE_NAME } from '../constants.js';
import { log, warn, error } from '../utils/logger.js';
import { cleanMessage, getActiveCharacters, resolveSTMacro, formatMessage } from '../utils/helpers.js';
import { getChatMetadata, saveChatMetadata, startLivestream, pauseLivestream, resumeLivestream } from '../state/chatState.js';
import { loadChatStyle } from './styles.js';
import { extractTextFromResponse } from './api.js';
import { setStatus, setDiscordText, updateReplyButtonState, updateLiveIndicator } from '../ui/panel.js';

let isReplying = false;

/**
 * Core generation function
 */
export async function generateDiscordChat(showOverlay = false) {
...
}

/**
 * Generates a targeted single reply to a user message
 */
export async function generateSingleReply(replyText, targetUsername) {
    if (isReplying) return;
    isReplying = true;

    const wasLivestreaming = state.settings.livestream && state.livestreamActive;
    if (wasLivestreaming) pauseLivestream();

    const SillyTavern = window.SillyTavern;
    const context = SillyTavern.getContext();
    const chat = context.chat;
    if (!chat || chat.length === 0) { isReplying = false; if (wasLivestreaming) resumeLivestream(); return; }

    const historyMessages = state.settings.includeUserInput ? chat.filter(msg => !msg.is_system).slice(-state.settings.contextDepth || -4) : chat.filter(msg => !msg.is_system).slice(-1);

    const ecMessages = [];
    jQuery('#discordContent .discord_message').slice(0, 8).each(function () {
        const uname = jQuery(this).find('.discord_username').first().text().trim();
        const content = jQuery(this).find('.discord_content').first().text().trim();
        if (uname && content) ecMessages.push(`${uname}: ${content}`);
    });
    const ecHistory = ecMessages.reverse().join('\n');

    const stylePrompt = await loadChatStyle(state.settings.style || 'twitch');
    const chatUsername = state.settings.chatUsername || 'Streamer (You)';
    const replyCount = Math.max(1, Math.min(12, state.settings.chatReplyCount || 3));
    const baseMaxTok = targetUsername ? 200 : Math.max(200, replyCount * 80);
    const maxTok = state.settings.chatOverrideTokens ? (state.settings.chatMaxTokens || 3000) : baseMaxTok;

    const systemContextParts = [];
    if (state.settings.includePersona) {
        const personaText = resolveSTMacro(context, '{{persona}}');
        if (personaText.trim()) systemContextParts.push(`<user_persona name="${context.name1 || 'User'}">\n${personaText}\n</user_persona>`);
    }
    if (state.settings.includeAuthorsNote) {
        const anText = resolveSTMacro(context, '{{authorsNote}}');
        if (anText.trim()) systemContextParts.push(`<authors_note>\n${anText}\n</authors_note>`);
    }
    
    const additionalSystemContext = systemContextParts.length > 0 ? '\n\n<lore>\n' + systemContextParts.join('\n\n') + '\n</lore>' : '';
    
    const systemMessage = `<role>You are an excellent creator of fake chat feed reactions.</role>${additionalSystemContext}\n\n<chat_history>`;
    
    let targetInstruction = targetUsername ? `IMPORTANT: You MUST generate a direct reply from the user "${targetUsername}" back to the streamer.` : `IMPORTANT: You MUST generate EXACTLY ${replyCount} chat messages reacting to the streamer.`;
    
    const instructionsPrompt = `</chat_history>\n\n<streamer_reply>\nStreamer: "${replyText}"\n</streamer_reply>\n\n<recent_echochamber_history>\n${ecHistory}\n</recent_echochamber_history>\n\n<instructions>\n${targetInstruction}\n${stylePrompt}\n</instructions>\n\n<task>\nGenerate fake chat reactions to the streamer's message. Output ONLY the chat feed. No preamble.\n</task>`;

    const chatHistoryMessages = historyMessages.map(msg => ({
        role: msg.is_user ? 'user' : 'assistant',
        content: cleanMessage(msg.mes)
    }));

    const messages = [
        { role: 'system', content: systemMessage },
        ...chatHistoryMessages,
        { role: 'user', content: instructionsPrompt }
    ];

    try {
        let result = '';
        const source = state.settings.source || 'default';

        if (source === 'profile' && state.settings.preset) {
            const response = await context.ConnectionManagerRequestService.sendRequest(
                context.extensionSettings?.connectionManager?.profiles?.find(p => p.name === state.settings.preset)?.id, 
                messages, maxTok, { stream: false, extractData: true, includePreset: true, includeInstruct: true }
            );
            result = extractTextFromResponse(response);
        } else if (source === 'ollama') {
            const response = await fetch(`${state.settings.url.replace(/\/$/, '')}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model: state.settings.model, messages: messages, stream: false, options: { num_predict: maxTok } })
            });
            const data = await response.json();
            result = data.message?.content || data.response || '';
        } else if (source === 'openai') {
            const response = await fetch(`${state.settings.openai_url.replace(/\/$/, '')}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(state.settings.openai_key ? { 'Authorization': `Bearer ${state.settings.openai_key}` } : {}) },
                body: JSON.stringify({ model: state.settings.openai_model || 'local-model', messages: messages, max_tokens: maxTok, stream: false })
            });
            const data = await response.json();
            result = extractTextFromResponse(data);
        } else if (context.generateRaw) {
            result = await context.generateRaw({ prompt: messages, quietToLoud: false });
        }

        let cleanResult = result.replace(/<(thinking|think|thought|reasoning|reason)>[\s\S]*?<\/\1>/gi, '').replace(/<\/?discordchat>/gi, '').trim();
        const lines = cleanResult.split('\n');
        const container = jQuery('#discordContent .discord_container');
        
        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;
            const match = trimmed.match(/^(?:[\d\.\-\*]*\s*)?(.+?):\s*(.+)$/);
            if (match) {
                const html = formatMessage(match[1].trim().replace(/[\*_\"`]/g, ''), match[2].trim());
                if (container.length) container.prepend(html);
            }
        });

        const meta = getChatMetadata() || {};
        meta.generatedHtml = jQuery('#discordContent').html();
        saveChatMetadata(meta);

    } catch (err) {
        error('Reply generation error:', err);
    } finally {
        isReplying = false;
        if (wasLivestreaming) resumeLivestream();
    }
}

import { state, MODULE_NAME } from '../constants.js';
import { log, warn, error } from '../utils/logger.js';
import { cleanMessage, getActiveCharacters, resolveSTMacro, formatMessage } from '../utils/helpers.js';
import { getChatMetadata, saveChatMetadata, startLivestream, pauseLivestream, resumeLivestream, stopLivestream, parseLivestreamMessages } from '../state/chatState.js';
import { loadChatStyle } from './styles.js';
import { extractTextFromResponse } from './api.js';
import { setStatus, setDiscordText, updateReplyButtonState, updateLiveIndicator } from '../ui/panel.js';

let isReplying = false;

/**
 * Cancels any in-progress generation
 */
export function cancelGenerationContext() {
    log('Cancel generation triggered');
    if (state.debounceTimeout) {
        clearTimeout(state.debounceTimeout);
        state.debounceTimeout = null;
    }
    if (state.abortController) {
        log('Aborting generation...');
        state.userCancelled = true;
        jQuery('#ec_cancel_btn').html('<i class="fa-solid fa-hourglass"></i> Stopping...').css('pointer-events', 'none');
        jQuery('.ec_reply_stop').html('<i class="fa-solid fa-hourglass"></i>');
        state.abortController.abort();
        
        // Also trigger SillyTavern's built-in stop generation
        const stopButton = jQuery('#mes_stop');
        if (stopButton.length && !stopButton.is('.disabled')) {
            log('Triggering SillyTavern stop button');
            stopButton.trigger('click');
        }
    }
}

/**
 * Core generation function
 */
export async function generateDiscordChat(showOverlay = false) {
    if (!state.settings.enabled) {
        if (state.discordBar) jQuery(state.discordBar).hide();
        return;
    }

    if (state.settings.paused) return;

    // If already generating, abort the previous request first
    if (state.isGenerating && state.abortController) {
        state.abortController.abort();
        // Wait a tiny bit for the abort to process
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (state.discordBar) jQuery(state.discordBar).show();

    const SillyTavern = window.SillyTavern;
    const context = SillyTavern.getContext();
    const chat = context.chat;
    if (!chat || chat.length === 0) return;

    // Mark generation as in progress
    state.isGenerating = true;
    updateReplyButtonState(true);

    // Create new AbortController BEFORE setting up the Cancel button
    state.userCancelled = false;
    state.abortController = new AbortController();

    if (state.settings.livestream && !showOverlay) {
        updateLiveIndicator('loading');
    } else {
        setStatus(`
            <span><i class="fa-solid fa-circle-notch fa-spin"></i> Processing...</span>
            <div class="ec_status_btn" id="ec_cancel_btn" title="Cancel Generation">
                 <i class="fa-solid fa-ban"></i> Cancel
            </div>
        `);
    }

    // Context history building
    let historyMessages;
    if (state.settings.includeUserInput) {
        const depth = Math.max(2, Math.min(500, state.settings.contextDepth || 4));
        const visibleChat = chat.filter(msg => !msg.is_system);
        let startIdx = visibleChat.length - 1;
        for (let i = visibleChat.length - 1; i >= 0 && (visibleChat.length - i) <= depth; i--) {
            startIdx = i;
        }
        for (let i = startIdx; i >= 0; i--) {
            if (visibleChat[i].is_user) {
                startIdx = i;
                break;
            }
        }
        historyMessages = visibleChat.slice(startIdx);
        if (historyMessages.length > depth) {
            historyMessages = historyMessages.slice(-depth);
        }
    } else {
        const visibleChat = chat.filter(msg => !msg.is_system);
        historyMessages = visibleChat.slice(-1);
    }

    const metadata = getChatMetadata();
    const messageCommentaries = (metadata && metadata.messageCommentaries) || {};
    const isNarratorStyle = ['nsfw_ava', 'nsfw_kai', 'hypebot'].includes(state.settings.style);

    let actualUserCount;
    let messageCount;

    if (state.settings.livestream && !showOverlay) {
        if (isNarratorStyle) {
            actualUserCount = 1;
            messageCount = Math.max(5, Math.min(50, parseInt(state.settings.livestreamBatchSize) || 20));
        } else {
            actualUserCount = Math.max(1, Math.min(20, parseInt(state.settings.userCount) || 5));
            messageCount = Math.max(5, Math.min(50, parseInt(state.settings.livestreamBatchSize) || 20));
        }
    } else {
        actualUserCount = isNarratorStyle ? 1 : (parseInt(state.settings.userCount) || 5);
        messageCount = actualUserCount;
    }

    const userCount = Math.max(1, Math.min(50, messageCount));
    const stylePrompt = await loadChatStyle(state.settings.style || 'twitch');

    // Build additional context for system message
    const systemContextParts = [];
    if (state.settings.includePersona) {
        const personaName = context.name1 || 'User';
        const personaText = resolveSTMacro(context, '{{persona}}');
        if (personaText.trim()) {
            systemContextParts.push(`<user_persona name="${personaName}">\n${personaText}\n</user_persona>`);
        }
    }
    if (state.settings.includeAuthorsNote) {
        const anText = resolveSTMacro(context, '{{authorsNote}}');
        if (anText.trim()) {
            systemContextParts.push(`<authors_note>\n${anText}\n</authors_note>`);
        }
    }
    if (state.settings.includeCharacterDescription) {
        const activeCharacters = getActiveCharacters();
        if (activeCharacters.length > 0) {
            const charDescriptions = activeCharacters
                .filter(char => char.description)
                .map(char => `<character name="${char.name}">\n${char.description}\n</character>`)
                .join('\n\n');
            if (charDescriptions) {
                systemContextParts.push(charDescriptions);
            }
        }
    }
    if (state.settings.includeSummary) {
        try {
            if (typeof window.SceneSummariser !== 'undefined' && typeof window.SceneSummariser.getCurrentSummary === 'function') {
                const summary = window.SceneSummariser.getCurrentSummary();
                if (summary) {
                    systemContextParts.push(`<summary>\n${summary}\n</summary>`);
                    log('Added summary from Scene Summariser API');
                }
            } else {
                const memorySettings = context.extensionSettings?.memory;
                if (memorySettings) {
                    const chatWithSummary = context.chat?.slice().reverse().find(m => m.extra?.memory);
                    if (chatWithSummary?.extra?.memory) {
                        systemContextParts.push(`<summary>\n${chatWithSummary.extra.memory}\n</summary>`);
                    }
                }
            }
        } catch (e) { log('Could not get summary:', e); }
    }
    if (state.settings.includeWorldInfo) {
        try {
            const getWorldInfoFn = context.getWorldInfoPrompt || window.getWorldInfoPrompt;
            if (typeof getWorldInfoFn === 'function' && chat.length > 0) {
                const chatForWI = chat.map(x => x.mes || x.message || x).filter(m => m && typeof m === 'string');
                const wiBudgetValue = (state.settings.wiBudget && state.settings.wiBudget > 0) ? state.settings.wiBudget : Number.MAX_SAFE_INTEGER;
                const result = await getWorldInfoFn(chatForWI, wiBudgetValue, false);
                const worldInfoString = result?.worldInfoString || result;
                if (worldInfoString && typeof worldInfoString === 'string' && worldInfoString.trim()) {
                    systemContextParts.push(`<world_info>\n${worldInfoString.trim()}\n</world_info>`);
                }
            }
        } catch (e) { log('Error getting world info:', e); }
    }

    const additionalSystemContext = systemContextParts.length > 0 ? '\n\n<lore>\n' + systemContextParts.join('\n\n') + '\n</lore>' : '';
    const systemMessage = `<role>\nYou are an excellent creator of fake chat feeds that react dynamically to the user's conversation context.\n</role>${additionalSystemContext}\n\n<chat_history>`;

    log('Generated System Message:', systemMessage);

    let countInstruction = '';
    if (isNarratorStyle && state.settings.livestream && !showOverlay) {
        countInstruction = `IMPORTANT: You MUST generate EXACTLY ${messageCount} messages. Not fewer, not more - exactly ${messageCount} messages from the same narrator/character.\n\n`;
    } else if (!isNarratorStyle) {
        if (state.settings.livestream && !showOverlay) {
            countInstruction = `IMPORTANT: You MUST generate EXACTLY ${messageCount} chat messages from EXACTLY ${actualUserCount} different users. Each user can post multiple messages. Not fewer, not more - exactly ${messageCount} messages from ${actualUserCount} users.\n\n`;
        } else {
            countInstruction = `IMPORTANT: You MUST generate EXACTLY ${userCount} chat messages. Not fewer, not more - exactly ${userCount}.\n\n`;
        }
    }

    const chatHistoryMessages = [];
    if (state.settings.includePastEchoChambers && metadata && metadata.messageCommentaries) {
        for (const msg of historyMessages) {
            const msgIndex = chat.indexOf(msg);
            const role = msg.is_user ? 'user' : 'assistant';
            let content = cleanMessage(msg.mes);
            if (messageCommentaries[msgIndex]) {
                content += `\n\n[Previous EchoChamber commentary: ${messageCommentaries[msgIndex]}]`;
            }
            chatHistoryMessages.push({ role, content });
        }
    } else {
        for (const msg of historyMessages) {
            const role = msg.is_user ? 'user' : 'assistant';
            const content = cleanMessage(msg.mes);
            chatHistoryMessages.push({ role, content });
        }
    }

    let userReplyContext = "";
    if (window.lastEchoReply) {
        userReplyContext = `\n\n<streamer_reply>\nIMPORTANT: The streamer (the user who controls this character) has just directly replied to the chat: "${window.lastEchoReply}". The chat reactions you generate MUST acknowledge and react to this reply. Some chatters should respond directly to the streamer's message.\n</streamer_reply>`;
        window.lastEchoReply = null;
    }

    const instructionsPrompt = `</chat_history>${userReplyContext}\n\n<instructions>\n${countInstruction}${stylePrompt}\n</instructions>\n\n<task>\nBased on the chat history above, generate fake chat feed reactions. Remember to think about them step-by-step first. STRICTLY follow the format defined in the instruction. ${isNarratorStyle && state.settings.livestream && !showOverlay ? `Output exactly ${messageCount} messages.` : isNarratorStyle ? '' : state.settings.livestream && !showOverlay ? `Output exactly ${messageCount} messages from ${actualUserCount} users.` : `Output exactly ${userCount} messages.`} Do NOT continue the story or roleplay as the characters. Do NOT output preamble. Just output the content directly.\n</task>`;

    const messages = [
        { role: 'system', content: systemMessage },
        ...chatHistoryMessages,
        { role: 'user', content: instructionsPrompt }
    ];

    const calculatedMaxTokens = Math.max(2048, userCount * 200 + 1024);

    try {
        let result = '';
        const source = state.settings.source || 'default';

        if (source === 'profile' && state.settings.preset) {
            const cm = context.extensionSettings?.connectionManager;
            const profile = cm?.profiles?.find(p => p.name === state.settings.preset);
            if (!profile) throw new Error(`Profile '${state.settings.preset}' not found`);
            
            const response = await context.ConnectionManagerRequestService.sendRequest(
                profile.id, messages, calculatedMaxTokens, 
                { stream: false, signal: state.abortController.signal, extractData: true, includePreset: true, includeInstruct: true }
            );
            result = extractTextFromResponse(response);
        } else if (source === 'ollama') {
            const response = await fetch(`${state.settings.url.replace(/\/$/, '')}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: state.settings.model,
                    messages: messages,
                    stream: false,
                    options: { num_ctx: context.main?.context_size || 4096, num_predict: calculatedMaxTokens }
                }),
                signal: state.abortController.signal
            });
            if (!response.ok) throw new Error(`Ollama API Error(${response.status})`);
            const data = await response.json();
            result = data.message?.content || data.response || '';
        } else if (source === 'openai') {
            const response = await fetch(`${state.settings.openai_url.replace(/\/$/, '')}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(state.settings.openai_key ? { 'Authorization': `Bearer ${state.settings.openai_key}` } : {})
                },
                body: JSON.stringify({
                    model: state.settings.openai_model || 'local-model',
                    messages: messages,
                    max_tokens: calculatedMaxTokens,
                    stream: false
                }),
                signal: state.abortController.signal
            });
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            const data = await response.json();
            result = extractTextFromResponse(data);
        } else {
            if (context.generateRaw) {
                result = await context.generateRaw({ prompt: messages, quietToLoud: false });
            }
        }

        if (state.abortController.signal.aborted || state.userCancelled) throw new Error('Generation cancelled');

        let cleanResult = result.replace(/<(thinking|think|thought|reasoning|reason)>[\s\S]*?<\/\1>/gi, '').replace(/<\/?discordchat>/gi, '').trim();
        const parsedMessages = [];
        cleanResult.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (!trimmed || /^[\.\…\-\_]+$/.test(trimmed)) return;
            const match = trimmed.match(/^(?:[\d\.\-\*]*\s*)?(.+?):\s*(.+)$/);
            if (match) {
                parsedMessages.push({ name: match[1].trim().replace(/[\*_\"`]/g, '').substring(0, 40), content: match[2].trim() });
            } else if (parsedMessages.length > 0) {
                parsedMessages[parsedMessages.length - 1].content += ' ' + trimmed;
            } else {
                parsedMessages.push({ name: 'User', content: trimmed });
            }
        });

        let htmlBuffer = '<div class="discord_container" style="padding-top: 10px;">';
        let displayedCount = 0;
        for (const msg of parsedMessages) {
            if (displayedCount >= userCount) break;
            if (msg.content.trim().length < 2) continue;
            htmlBuffer += formatMessage(msg.name, msg.content.trim());
            displayedCount++;
        }
        htmlBuffer += '</div>';
        setStatus('');

        if (displayedCount === 0) {
            setDiscordText('<div class="discord_status">No valid chat lines generated.</div>');
        } else {
            if (state.settings.livestream && !showOverlay) {
                const messages = parseLivestreamMessages(htmlBuffer);
                const lastMsgIndex = chat.length - 1;
                const updatedCommentaries = { ...(messageCommentaries || {}) };
                updatedCommentaries[lastMsgIndex] = cleanResult;
                saveChatMetadata({ ...metadata, generatedHtml: htmlBuffer, messageCommentaries: updatedCommentaries, livestreamComplete: false });
                startLivestream(messages);
                updateLiveIndicator();
            } else {
                if (state.settings.livestream) stopLivestream();
                setDiscordText(htmlBuffer);
                const lastMsgIndex = chat.length - 1;
                const updatedCommentaries = { ...(messageCommentaries || {}) };
                updatedCommentaries[lastMsgIndex] = cleanResult;
                saveChatMetadata({ ...metadata, generatedHtml: htmlBuffer, messageCommentaries: updatedCommentaries });
            }
        }

        state.isGenerating = false;
        updateReplyButtonState(false);

    } catch (err) {
        state.isGenerating = false;
        updateReplyButtonState(false);
        if (!state.settings.livestream || showOverlay) setStatus('');
        if (state.settings.livestream && !showOverlay) updateLiveIndicator();
        if (err.name !== 'AbortError' && !state.userCancelled) error('Generation failed:', err);
    }
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

    const depth = Math.max(2, Math.min(500, state.settings.contextDepth || 4));
    const historyMessages = state.settings.includeUserInput ? chat.filter(msg => !msg.is_system).slice(-depth) : chat.filter(msg => !msg.is_system).slice(-1);

    const ecMessages = [];
    jQuery('#discordContent .discord_message').slice(0, 8).each(function () {
        const uname = jQuery(this).find('.discord_username').first().text().trim();
        const content = jQuery(this).find('.discord_content').first().text().trim();
        if (uname && content) ecMessages.push(`${uname}: ${content}`);
    });
    const ecHistory = ecMessages.reverse().join('\n');

    const stylePrompt = await loadChatStyle(state.settings.style || 'twitch');
    const replyCount = Math.max(1, Math.min(12, state.settings.chatReplyCount || 3));
    const maxTok = state.settings.chatOverrideTokens ? (state.settings.chatMaxTokens || 3000) : (targetUsername ? 200 : Math.max(200, replyCount * 80));

    const systemContextParts = [];
    if (state.settings.includePersona) {
        const personaText = resolveSTMacro(context, '{{persona}}');
        if (personaText.trim()) systemContextParts.push(`<user_persona name="${context.name1 || 'User'}">\n${personaText}\n</user_persona>`);
    }
    if (state.settings.includeAuthorsNote) {
        const anText = resolveSTMacro(context, '{{authorsNote}}');
        if (anText.trim()) systemContextParts.push(`<authors_note>\n${anText}\n</authors_note>`);
    }
    if (state.settings.includeCharacterDescription) {
        const activeCharacters = getActiveCharacters();
        if (activeCharacters.length > 0) {
            const charDescriptions = activeCharacters
                .filter(char => char.description)
                .map(char => `<character name="${char.name}">\n${char.description}\n</character>`)
                .join('\n\n');
            if (charDescriptions) {
                systemContextParts.push(charDescriptions);
            }
        }
    }
    if (state.settings.includeSummary) {
        try {
            if (typeof window.SceneSummariser !== 'undefined' && typeof window.SceneSummariser.getCurrentSummary === 'function') {
                const summary = window.SceneSummariser.getCurrentSummary();
                if (summary) {
                    systemContextParts.push(`<summary>\n${summary}\n</summary>`);
                    log('Added summary from Scene Summariser API (Single Reply)');
                }
            } else {
                const chatWithSummary = context.chat?.slice().reverse().find(m => m.extra?.memory);
                if (chatWithSummary?.extra?.memory) {
                    systemContextParts.push(`<summary>\n${chatWithSummary.extra.memory}\n</summary>`);
                }
            }
        } catch (e) { log('Could not get summary:', e); }
    }
    if (state.settings.includeWorldInfo) {
        try {
            const getWorldInfoFn = context.getWorldInfoPrompt || window.getWorldInfoPrompt;
            if (typeof getWorldInfoFn === 'function' && chat.length > 0) {
                const chatForWI = chat.map(x => x.mes || x.message || x).filter(m => m && typeof m === 'string');
                const wiBudgetValue = (state.settings.wiBudget && state.settings.wiBudget > 0) ? state.settings.wiBudget : Number.MAX_SAFE_INTEGER;
                const result = await getWorldInfoFn(chatForWI, wiBudgetValue, false);
                const worldInfoString = result?.worldInfoString || result;
                if (worldInfoString && typeof worldInfoString === 'string' && worldInfoString.trim()) {
                    systemContextParts.push(`<world_info>\n${worldInfoString.trim()}\n</world_info>`);
                }
            }
        } catch (e) { log('Error getting world info:', e); }
    }

    const additionalSystemContext = systemContextParts.length > 0 ? '\n\n<lore>\n' + systemContextParts.join('\n\n') + '\n</lore>' : '';

    const systemMessage = `<role>\nYou are an excellent creator of fake chat feed reactions.\n</role>${additionalSystemContext}\n\n<chat_history>`;
    
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
            const profileId = context.extensionSettings?.connectionManager?.profiles?.find(p => p.name === state.settings.preset)?.id;
            const response = await context.ConnectionManagerRequestService.sendRequest(profileId, messages, maxTok, { stream: false, extractData: true, includePreset: true, includeInstruct: true });
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
        const container = jQuery('#discordContent .discord_container');
        
        cleanResult.split('\n').forEach(line => {
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

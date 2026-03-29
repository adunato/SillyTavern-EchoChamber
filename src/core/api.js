import { state } from '../constants.js';
import { log, error } from '../utils/logger.js';

/**
 * Extract text content from various API response formats
 */
export function extractTextFromResponse(response) {
    if (!response) return '';

    // 1. Response is already a plain string
    if (typeof response === 'string') return response;

    // 2. Response itself is an array of content blocks
    if (Array.isArray(response)) {
        const textParts = response
            .filter(block => block && block.type === 'text' && typeof block.text === 'string')
            .map(block => block.text);
        if (textParts.length > 0) return textParts.join('\n');
        // Fallback: maybe it's an array of strings
        const stringParts = response.filter(item => typeof item === 'string');
        if (stringParts.length > 0) return stringParts.join('\n');
        return JSON.stringify(response);
    }

    // 3. response.content exists
    if (response.content !== undefined && response.content !== null) {
        // 3a. content is a string
        if (typeof response.content === 'string') return response.content;
        // 3b. content is an array of content blocks (Anthropic extended thinking format)
        if (Array.isArray(response.content)) {
            const textParts = response.content
                .filter(block => block && block.type === 'text' && typeof block.text === 'string')
                .map(block => block.text);
            if (textParts.length > 0) return textParts.join('\n');
        }
    }

    // 4. OpenAI choices format
    if (response.choices?.[0]?.message?.content) {
        const choiceContent = response.choices[0].message.content;
        if (typeof choiceContent === 'string') return choiceContent;
        if (Array.isArray(choiceContent)) {
            const textParts = choiceContent
                .filter(block => block && block.type === 'text' && typeof block.text === 'string')
                .map(block => block.text);
            if (textParts.length > 0) return textParts.join('\n');
        }
    }

    // 5. Other common fields
    if (typeof response.text === 'string') return response.text;
    if (typeof response.message === 'string') return response.message;
    if (response.message?.content && typeof response.message.content === 'string') return response.message.content;

    // 6. Last resort - stringify
    error('Could not extract text from response, stringifying:', response);
    return JSON.stringify(response);
}

/**
 * Handle API requests for different sources
 */
export async function sendApiRequest(source, payload, abortSignal) {
    // This logic will be moved from generateDiscordChat to make it modular
    // For now, it's a placeholder to be filled during generator.js refactor
}

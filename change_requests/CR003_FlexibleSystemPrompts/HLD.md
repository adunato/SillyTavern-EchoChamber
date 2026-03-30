# High Level Design (HLD) - Flexible System Prompts and Style Types (CR003)

## Problem Statement
Currently, the system prompt in EchoChamber is hardcoded in the generator logic. This limits users' ability to customize how the AI perceives its role and the context. Additionally, different styles might require fundamentally different base instructions (e.g., simulating a chat stream vs. acting as a direct assistant).

## Proposed Solution
1.  **Style Classification**: Introduce two types of styles: `'chat stream'` and `'assistant'`.
2.  **Configurable System Prompts**: Move the base system prompts from the code to the extension settings, allowing users to edit them.
3.  **Variable Support**: Support variables like `{{style_instructions}}` and `{{lore}}` within these system prompts.
4.  **Dual Mode Generation**: The generator will select the appropriate base prompt based on the selected style's type.

## Technical Details

### State and Constants Changes
-   Update `BUILT_IN_STYLES` in `src/constants.js` to include `type: 'chat stream'`.
-   Add `systemPromptChatStream` and `systemPromptAssistant` to `defaultSettings`.
-   Default `systemPromptChatStream`:
    ```
    <role>
    You are an excellent creator of fake chat feeds that react dynamically to the user's conversation context.
    </role>
    {{lore}}

    <chat_history>
    {{chat_history}}
    </chat_history>

    {{streamer_reply}}

    <instructions>
    {{count_instruction}}
    {{style_instructions}}
    </instructions>

    <task>
    Based on the chat history above, generate fake chat feed reactions. Remember to think about them step-by-step first. STRICTLY follow the format defined in the instruction. {{count_instruction_short}} Do NOT continue the story or roleplay as the characters. Do NOT output preamble. Just output the content directly.
    </task>
    ```
-   Default `systemPromptAssistant`:
    ```
    <role>
    You are a direct assistant to the user. Answer questions and provide information based on the context.
    </role>

    {{lore}}

    <chat_history>
    {{chat_history}}
    </chat_history>

    <instructions>
    {{style_instructions}}
    </instructions>

    <task>
    Provide a helpful response to the user's latest message.
    </task>
    ```

### UI Updates
-   **Settings Panel**: 
    -   Add two large textareas in the "Generation Engine" section for editing the two base prompts.
    -   Add a **"Reset" button** next to each textarea to quickly restore the default prompt from the extension source code.
-   **Style Editor**: Add a toggle/select for "Style Type" (Chat Stream / Assistant). This is primarily for custom styles.

### Generator Updates
-   Modify `generateDiscordChat` and `generateSingleReply` to:
    1.  Determine the type of the currently selected style.
    2.  Retrieve the corresponding system prompt from settings.
    3.  Replace variables:
        -   `{{lore}}` -> The generated `<lore>...</lore>` block.
        -   `{{style_instructions}}` -> The content loaded via `loadChatStyle`.
    4.  The `instructionsPrompt` will also need to be updated to be more flexible if possible, or we continue injecting it as is.

## Impact Analysis
-   **Flexibility**: Users can now fully customize the "meta" instructions.
-   **Compatibility**: Existing styles will default to 'chat stream', maintaining current behavior.
-   **Complexity**: Slightly increases the complexity of prompt building logic.

## Questions for the User
1.  What should be the default text for the `systemPromptAssistant`? **user**: I want it to be a direct assistant to the user, not a chat feed. It should be able to answer questions and provide information.
2.  In the current code, the `systemMessage` is followed by `chatHistoryMessages` and then `instructionsPrompt`. Should `{{style_instructions}}` be part of the `systemMessage` (at the top) or remain in the `instructionsPrompt` (at the bottom)? **user**: it should be an integrated prompt with variables including all the components of the prompt as variables. Not an appended series of data inputs.
3.  Are there other variables you'd like to see supported in the base prompts (e.g., `{{user}}`, `{{char}}`)? **user**: anything that is currrently hardcoded should be a variable.

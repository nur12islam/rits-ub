import { NewMessageEvent } from "telegram/events/index.js";
import { GeminiAPI } from "./geminiApi.js";

const gemini = new GeminiAPI();

export const geminiPlugin = {
    name: "Gemini AI",
    description: "Chat with the Gemini AI Workspace.",
    command: "oai",
    usage: ".oai [query]",
    category: "Tools",
    handler: async (event: NewMessageEvent) => {
        let text = event.message.text || "";
        const query = text.split(" ").slice(1).join(" ");
        
        const replyMessage = await event.message.getReplyMessage();
        let prompt = query;

        if (replyMessage && replyMessage.text) {
            prompt += "\n\n" + replyMessage.text;
        }
        
        if (!prompt.trim()) {
            await event.message.edit({ text: "Please provide a query." });
            return;
        }

        await event.message.edit({ text: "`Thinking (Gemini)...`" });

        try {
            await gemini.checkSetup();
            // Create a temporary session for the query (or reuse one based on chat ID in the future)
            const sessionId = await gemini.getOrCreateSession(event.chatId?.toString() || "default", "Telegram Chat");
            const response = await gemini.chat(sessionId, prompt);
            
            await event.message.edit({ text: `**Gemini AI:**\n\n${response}` });
        } catch (e: any) {
            await event.message.edit({ text: `**Gemini Error:** ${e.message}` });
        }
    }
};

export default [geminiPlugin];

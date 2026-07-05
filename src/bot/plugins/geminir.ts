import { NewMessageEvent } from "telegram/events/index.js";
import { GeminiAPI } from "./geminiApi.js";

const gemini = new GeminiAPI();

export const geminiResearchPlugin = {
    name: "Gemini Research",
    description: "Deep research a topic using Gemini Workspace.",
    command: "oair",
    usage: ".oair [query]",
    category: "Tools",
    handler: async (event: NewMessageEvent) => {
        let text = event.message.text || "";
        const query = text.split(" ").slice(1).join(" ");
        
        if (!query) {
            await event.message.edit({ text: "Please provide a topic to research." });
            return;
        }

        await event.message.edit({ text: "`Researching using Gemini...`" });

        try {
            await gemini.checkSetup();
            const sessionId = await gemini.getOrCreateSession(event.chatId?.toString() || "default", "Research Session");
            const response = await gemini.chat(sessionId, query, true, true);
            
            await event.message.edit({ 
                text: `**Gemini Research:**\n\n${response}`,
                linkPreview: false 
            });
        } catch (e: any) {
            await event.message.edit({ text: `**Research Error:** ${e.message}` });
        }
    }
};

export default [geminiResearchPlugin];

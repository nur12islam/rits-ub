import { NewMessageEvent } from "telegram/events/index.js";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const oaiPlugin = {
    name: "Odysseus AI",
    description: "AI interactions based on chat and images using Gemini API. Equivalent to Odysseus AI chat/image capability.",
    command: "oai",
    usage: ".oai [query] | .oai -i [query] (replying to image)",
    category: "Tools",
    handler: async (event: NewMessageEvent) => {
        let text = event.message.text || "";
        const args = text.split(" ").slice(1);
        
        let isImageCommand = false;
        let query = "";
        
        if (args[0] === "-i") {
            isImageCommand = true;
            query = args.slice(1).join(" ");
        } else {
            query = args.join(" ");
        }
        
        const replyMessage = await event.message.getReplyMessage();
        
        if (!query && !replyMessage) {
            await event.message.edit({ text: "Please provide a query or reply to a message/image." });
            return;
        }

        await event.message.edit({ text: "`Thinking...`" });

        try {
            let prompt = query;
            let inlineData: { mimeType: string, data: string } | undefined;

            if (replyMessage) {
                if (replyMessage.text) {
                    prompt += "\n\n" + replyMessage.text;
                }
                
                if (isImageCommand && (replyMessage.photo || (replyMessage.document && replyMessage.document.mimeType?.startsWith("image/")))) {
                    await event.message.edit({ text: "`Downloading image for AI...`" });
                    const buffer = await event.client?.downloadMedia(replyMessage, {});
                    if (buffer) {
                        const mimeType = replyMessage.photo ? "image/jpeg" : (replyMessage.document?.mimeType || "image/jpeg");
                        inlineData = {
                            mimeType: mimeType,
                            data: buffer.toString("base64")
                        };
                    }
                }
            }

            const modelName = inlineData ? "gemini-1.5-flash" : "gemini-1.5-pro";
            
            const contents: any[] = [];
            const parts: any[] = [];
            
            if (prompt.trim()) {
                parts.push({ text: prompt.trim() || "Analyze this image" });
            } else if (inlineData) {
                parts.push({ text: "Analyze this image" });
            }
            
            if (inlineData) {
                parts.push({ inlineData });
            }
            
            if (parts.length === 0) {
                 await event.message.edit({ text: "Nothing to ask." });
                 return;
            }

            const response = await ai.models.generateContent({
                model: modelName,
                contents: [{ role: "user", parts }],
            });

            const resultText = response.text || "No response generated.";
            
            await event.message.edit({ text: `**Odysseus AI:**\n\n${resultText}` });
        } catch (e: any) {
            await event.message.edit({ text: `**Odysseus Error:** ${e.message}` });
        }
    }
};

export default [oaiPlugin];

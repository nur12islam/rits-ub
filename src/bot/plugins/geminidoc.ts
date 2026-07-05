import { NewMessageEvent } from "telegram/events/index.js";
import { GeminiAPI } from "./geminiApi.js";
import fs from "fs";
import path from "path";
import os from "os";

const gemini = new GeminiAPI();

export const geminiDocPlugin = {
    name: "Gemini Document",
    description: "Generate a comprehensive document (Markdown, HTML, etc) via Gemini and upload it as a file.",
    command: "oaidoc",
    usage: ".oaidoc [query]",
    category: "Tools",
    handler: async (event: NewMessageEvent) => {
        let text = event.message.text || "";
        const query = text.split(" ").slice(1).join(" ");
        
        if (!query) {
            await event.message.edit({ text: "Please provide a topic for the document." });
            return;
        }

        await event.message.edit({ text: "`Generating comprehensive document with Gemini...`" });

        try {
            await gemini.checkSetup();
            const sessionId = await gemini.getOrCreateSession(event.chatId?.toString() || "default", "Document Session");
            
            const prompt = `You are an expert technical writer and document creator. Provide a highly detailed, comprehensive document in response to the following prompt. Format the output cleanly. The first line of your response MUST be the suggested filename (e.g., document.md, script.js, page.html), followed by a newline, and then the content of the file. Do NOT use markdown code blocks to wrap the entire file content, just output the raw content.\n\nPrompt: ${query}`;
            
            const response = await gemini.chat(sessionId, prompt, false, true);

            const lines = response.split('\n');
            let filename = lines[0].trim();
            
            filename = filename.replace(/[\*\#\`]/g, '').trim();
            if (!filename.includes('.')) {
                filename = "document.md";
            }
            
            const content = lines.slice(1).join('\n').trim();

            const tmpPath = path.join(os.tmpdir(), filename);
            fs.writeFileSync(tmpPath, content);

            await event.message.edit({ text: "`Uploading document...`" });
            
            await event.client?.sendMessage(event.message.chatId!, {
                file: tmpPath,
                message: `**Gemini Document Generator**\nQuery: ${query}`,
                forceDocument: true as any
            });

            await event.message.delete();
            fs.unlinkSync(tmpPath);
            
        } catch (e: any) {
            await event.message.edit({ text: `**Document Error:** ${e.message}` });
        }
    }
};

export default [geminiDocPlugin];
